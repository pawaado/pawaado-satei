/* PowerAd calculation Web Worker
 * Worker-only runtime. UI/rendering and legacy optimizer code intentionally live outside this file.
 */
self.window=self;
importScripts('./data.js?v=20261002-resistance-rules-1');

const D=window.PAWAADO_DATA;
const ACADEMY_MASTER=D.academyMaster||{academies:[]};
const BOOTRAIN_MASTER=(ACADEMY_MASTER.academies||[]).find(a=>a.name==='ブートレインアカデミー')||null;
const DUAL_MASTER=BOOTRAIN_MASTER?.dualAttack||null;
const DUAL_SKILL_INDEX=DUAL_MASTER?D.special.findIndex(s=>String(s[1])===String(DUAL_MASTER.skillName)):-1;
let workerDualEnabled=false;
let workerDualLevel=Number(DUAL_MASTER?.initialLevel||1);
let workerDualHint=0;

const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const mutualGroups=[
  ['生存本能','闘争本能'],
  ['柔軟な体','頑丈な体'],
  ['無心の構え','護身の構え'],
  ['力学の理解','魔法の理解']
];

const academy={value:''};
const job={value:''};
const basicValues={}; basicNames.forEach(n=>basicValues[n]=1);
const basicOwned={}; basicNames.forEach(n=>basicOwned[n]=false);
const basicHints={}; basicNames.forEach(n=>basicHints[n]=0);
const specialState=new Map();
const specialNameIndex=new Map();
const specialReqIndex=new Map();
D.special.forEach((s,i)=>{
  specialNameIndex.set(String(s[1]),i);
  if(s[2]) specialReqIndex.set(String(s[2]),i);
});

const EMPTY_ITEMS=[];
const EMPTY_BITS=0n;
const specialBitCache=[];
const bitsKeyCache=new Map([[EMPTY_BITS,'0']]);
const mutualMaskByIndex=[];

const SPECIAL_DISCOUNT=[0,.5,.6,.7,.8,.9];
const hpByLifeCache=new Map();
const rangeRowCache=new WeakMap();
const valueRowCache=new WeakMap();
const specialItemCache=new Map();

const MIXED_BRANCH_NORMAL=7;
const MIXED_MAX_STEPS=90;
let mixedBasicOptionCache=new Map();
let mixedHpDeltaCache=new Map();
let mixedSpecialTemplateCache=new Map();
let mixedLimitsCache=null;
let mixedHpDependentMetaCache=null;

function specialBit(i){
  if(specialBitCache[i]===undefined) specialBitCache[i]=(1n<<BigInt(i));
  return specialBitCache[i];
}

function specialItemsBits(items){
  let bits=EMPTY_BITS;
  if(!items||!items.length) return bits;
  for(const it of items){
    if(it && it.type==='special' && Number.isFinite(Number(it.idx))){
      bits |= specialBit(Number(it.idx));
    }
  }
  return bits;
}

function bitsKey(bits){
  const value=bits||EMPTY_BITS;
  const cached=bitsKeyCache.get(value);
  if(cached!==undefined) return cached;

  const converted=value.toString(36);
  bitsKeyCache.set(value,converted);
  return converted;
}

function initSpecialBitMeta(){
  mutualGroups.forEach(g=>{
    let mask=EMPTY_BITS;
    g.forEach(n=>{
      const i=specialNameIndex.get(String(n)) ?? -1;
      if(i>=0) mask|=specialBit(i);
    });
    g.forEach(n=>{
      const i=specialNameIndex.get(String(n)) ?? -1;
      if(i>=0) mutualMaskByIndex[i]=mask & ~specialBit(i);
    });
  });
}
initSpecialBitMeta();

function conflictBitsFor(bits){
  let mask=EMPTY_BITS;
  for(let i=0;i<D.special.length;i++){
    const bit=specialBit(i);
    if((bits & bit)!==EMPTY_BITS) mask |= (mutualMaskByIndex[i]||EMPTY_BITS);
  }
  return mask;
}

function academyRows(){return D.academies.filter(r=>r[0]===academy.value && r[1]===job.value)}

function limits(){const r=academyRows()[0]; const m={}; basicNames.forEach((n,i)=>m[n]=r?Number(r[i+2]):null); return m;}

function getSpecialState(i){
  const k=String(i);
  let st=specialState.get(k);
  if(st===undefined){
    st={hint:0,own:0};
    specialState.set(k,st);
  }
  return st;
}

function isUpperSpecial(i){return String(D.special[i][1]).endsWith('◎');}

function lowerIndex(i){const req=D.special[i]?.[2]; if(!req)return -1; return specialNameIndex.get(String(req)) ?? -1;}

function upperIndex(i){const name=D.special[i]?.[1]; return specialReqIndex.get(String(name)) ?? -1;}

function specialOwned(i){return getSpecialState(i).own===1;}

function specialHint(i){return Number(getSpecialState(i).hint||0);}

function jobScoreIndex(){if(['剣士','弓使い','重戦士','双剣士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}

function fixedAddIndex(){if(['剣士','弓使い','重戦士','双剣士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}

function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return fixed+hp*rate;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}

function initialLifeValue(){
  return Number(basicValues['生命力']||1);
}

function ownedHpDependentBreakdown(life){
  const baseHp=currentHpForLife(initialLifeValue());
  const finalHp=currentHpForLife(life);
  const rows=[];
  let total=0;

  for(let i=0;i<D.special.length;i++){
    if(!specialOwned(i)) continue;
    const skill=D.special[i];
    const rate=Number(skill?.[11]||0);
    if(!rate) continue;

    const before=skillScore(skill,baseHp);
    const after=skillScore(skill,finalHp);
    const delta=after-before;
    if(delta===0) continue;

    rows.push({
      name:String(skill[1]),
      before,
      after,
      delta
    });
    total=total+delta;
  }

  return {baseHp,finalHp,total,rows};
}

function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:(SPECIAL_DISCOUNT[hint]||0); return Math.floor(cost*(1-disc));}

function currentHpForLife(life){
  const key=Number(life)||0;
  const cached=hpByLifeCache.get(key);
  if(cached!==undefined) return cached;
  let hp=50;
  for(const r of D.hp){if(key>=Number(r[0])) hp=Number(r[1]);}
  hpByLifeCache.set(key,hp);
  return hp;
}

function parseRange(r){const m=String(r).match(/(\d+)→(\d+)/); return m?{a:Number(m[1]),b:Number(m[2])}:null;}

function tableFor(name){
  if(name==='生命力') return {cost:D.life,score:D.life};
  if(name==='パワー') return {cost:D.powerCost,score:['剣士','弓使い','重戦士','双剣士'].includes(job.value)?D.powerPhysicalScore:D.powerMagicScore};
  if(name==='魔力') return {cost:D.magicCost,score:['魔闘士','魔法使い','僧侶'].includes(job.value)?D.magicMagicScore:D.magicPhysicalScore};
  if(name==='器用さ') return {cost:D.dexCost,score:D.dexScore};
  if(name==='耐久力') return {cost:D.staminaCost,score:D.staminaScore};
  if(name==='精神力') return {cost:D.mentalCost,score:D.mentalScore};
}

function addCost(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3],a[4]+b[4]];}

function leq(a,b){return a[0]<=b[0]&&a[1]<=b[1]&&a[2]<=b[2]&&a[3]<=b[3]&&a[4]<=b[4];}

function key5(c0,c1,c2,c3,c4){
  // 1501進数の圧縮キーは各桁が0〜1500のときだけ一意。
  // 訓練後の付与予定経験点を足すと使用経験点が1500を超えることがあるため、
  // その場合は区切り付き文字列に退避して状態衝突を防ぐ。
  if(c0>1500||c1>1500||c2>1500||c3>1500||c4>1500) return 'x:'+c0+','+c1+','+c2+','+c3+','+c4;
  return String(((((c0*1501+c1)*1501+c2)*1501+c3)*1501+c4));
}

function key(c){return key5(c[0],c[1],c[2],c[3],c[4]);}

function costSum(c){return c[0]+c[1]+c[2]+c[3]+c[4];}

function itemLenOf(st){return st?.itemLen ?? (st?.items?.length || 0);}

function restoreItems(st){
  if(!st) return [];
  if(st.items) return st.items;

  const chunks=[];
  let cur=st;
  while(cur){
    if(cur.choice&&cur.choice.length) chunks.push(cur.choice);
    cur=cur.prev;
  }

  const out=[];
  for(let i=chunks.length-1;i>=0;i--){
    out.push(...chunks[i]);
  }
  st.items=out;
  return out;
}

function better(a,b){return !b || a.score>b.score || (a.score===b.score && itemLenOf(a)<itemLenOf(b));}

function rowsForTable(table){
  const cachedRows=rangeRowCache.get(table);
  if(cachedRows!==undefined) return cachedRows;
  const rows=[];
  for(let i=0;i<table.length;i++){
    const range=parseRange(table[i][0]);
    if(range) rows.push({row:table[i],range});
  }
  rangeRowCache.set(table,rows);
  return rows;
}

function rowForValue(table,value){
  let cache=valueRowCache.get(table);
  if(!cache){cache=new Map();valueRowCache.set(table,cache);}
  const cachedRow=cache.get(value);
  if(cachedRow!==undefined) return cachedRow;
  const rows=rowsForTable(table);
  for(let i=0;i<rows.length;i++){
    const x=rows[i];
    if(value>=x.range.a && value<x.range.b){cache.set(value,x.row);return x.row;}
  }
  cache.set(value,null);
  return null;
}

function basicCostVector(name,costRow,hint){
  const offset=name==='生命力'?3:1;
  const n0=Number(costRow[offset]);
  const n1=Number(costRow[offset+1]);
  const n2=Number(costRow[offset+2]);
  const n3=Number(costRow[offset+3]);
  const n4=Number(costRow[offset+4]);
  if(!Number.isFinite(n0)||!Number.isFinite(n1)||!Number.isFinite(n2)||!Number.isFinite(n3)||!Number.isFinite(n4)) return null;
  return [
    costAfter(n0,hint,true),costAfter(n1,hint,true),costAfter(n2,hint,true),
    costAfter(n3,hint,true),costAfter(n4,hint,true)
  ];
}

function basicMilestoneTargets(current,max){
  const targets=[];
  const nextTen=Math.ceil((current+1)/10)*10;

  // 基本は次の10刻み。
  if(Number.isFinite(nextTen) && nextTen<=max) targets.push(nextTen);

  // 最大95の能力は95も節目。
  if(max===95 && current<95) targets.push(95);

  // 最大100以上の能力は100までを節目として扱う。
  // 110→115は査定が一定のため、115は節目に含めない。
  if(max>=100 && current<100) targets.push(100);

  return [...new Set(targets)]
    .filter(v=>v>current && v<=max && v<=100)
    .sort((a,b)=>a-b);
}

function clearCalcCaches(){
  specialItemCache.clear();
}

function itemForSpecialIndex(i,hp,includeLower=false){
  const s=D.special[i]; if(!s) return null;
  const cacheKey=[i,hp,includeLower?1:0,specialHint(i),specialOwned(i)?1:0].join('|');
  const cachedItem=specialItemCache.get(cacheKey);
  if(cachedItem!==undefined) return cachedItem;

  const score=skillScore(s,hp);
  if(score<=0){
    specialItemCache.set(cacheKey,null);
    return null;
  }

  const hint=specialHint(i);
  const rawCosts=[s[3],s[4],s[5],s[6],s[7]].map(c=>Number(c||0));
  const costs=rawCosts.map(c=>costAfter(c,hint,false));


  let totalCost=costs.slice();
  let totalScore=score;
  let items=[{type:'special',idx:i,name:s[1]}];

  if(includeLower){
    const li=lowerIndex(i);
    if(li>=0 && !specialOwned(li)){
      const lower=itemForSpecialIndex(li,hp,false);
      if(lower){
        totalCost=addCost(totalCost,lower.cost);
        totalScore+=lower.score;
        items=lower.items.concat(items);
      }
    }
  }

  const bits=specialItemsBits(items);
  const result={type:'choice',cost:totalCost,score:totalScore,items,itemLen:items.length,bits,conflictBits:conflictBitsFor(bits),idx:i,name:s[1]};
  specialItemCache.set(cacheKey,result);
  return result;
}

function specialOptionIsHpDependent(op){
  return !!op?.items?.some(it=>
    it?.type==='special' && Number(D.special[Number(it.idx)]?.[11]||0)!==0
  );
}

function clearMixedSearchCaches(){
  mixedBasicOptionCache.clear();
  mixedHpDeltaCache.clear();
  mixedSpecialTemplateCache.clear();
  mixedLimitsCache=null;
}

function mixedLimits(){
  if(mixedLimitsCache===null) mixedLimitsCache=limits();
  return mixedLimitsCache;
}

function mixedInitialLevels(){
  const lim=mixedLimits();
  return basicNames.map(name=>{
    const cur=Number(basicValues[name]||1);
    return basicOwned[name] && lim[name]!=null ? Number(lim[name]) : cur;
  });
}

function mixedLevelsKey(levels){
  return levels.map(v=>Number(v).toString(36)).join('.');
}

function mixedStateKey(st){
  if(st._mixedStateKey!==undefined&&st._mixedStateKey!==null) return st._mixedStateKey;
  const value=key(st.cost)+'|'+mixedLevelsKey(st.levels)+'|'+bitsKey(st.bits??EMPTY_BITS)+'|d'+(st.dualLevel==null?'':Number(st.dualLevel).toString(36));
  st._mixedStateKey=value;
  return value;
}

function mixedIsAcquired(i,bits){
  return specialOwned(i) || (((bits??EMPTY_BITS)&specialBit(i))!==EMPTY_BITS);
}

function mixedBasicOption(name,from,to){
  if(to<=from) return null;
  const hint=Number(basicHints[name]||0);
  const cacheKey=`${job.value}|${name}|${from}|${to}|${hint}`;
  if(mixedBasicOptionCache.has(cacheKey)) return mixedBasicOptionCache.get(cacheKey);
  const t=tableFor(name);
  let c=[0,0,0,0,0],score=0,v=from;
  while(v<to){
    const costRow=rowForValue(t.cost,v);
    const scoreRow=rowForValue(t.score,v);
    if(!costRow||!scoreRow) return null;
    const step=basicCostVector(name,costRow,hint);
    if(!step) return null;
    c=addCost(c,step);
    score+=Number(scoreRow[2]||0);
    v++;
  }
  const cs=costSum(c);
  const result={
    kind:'basic',
    name,
    from,
    to,
    cost:c,
    costSum:cs,
    score,
    efficiency:score/Math.max(1,cs),
    items:[{type:'basic',name,from,to,idx:basicNames.indexOf(name)}]
  };
  mixedBasicOptionCache.set(cacheKey,result);
  return result;
}

function mixedHpDependentMeta(){
  if(mixedHpDependentMetaCache) return mixedHpDependentMetaCache;
  const indices=[];
  let mask=EMPTY_BITS;
  for(let i=0;i<D.special.length;i++){
    if(!Number(D.special[i]?.[11]||0)) continue;
    indices.push(i);
    mask|=specialBit(i);
  }
  mixedHpDependentMetaCache={indices,mask};
  return mixedHpDependentMetaCache;
}

function mixedHpDeltaForBits(bits,oldHp,newHp){
  if(oldHp===newHp) return 0;
  const meta=mixedHpDependentMeta();
  const relevantBits=(bits??EMPTY_BITS)&meta.mask;
  const cacheKey=`${bitsKey(relevantBits)}|${oldHp}|${newHp}`;
  if(mixedHpDeltaCache.has(cacheKey)) return mixedHpDeltaCache.get(cacheKey);
  let delta=0;
  for(const i of meta.indices){
    if(!mixedIsAcquired(i,relevantBits)) continue;
    const skill=D.special[i];
    delta+=skillScore(skill,newHp)-skillScore(skill,oldHp);
  }
  const result=delta;
  mixedHpDeltaCache.set(cacheKey,result);
  return result;
}

function mixedBasicActions(st,exp){
  const actions=[];
  const lim=mixedLimits();
  for(let bi=0;bi<basicNames.length;bi++){
    const name=basicNames[bi];
    const from=Number(st.levels[bi]);
    const max=Number(lim[name]);
    if(!Number.isFinite(max)||from>=max) continue;

    const targets=[from+1];
    const milestones=basicMilestoneTargets(from,max);
    if(milestones.length) targets.push(milestones[0]);

    for(const to of [...new Set(targets)]){
      const op=mixedBasicOption(name,from,to);
      if(!op) continue;
      if(st.cost[0]+op.cost[0]>exp[0]||st.cost[1]+op.cost[1]>exp[1]||
         st.cost[2]+op.cost[2]>exp[2]||st.cost[3]+op.cost[3]>exp[3]||
         st.cost[4]+op.cost[4]>exp[4]) continue;

      let gain=op.score;
      if(name==='生命力'){
        const oldHp=currentHpForLife(from);
        const newHp=currentHpForLife(to);
        gain+=mixedHpDeltaForBits(st.bits??EMPTY_BITS,oldHp,newHp);
      }
      actions.push({...op,gain,efficiency:gain/Math.max(1,op.costSum)});
    }
  }
  return actions;
}

function mixedDualAction(st,exp){
  if(!workerDualEnabled||!DUAL_MASTER||DUAL_SKILL_INDEX<0) return null;
  const fromLevel=Number(st.dualLevel??workerDualLevel);
  const toLevel=fromLevel+1;
  if(toLevel>Number(DUAL_MASTER.maxLevel||fromLevel)) return null;
  const def=DUAL_MASTER.levels?.[toLevel];
  if(!def) return null;

  const dexIndex=basicNames.indexOf('器用さ');
  const currentDex=Number(st.levels[dexIndex]||1);
  const reqDex=Number(def.reqDex||0);
  let targetDex=currentDex;
  let cost=(def.cost||[0,0,0,0,0]).map(v=>costAfter(Number(v||0),workerDualHint,false));
  let gain=Number(def.score||0);
  const items=[];

  if(currentDex<reqDex){
    const dexOp=mixedBasicOption('器用さ',currentDex,reqDex);
    if(!dexOp) return null;
    cost=addCost(cost,dexOp.cost);
    gain+=Number(dexOp.score||0);
    items.push(...(dexOp.items||EMPTY_ITEMS));
    targetDex=reqDex;
  }

  const finalCost=addCost(st.cost,cost);
  if(!leq(finalCost,exp)) return null;
  items.push({type:'special',idx:DUAL_SKILL_INDEX,name:`${DUAL_MASTER.skillName} Lv${toLevel}`,dualLevel:toLevel});
  const cs=costSum(cost);
  return {
    kind:'dual',
    name:`${DUAL_MASTER.skillName} Lv${toLevel}`,
    fromLevel,
    toLevel,
    toDex:targetDex,
    cost,
    costSum:cs,
    gain,
    score:gain,
    efficiency:gain/Math.max(1,cs),
    items,
    bits:EMPTY_BITS
  };
}

function mixedSpecialTemplatesAtHp(hp){
  const key=String(hp);
  const cached=mixedSpecialTemplateCache.get(key);
  if(cached!==undefined) return cached;
  const templates=[];
  const used=new Set();
  for(let i=0;i<D.special.length;i++){
    if(used.has(i)) continue;
    const ui=upperIndex(i),li=lowerIndex(i);
    if(li>=0||ui<0) continue;
    used.add(i); used.add(ui);
    if(specialOwned(ui)) continue;
    const lowerBit=specialBit(i),upperBit=specialBit(ui);
    if(!specialOwned(i)){
      const lower=itemForSpecialIndex(i,hp,false);
      const upper=itemForSpecialIndex(ui,hp,true);
      const upperOnly=itemForSpecialIndex(ui,hp,false);
      if(lower) templates.push({op:{...lower,kind:'special'},mode:1,lowerBit,upperBit});
      if(upper) templates.push({op:{...upper,kind:'special'},mode:1,lowerBit,upperBit});
      if(upperOnly) templates.push({op:{...upperOnly,kind:'special'},mode:2,lowerBit,upperBit});
    }else{
      const upperOnly=itemForSpecialIndex(ui,hp,false);
      if(upperOnly) templates.push({op:{...upperOnly,kind:'special'},mode:3,lowerBit,upperBit});
    }
  }
  for(const names of mutualGroups){
    const idxs=names.map(n=>specialNameIndex.get(String(n))??-1).filter(i=>i>=0);
    idxs.forEach(i=>used.add(i));
    if(idxs.some(i=>specialOwned(i))) continue;
    let groupMask=EMPTY_BITS;
    for(const i of idxs) groupMask|=specialBit(i);
    for(const i of idxs){
      const op=itemForSpecialIndex(i,hp,false);
      if(op) templates.push({op:{...op,kind:'special'},mode:4,groupMask});
    }
  }
  for(let i=0;i<D.special.length;i++){
    if(used.has(i)||isUpperSpecial(i)||specialOwned(i)) continue;
    const op=itemForSpecialIndex(i,hp,false);
    if(op) templates.push({op:{...op,kind:'special'},mode:5,bit:specialBit(i)});
  }
  mixedSpecialTemplateCache.set(key,templates);
  return templates;
}

function mixedSpecialActionsAtHp(st,exp,hp){
  const actions=[];
  const active=st.bits??EMPTY_BITS;
  for(const t of mixedSpecialTemplatesAtHp(hp)){
    if(t.mode===1){
      if((active&(t.lowerBit|t.upperBit))!==EMPTY_BITS) continue;
    }else if(t.mode===2){
      if((active&t.lowerBit)===EMPTY_BITS||(active&t.upperBit)!==EMPTY_BITS) continue;
    }else if(t.mode===3){
      if((active&t.upperBit)!==EMPTY_BITS) continue;
    }else if(t.mode===4){
      if((active&t.groupMask)!==EMPTY_BITS) continue;
    }else if(t.mode===5){
      if((active&t.bit)!==EMPTY_BITS) continue;
    }
    actions.push(t.op);
  }

  const out=[];
  for(const op0 of actions){
    const opBits=op0.bits??specialItemsBits(op0.items);
    const conflict=op0.conflictBits??conflictBitsFor(opBits);
    if(((st.bits??EMPTY_BITS)&opBits)!==EMPTY_BITS) continue;
    if(((st.bits??EMPTY_BITS)&conflict)!==EMPTY_BITS) continue;
    if(st.cost[0]+op0.cost[0]>exp[0]||st.cost[1]+op0.cost[1]>exp[1]||
       st.cost[2]+op0.cost[2]>exp[2]||st.cost[3]+op0.cost[3]>exp[3]||
       st.cost[4]+op0.cost[4]>exp[4]) continue;

    const cs=op0.costSum??costSum(op0.cost);
    const eff=Number(op0.score||0)/Math.max(1,cs);
    out.push({
      ...op0,
      kind:'special',
      bits:opBits,
      costSum:cs,
      gain:Number(op0.score||0),
      efficiency:eff,
      isHpDependent:specialOptionIsHpDependent(op0)
    });
  }
  return out;
}

function mixedActionSort(a,b){
  if(b.efficiency!==a.efficiency) return b.efficiency-a.efficiency;
  if(b.gain!==a.gain) return b.gain-a.gain;
  return a.costSum-b.costSum;
}

function mixedBuildLifeHpSetAction(lifeOp,hpOp){
  const totalCost=addCost(lifeOp.cost,hpOp.cost);
  const lifeGain=Number(lifeOp.gain||0);
  const hpGain=Number(hpOp.gain||0);
  const totalGain=lifeGain+hpGain;
  const totalCostSum=costSum(totalCost);
  return {
    kind:'life_hp_set',
    name:`${lifeOp.name}+${hpOp.items?.map(x=>x.name).join('・')||'HP依存特殊能力'}`,
    from:lifeOp.from,
    to:lifeOp.to,
    cost:totalCost,
    costSum:totalCostSum,
    gain:totalGain,
    score:totalGain,
    efficiency:totalGain/Math.max(1,totalCostSum),
    bits:hpOp.bits,
    items:[...(lifeOp.items||EMPTY_ITEMS),...(hpOp.items||EMPTY_ITEMS)],
    lifePart:lifeOp,
    specialPart:hpOp
  };
}

function mixedCandidateActions(st,exp){
  if(st._mixedActions) return st._mixedActions;

  const basicActions=mixedBasicActions(st,exp);
  const currentHp=currentHpForLife(st.levels[0]);
  const currentSpecials=mixedSpecialActionsAtHp(st,exp,currentHp);
  const normalActions=basicActions.slice();
  const currentHpActions=[];
  for(const op of currentSpecials){
    if(op.isHpDependent) currentHpActions.push(op);
    else normalActions.push(op);
  }
  const dualAction=mixedDualAction(st,exp);
  if(dualAction) normalActions.push(dualAction);
  normalActions.sort(mixedActionSort);

  const branch=MIXED_BRANCH_NORMAL;
  const lifeTopActions=[];
  for(let i=0;i<normalActions.length&&i<branch;i++){
    const op=normalActions[i];
    if(op.kind==='basic'&&op.name==='生命力') lifeTopActions.push(op);
  }

  let all;
  if(!lifeTopActions.length){
    if(!currentHpActions.length){
      all=normalActions;
    }else{
      const merged=normalActions.concat(currentHpActions);
      merged.sort(mixedActionSort);
      const selectedHp=new Set();
      for(let i=0;i<merged.length&&i<branch;i++){
        if(merged[i].isHpDependent) selectedHp.add(merged[i]);
      }
      if(!selectedHp.size){
        all=normalActions;
      }else{
        all=[];
        for(const op of merged){
          if(!op.isHpDependent||selectedHp.has(op)) all.push(op);
        }
      }
    }
  }else{
    const hpActions=[];
    for(const lifeOp of lifeTopActions){
      const futureHp=currentHpForLife(lifeOp.to);
      const futureState={...st,levels:st.levels.slice()};
      futureState.levels[0]=lifeOp.to;
      const futureSpecials=mixedSpecialActionsAtHp(futureState,exp,futureHp)
        .filter(op=>op.isHpDependent);
      const setCandidates=[];
      for(const hpOp of futureSpecials){
        const combinedCost=addCost(st.cost,addCost(lifeOp.cost,hpOp.cost));
        if(!leq(combinedCost,exp)) continue;
        setCandidates.push(mixedBuildLifeHpSetAction(lifeOp,hpOp));
      }
      if(setCandidates.length){
        const comparison=normalActions.concat(setCandidates);
        comparison.sort(mixedActionSort);
        for(let i=0;i<comparison.length&&i<branch;i++){
          if(comparison[i].kind==='life_hp_set') hpActions.push(comparison[i]);
        }
      }
    }
    all=hpActions.length?normalActions.concat(hpActions):normalActions;
    if(hpActions.length) all.sort(mixedActionSort);
  }

  st._mixedActions=all;
  return all;
}

function mixedProjectedScore(st,exp,actions=null){
  const candidates=actions||mixedCandidateActions(st,exp);
  const remain=[
    exp[0]-st.cost[0],exp[1]-st.cost[1],exp[2]-st.cost[2],
    exp[3]-st.cost[3],exp[4]-st.cost[4]
  ];
  let bonus=0,used=0;
  for(const op of candidates){
    if(used>=10) break;
    if(op.hpPriorityPenalty) continue;
    if(op.cost[0]>remain[0]||op.cost[1]>remain[1]||op.cost[2]>remain[2]||
       op.cost[3]>remain[3]||op.cost[4]>remain[4]) continue;
    for(let i=0;i<5;i++) remain[i]-=op.cost[i];
    bonus+=Number(op.gain||0);
    used++;
  }
  return Number(st.score||0)+bonus;
}

function mixedPrune(states,limit,exp){
  const arr=Array.from(states.values());
  for(const st of arr){
    if(!Number.isFinite(st._mixedProjected)){
      st._mixedProjected=mixedProjectedScore(st,exp,st._mixedActions||null);
    }
  }
  arr.sort((a,b)=>{
    const bp=b._mixedProjected;
    const ap=a._mixedProjected;
    if(bp!==ap) return bp-ap;
    if(b.score!==a.score) return b.score-a.score;
    return a.usedCost-b.usedCost;
  });
  const out=new Map();
  for(let i=0;i<arr.length&&out.size<limit;i++){
    const st=arr[i];
    const k=mixedStateKey(st);
    const old=out.get(k);
    if(!old||better(st,old)) out.set(k,st);
  }
  return out;
}

function mixedApplyAction(st,op){
  const nc=addCost(st.cost,op.cost);
  const levels=st.levels.slice();
  let life=st.life;
  let bits=st.bits??EMPTY_BITS;
  let dualLevel=st.dualLevel;

  if(op.kind==='basic'){
    const bi=basicNames.indexOf(op.name);
    levels[bi]=op.to;
    if(op.name==='生命力') life=op.to;
  }else if(op.kind==='life_hp_set'){
    levels[0]=op.to;
    life=op.to;
    bits|=(op.bits??specialItemsBits(op.items));
  }else if(op.kind==='dual'){
    const dexIndex=basicNames.indexOf('器用さ');
    if(Number(op.toDex)>Number(levels[dexIndex])) levels[dexIndex]=Number(op.toDex);
    dualLevel=Number(op.toLevel);
  }else{
    bits|=(op.bits??specialItemsBits(op.items));
  }

  return {
    cost:nc,
    score:Number(st.score||0)+Number(op.gain||0),
    life,
    levels,
    bits,
    dualLevel,
    prev:st,
    choice:op.items||EMPTY_ITEMS,
    itemLen:itemLenOf(st)+(op.items?.length||0),
    usedCost:(st.usedCost??costSum(st.cost))+Number(op.costSum??costSum(op.cost)),
    _mixedProjected:null,
    _mixedActions:null
  };
}

function optimizeMixedAsync(exp){
  clearMixedSearchCaches();
  const levels=mixedInitialLevels();
  const initialLife=levels[0];
  const init={
    cost:[0,0,0,0,0],score:0,life:initialLife,levels,
    bits:EMPTY_BITS,dualLevel:workerDualEnabled?workerDualLevel:null,
    prev:null,choice:EMPTY_ITEMS,itemLen:0,usedCost:0
  };
  let states=new Map([[mixedStateKey(init),init]]);
  let best=init;

  const totalExp=costSum(exp);
  const baseLimit=Math.max(2800,Math.min(7600,1900+Math.floor(totalExp*0.95)));
  const stateLimit=baseLimit;
  const branch=MIXED_BRANCH_NORMAL;

  for(let step=0;step<MIXED_MAX_STEPS;step++){
    const next=new Map();
    let expanded=0;

    for(const st of states.values()){
      const actions=mixedCandidateActions(st,exp);
      if(!actions.length){
        const k=mixedStateKey(st);
        const old=next.get(k);
        if(!old||better(st,old)) next.set(k,st);
        if(better(st,best)) best=st;
        continue;
      }

      const selected=actions.slice(0,branch);
      // 経験点の偏りで有望手を落とさないよう、最高査定値候補も1件追加。
      const maxGain=actions.reduce((m,o)=>!m||o.gain>m.gain?o:m,null);
      if(maxGain&&!selected.includes(maxGain)) selected.push(maxGain);
      // 双剣士通常攻撃は器用さ条件込みの専用候補として必ず比較対象に残す。
      const dualChoice=actions.find(o=>o.kind==='dual');
      if(dualChoice&&!selected.includes(dualChoice)) selected.push(dualChoice);

      for(const op of selected){
        const ns=mixedApplyAction(st,op);
        const k=mixedStateKey(ns);
        const old=next.get(k);
        if(!old||better(ns,old)) next.set(k,ns);
        if(better(ns,best)) best=ns;
        expanded++;
      }
    }

    if(!expanded) break;
    states=next.size>stateLimit?mixedPrune(next,stateLimit,exp):next;

  }

  for(const st of states.values()) if(better(st,best)) best=st;
  best.ownedHpDelta=ownedHpDependentBreakdown(best.life).total;
  return best;
}

function __workerPayloadConfigKey(payload){
  const dualPart=[
    payload.isDualSwordsman?1:0,
    Number(payload.dualAttackLevel||DUAL_MASTER?.initialLevel||1),
    Number(payload.dualAttackHint||0)
  ];
  const basicPart=basicNames.map(name=>[
    name,
    Number(payload.basicValues?.[name]||1),
    payload.basicOwned?.[name]?1:0,
    Number(payload.basicHints?.[name]||0)
  ]);
  const specialPart=(payload.specialState||[])
    .map(([index,state])=>[
      String(index),
      Number(state?.hint||0),
      Number(state?.own||0)
    ])
    .sort((a,b)=>Number(a[0])-Number(b[0]));
  return JSON.stringify([
    String(payload.academy||''),
    String(payload.job||''),
    dualPart,
    basicPart,
    specialPart
  ]);
}

function __applyWorkerPayload(payload){
  workerDualEnabled=!!payload.isDualSwordsman || (
    String(payload.academy||'')===String(BOOTRAIN_MASTER?.name||'') &&
    String(payload.job||'')===String(DUAL_MASTER?.internalJob||'')
  );
  workerDualLevel=Math.max(Number(DUAL_MASTER?.initialLevel||1),Math.min(Number(DUAL_MASTER?.maxLevel||1),Number(payload.dualAttackLevel||DUAL_MASTER?.initialLevel||1)));
  workerDualHint=Math.max(0,Math.min(5,Number(payload.dualAttackHint||0)));
  const nextConfigKey=__workerPayloadConfigKey(payload);
  const configChanged=nextConfigKey!==__workerConfigKey;

  if(configChanged){
    academy.value=String(payload.academy||'');
    job.value=String(payload.job||'');

    for(const name of basicNames){
      basicValues[name]=Number(payload.basicValues?.[name]||1);
      basicOwned[name]=!!payload.basicOwned?.[name];
      basicHints[name]=Number(payload.basicHints?.[name]||0);
    }

    specialState.clear();
    for(const [index,state] of payload.specialState||[]){
      specialState.set(String(index),{
        hint:Number(state?.hint||0),
        own:Number(state?.own||0)
      });
    }

    clearCalcCaches();
    hpByLifeCache.clear();
    bitsKeyCache.clear();
    bitsKeyCache.set(EMPTY_BITS,'0');
    __workerConfigKey=nextConfigKey;
  }

  // 経験点ごとの探索状態は optimizeMixedAsync 内で毎回新規作成する。
  // 同一設定の連続計算では、候補生成など設定依存の安全なキャッシュだけを再利用する。
}

function collapseDualResultItems(items){
  if(!workerDualEnabled||!DUAL_MASTER) return items;
  const dualItems=(items||[]).filter(it=>it?.type==='special'&&Number.isFinite(Number(it.dualLevel)));
  if(!dualItems.length) return items;
  const levels=dualItems.map(it=>Number(it.dualLevel)).sort((a,b)=>a-b);
  const first=levels[0],last=levels[levels.length-1];
  const label=first===last?`Lv${last}`:`Lv${first}→Lv${last}`;
  const combined={type:'special',idx:DUAL_SKILL_INDEX,name:`${DUAL_MASTER.skillName} ${label}`};
  const out=[];
  let inserted=false;
  for(const item of items||[]){
    if(item?.type==='special'&&Number.isFinite(Number(item.dualLevel))){
      if(!inserted){out.push(combined);inserted=true;}
      continue;
    }
    out.push(item);
  }
  return out;
}

let __workerConfigKey='';
self.onmessage=async(event)=>{
  const data=event.data||{};
  if(data.type!=='calculate') return;

  try{
    const payload=data.payload||{};
    __applyWorkerPayload(payload);
    const exp=Array.isArray(payload.exp)
      ? payload.exp.map(v=>Number(v||0))
      : [0,0,0,0,0];

    if(workerDualEnabled&&DUAL_MASTER&&workerDualLevel>Number(DUAL_MASTER.initialLevel||1)){
      const dex=Number(payload.basicValues?.['器用さ']||1);
      const req=Number(DUAL_MASTER.levels?.[workerDualLevel]?.reqDex||0);
      if(dex<req) throw new Error(`取得条件を満たしていません（通常攻撃Lv${workerDualLevel}には器用さ${req}以上が必要です）。`);
    }
    const finalCandidate=await optimizeMixedAsync(exp);
    const items=collapseDualResultItems(restoreItems(finalCandidate).map(item=>({...item})));

    self.postMessage({
      type:'result',
      result:{
        cost:(finalCandidate.cost||[0,0,0,0,0]).slice(),
        score:Number(finalCandidate.score||0),
        life:finalCandidate.life??null,
        items,
        itemLen:Number(itemLenOf(finalCandidate)),
        usedCost:Number(finalCandidate.usedCost??costSum(finalCandidate.cost||[0,0,0,0,0])),
        ownedHpDelta:Number(finalCandidate.ownedHpDelta||0)
      }
    });
  }catch(error){
    self.postMessage({
      type:'error',
      name:error?.name||'Error',
      message:error?.message||'Worker内で原因不明のエラーが発生しました。'
    });
  }
};
