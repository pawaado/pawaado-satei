(function(){
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const mutualGroups=[
  ['生存本能','闘争本能'],
  ['柔軟な体','頑丈な体'],
  ['無心の構え','護身の構え'],
  ['力学の理解','魔法の理解']
];
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1]);});
const academy=document.getElementById('academy');
const job=document.getElementById('job');
const specialList=document.getElementById('specialList');
const search=document.getElementById('skillSearch');
const basicOwned={}; basicNames.forEach(n=>basicOwned[n]=false);
const basicHints={}; basicNames.forEach(n=>basicHints[n]=0);
const specialState=new Map();
const specialNameIndex=new Map();
const specialReqIndex=new Map();
D.special.forEach((s,i)=>{
  specialNameIndex.set(String(s[1]),i);
  if(s[2]) specialReqIndex.set(String(s[2]),i);
});
let isCalculating=false;
let cancelRequested=false;
let activeTargetConstraint='normal';

class CalculationCancelledError extends Error{
  constructor(){
    super('計算がキャンセルされました');
    this.name='CalculationCancelledError';
  }
}
function throwIfCancelled(){
  if(cancelRequested) throw new CalculationCancelledError();
}
const EMPTY_ITEMS=[];
const EMPTY_BITS=0n;
const specialBitCache=[];
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
const bitsKeyCache=new Map([[EMPTY_BITS,'0']]);
function bitsKey(bits){
  const value=bits||EMPTY_BITS;
  const cached=bitsKeyCache.get(value);
  if(cached!==undefined) return cached;

  const converted=value.toString(36);
  bitsKeyCache.set(value,converted);
  return converted;
}
function bitKeyOfState(st){
  return bitsKey(st.bits ?? EMPTY_BITS);
}
function lifeKeyOfState(st){
  return st.life==null?'':Number(st.life).toString(36);
}
const scopeKeyCache=new Map();
function scopeKeyFor(life,bits){
  const lifePart=life==null?'':Number(life).toString(36);
  let byBits=scopeKeyCache.get(lifePart);
  if(!byBits){
    byBits=new Map();
    scopeKeyCache.set(lifePart,byBits);
  }

  const bitValue=bits??EMPTY_BITS;
  const cached=byBits.get(bitValue);
  if(cached!==undefined) return cached;

  const value=lifePart+'|'+bitsKey(bitValue);
  byBits.set(bitValue,value);
  return value;
}
function pruneScopeKey(st){
  if(st._pruneScopeKey) return st._pruneScopeKey;
  const v=scopeKeyFor(st.life,st.bits??EMPTY_BITS);
  st._pruneScopeKey=v;
  return v;
}
const mutualMaskByIndex=[];
function initSpecialBitMeta(){
  mutualGroups.forEach(g=>{
    let mask=EMPTY_BITS;
    g.forEach(n=>{
      const i=specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1;
      if(i>=0) mask|=specialBit(i);
    });
    g.forEach(n=>{
      const i=specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1;
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
const TARGET_DEBUG_NAME='物理攻撃○';
const TARGET_DEBUG={
  reset(){
    this.index=-1;
    this.hint=0;
    this.owned=false;
    this.generated=false;
    this.score=null;
    this.rawCost=null;
    this.discountedCost=null;
    this.grouped=false;
    this.groupIndex=-1;
    this.groupKind='';
    this.considered=0;
    this.feasible=0;
    this.conflictCut=0;
    this.duplicateCut=0;
    this.ubCut=0;
    this.selected=false;
    this.groupSnapshots=[];
    this.routeGroupSnapshots=[];
    this.pruneEvents=[];
    this.mutualTransition=null;
    this.finalCandidateTrace=null;
    this.magicAcquisitionTrace=null;
    this.magicDecisionSnapshot=null;
    this.finalStatesWithTarget=0;
    this.bestWithTarget=null;
    this.bestWithoutTarget=null;
    this.selectedScore=null;
    this.selectedItemLen=null;
    this.selectedHasTarget=false;
    this._bestWithState=null;
    this._bestWithoutState=null;
    this.taskSummaries=[];
    this.augmentChecks=[];
    this.bestAugmentable=null;
    this.withOnlyItems=[];
    this.withoutOnlyItems=[];
    this.withOnlyDetails=[];
    this.withoutOnlyDetails=[];
    this.suspiciousBasicWarnings=[];
    this.withCost=null;
    this.withoutCost=null;
    this.costDiff=null;
    this.withLife=null;
    this.withoutLife=null;
    this.branchCandidateDiagnostics=[];
    this.notes=[];
  }
};
TARGET_DEBUG.reset();
function stateHasTarget(st){
  if(!st) return false;
  const idx=TARGET_DEBUG.index;
  if(idx>=0){
    const bit=specialBit(idx);
    if(((st.bits??EMPTY_BITS)&bit)!==EMPTY_BITS) return true;
  }
  const items=st.items||st.choice;
  return !!items?.some(it=>String(it?.name)===TARGET_DEBUG_NAME);
}
function targetRouteProfile(iterable){
  const values=iterable instanceof Map ? iterable.values() : iterable;
  const out={
    target:0,
    targetNoMagic:0,
    targetDex60:0,
    targetLife52:0,
    targetNoMagicDex60:0,
    targetNoMagicLife52:0,
    targetNoMagicDexOrLife:0,
    bestTarget:null,
    bestNoMagic:null,
    bestNoMagicDexOrLife:null
  };

  for(const st of values){
    if(!stateHasTarget(st)) continue;

    out.target++;
    if(out.bestTarget==null || st.score>out.bestTarget) out.bestTarget=st.score;

    const items=restoreItems(st);
    let magicRaised=false;
    let dex60=false;

    for(const it of items){
      if(it?.type!=='basic') continue;
      if(String(it.name)==='魔力' && Number(it.to)>Number(it.from)) magicRaised=true;
      if(String(it.name)==='器用さ' && Number(it.to)>=60) dex60=true;
    }

    const life52=Number(st.life)>=52;

    if(!magicRaised){
      out.targetNoMagic++;
      if(out.bestNoMagic==null || st.score>out.bestNoMagic) out.bestNoMagic=st.score;
    }
    if(dex60) out.targetDex60++;
    if(life52) out.targetLife52++;

    if(!magicRaised && dex60) out.targetNoMagicDex60++;
    if(!magicRaised && life52) out.targetNoMagicLife52++;

    if(!magicRaised && (dex60 || life52)){
      out.targetNoMagicDexOrLife++;
      if(out.bestNoMagicDexOrLife==null || st.score>out.bestNoMagicDexOrLife){
        out.bestNoMagicDexOrLife=st.score;
      }
    }
  }

  return out;
}

function isTargetNoMagicState(st){
  if(!stateHasTarget(st)) return false;
  const items=restoreItems(st);
  return !items.some(it=>
    it?.type==='basic' &&
    String(it.name)==='魔力' &&
    Number(it.to)>Number(it.from)
  );
}

function briefState(st){
  if(!st) return 'なし';
  const items=restoreItems(st)
    .map(debugItemLabel)
    .filter(Boolean);
  return `score:${Number(st.score).toFixed(2)} / cost:${st.cost.join(',')} / ${items.join('・')}`;
}

function compactRouteProfile(p){
  if(!p) return 'なし';
  const fmt=v=>v==null?'なし':Number(v).toFixed(2).replace(/\.00$/,'');
  return [
    `○:${p.target}`,
    `魔力なし:${p.targetNoMagic}`,
    `器用60:${p.targetDex60}`,
    `生命52:${p.targetLife52}`,
    `魔力なし＋器用/生命:${p.targetNoMagicDexOrLife}`,
    `最高:${fmt(p.bestTarget)}`,
    `魔力なし最高:${fmt(p.bestNoMagic)}`,
    `有力ルート最高:${fmt(p.bestNoMagicDexOrLife)}`
  ].join(' / ');
}

function debugItemKey(it){
  if(!it) return '';
  if(it.type==='special') return `special:${it.idx}`;
  if(it.type==='basic') return `basic:${it.name}:${it.from}:${it.to}`;
  return JSON.stringify(it);
}
function debugItemLabel(it){
  if(!it) return '不明';
  if(it.type==='special') return String(it.name||`特殊能力#${it.idx}`);
  if(it.type==='basic') return `${it.name} ${it.from}→${it.to}`;
  return String(it.name||it.type||'不明');
}
function basicDebugDetail(it){
  const name=String(it?.name||'');
  const from=Number(it?.from);
  const to=Number(it?.to);
  const hint=Number(basicHints[name]||0);
  const t=tableFor(name);

  if(!t || !Number.isFinite(from) || !Number.isFinite(to)){
    return `${debugItemLabel(it)}：詳細取得不可`;
  }

  let totalCost=[0,0,0,0,0];
  let totalScore=0;
  const refs=[];

  for(let v=from;v<to;v++){
    const costRow=rowForValue(t.cost,v);
    const scoreRow=rowForValue(t.score,v);
    if(!costRow || !scoreRow){
      refs.push(`${v}→${v+1}:行なし`);
      continue;
    }

    const step=basicCostVector(name,costRow,hint);
    const stepScore=Number(scoreRow[2]||0);

    if(step) totalCost=addCost(totalCost,step);
    totalScore+=stepScore;

    refs.push(
      `${v}→${v+1}`+
      `[cost:${String(costRow[0])},score:${String(scoreRow[0])}]`
    );
  }

  const sum=costSum(totalCost);
  const eff=totalScore/(1+sum);

  return `${debugItemLabel(it)}`+
    `｜査定:${totalScore}`+
    `｜コスト:${totalCost.join(',')}`+
    `｜合計:${sum}`+
    `｜効率:${eff.toFixed(5)}`+
    `｜コツLv:${hint}`+
    `｜参照:${refs.join(' / ')}`;
}

function specialDebugDetail(it,hp){
  const idx=Number(it?.idx);
  const s=D.special[idx];
  if(!s) return `${debugItemLabel(it)}：詳細取得不可`;

  const hint=specialHint(idx);
  const score=skillScore(s,hp);
  const raw=[s[3],s[4],s[5],s[6],s[7]].map(x=>Number(x||0));
  const cost=raw.map(x=>costAfter(x,hint,false));
  const sum=costSum(cost);
  const eff=score/(1+sum);

  return `${debugItemLabel(it)}`+
    `｜査定:${score}`+
    `｜コスト:${cost.join(',')}`+
    `｜元コスト:${raw.join(',')}`+
    `｜合計:${sum}`+
    `｜効率:${eff.toFixed(5)}`+
    `｜コツLv:${hint}`+
    `｜dataIndex:${idx}`;
}

function debugItemDetail(it,hp){
  if(it?.type==='basic') return basicDebugDetail(it);
  if(it?.type==='special') return specialDebugDetail(it,hp);
  return debugItemLabel(it);
}

function compareDebugItems(withState,withoutState){
  const withItems=withState ? restoreItems(withState) : [];
  const withoutItems=withoutState ? restoreItems(withoutState) : [];

  const withMap=new Map(withItems.map(it=>[debugItemKey(it),it]));
  const withoutMap=new Map(withoutItems.map(it=>[debugItemKey(it),it]));

  const withOnly=[];
  const withoutOnly=[];
  const withOnlyDetails=[];
  const withoutOnlyDetails=[];

  for(const [k,it] of withMap){
    if(!withoutMap.has(k)){
      withOnly.push(debugItemLabel(it));
      withOnlyDetails.push(debugItemDetail(it,withState?.life));
    }
  }
  for(const [k,it] of withoutMap){
    if(!withMap.has(k)){
      withoutOnly.push(debugItemLabel(it));
      withoutOnlyDetails.push(debugItemDetail(it,withoutState?.life));
    }
  }

  return {withOnly,withoutOnly,withOnlyDetails,withoutOnlyDetails};
}

function countTargetStates(mapOrIterable){
  let n=0;
  const values=mapOrIterable instanceof Map ? mapOrIterable.values() : mapOrIterable;
  for(const st of values){
    if(stateHasTarget(st)) n++;
  }
  return n;
}
const PROFILE={marks:new Map(),times:new Map()};
function pStart(k){PROFILE.marks.set(k,performance.now());}
function pEnd(k){const t=performance.now()-(PROFILE.marks.get(k)||performance.now());PROFILE.times.set(k,(PROFILE.times.get(k)||0)+t);}
function pReset(){PROFILE.marks.clear();PROFILE.times.clear();}
function pReport(){
  const rows=[...PROFILE.times.entries()].map(([k,v])=>`<tr><td>${k}</td><td>${(v/1000).toFixed(3)} 秒</td></tr>`);
  return rows.length?rows.join(""):'<tr><td colspan="2">計測なし</td></tr>';
}

function opt(label,value){return new Option(label,value??label)}
function academyRows(){return D.academies.filter(r=>r[0]===academy.value && r[1]===job.value)}
function hasAcademyJob(){return !!academy.value && !!job.value;}
function limits(){const r=academyRows()[0]; const m={}; basicNames.forEach((n,i)=>m[n]=r?Number(r[i+2]):null); return m;}
function initAcademies(){academy.innerHTML='';academy.add(opt('アカデミーを選択',''));Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));updateJobs();}
function updateJobs(){
  const jobs=jobsByAcademy[academy.value]||[];
  job.innerHTML=''; job.add(opt('ジョブを選択',''));
  jobs.forEach(j=>job.add(opt(j)));
  job.disabled=!academy.value;
  clearBasicState(); renderBasic(); renderSpecials();
}
academy.addEventListener('change',updateJobs);
job.addEventListener('change',()=>{clearBasicState();renderBasic();renderSpecials();});

function clearBasicState(){basicNames.forEach(n=>{basicOwned[n]=false; basicHints[n]=basicHints[n]||0;});}
function safeId(s){return String(s).replace(/[^a-zA-Z0-9_぀-ヿ㐀-鿿]/g,'_');}
function renderExp(){document.getElementById('expInputs').innerHTML=expNames.map(n=>`<div class="exp-row"><label>${n}</label><input type="number" min="0" max="1000" id="exp_${n}" inputmode="numeric" autocomplete="off"><div class="inline-error" id="err_exp_${safeId(n)}"></div></div>`).join('');}

function renderBasic(){
  const wrap=document.getElementById('basicInputs');
  const lim=limits();
  const disabled=!hasAcademyJob();
  wrap.innerHTML=basicNames.map(n=>`
    <div class="ability-block">
      <div class="ability-row ${basicOwned[n]?'owned':''}" data-basic="${n}">
        <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}" ${disabled?'disabled':''}>＋</button>
        <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}" ${disabled?'disabled':''}><span class="ability-name-text">${n}</span></button>
        <input class="ability-value" type="number" min="1" ${lim[n]?`max="${lim[n]}"`:''} id="basic_${n}" inputmode="numeric" autocomplete="off" ${disabled?'disabled':''}>
      </div>
      <div class="inline-error" id="err_basic_${safeId(n)}"></div>
    </div>`).join('');
  basicNames.forEach(n=>applyBasicVisual(n));
}
function renderSkillName(name){
  const s=String(name);
  let rank=''; let base=s;
  if(s.endsWith('○')){base=s.slice(0,-1);rank='<span class="rank-symbol" aria-label="○">○</span>';}
  else if(s.endsWith('◎')){base=s.slice(0,-1);rank='<span class="rank-symbol" aria-label="◎">◎</span>';}
  return `<span class="skill-name-text">${base}${rank}</span>`;
}
function getSpecialState(i){const k=String(i); if(!specialState.has(k)) specialState.set(k,{hint:0,own:0}); return specialState.get(k);}
function isUpperSpecial(i){return String(D.special[i][1]).endsWith('◎');}
function lowerIndex(i){const req=D.special[i]?.[2]; if(!req)return -1; return specialNameIndex.has(String(req))?specialNameIndex.get(String(req)):-1;}
function upperIndex(i){const name=D.special[i]?.[1]; return specialReqIndex.has(String(name))?specialReqIndex.get(String(name)):-1;}
function pairIndex(i){const li=lowerIndex(i); if(li>=0)return li; return upperIndex(i);}
function specialOwned(i){return getSpecialState(i).own===1;}
function specialHint(i){return Number(getSpecialState(i).hint||0);}
function shouldShowSpecial(i){
  const name=String(D.special[i][1]);
  const q=(search.value||'').trim().toLowerCase();
  if(q) return name.toLowerCase().includes(q);
  if(!isUpperSpecial(i)) return true;
  const li=lowerIndex(i);
  return (li>=0 && specialOwned(li)) || specialOwned(i);
}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!shouldShowSpecial(i)) return '';
    const st=getSpecialState(i);
    return `<div class="skill-row ${Number(st.own)?'owned':''}" data-index="${i}">
      <button type="button" class="hint-btn" data-kind="special-hint" data-index="${i}">＋</button>
      <button type="button" class="name-btn" data-kind="special-name" data-index="${i}"><span>${renderSkillName(s[1])}</span></button>
    </div>`;
  }).join('');
  specialList.innerHTML=html;
  D.special.forEach((_,i)=>applySkillVisual(i));
}
search.addEventListener('input',renderSpecials);
function ownedLabel(on){return on ? '<span class="owned-label">✓取得済</span>' : ''}
function setHintBtn(btn,level){if(!btn)return; btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function cycleHint(v){return (Number(v)||0)>=5 ? 0 : (Number(v)||0)+1;}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  const lim=limits(); const disabled=!hasAcademyJob();
  setHintBtn(row.querySelector('.hint-btn'),basicHints[name]||0);
  row.classList.toggle('owned',!!basicOwned[name]);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span class="ability-name-text">${name}</span>${ownedLabel(!!basicOwned[name])}`;
  const inp=document.getElementById('basic_'+name);
  if(inp){
    inp.disabled=disabled || !!basicOwned[name];
    inp.classList.toggle('locked',!!basicOwned[name]);
    if(basicOwned[name] && lim[name]!=null) inp.value=lim[name];
  }
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`); if(!row)return;
  const st=getSpecialState(i); setHintBtn(row.querySelector('.hint-btn'),st.hint); row.classList.toggle('owned',Number(st.own)===1);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span>${renderSkillName(D.special[i][1])}</span>${ownedLabel(Number(st.own)===1)}`;
}
function baseNameOfSkill(i){return String(D.special[i][1]).replace(/[○◎]$/,'');}
function inMutualGroup(name){return mutualGroups.find(g=>g.includes(name));}
function setSpecialOwned(i,on,chain=true){
  const st=getSpecialState(i); st.own=on?1:0;
  if(on){
    const group=inMutualGroup(D.special[i][1]);
    if(group){group.forEach(n=>{const j=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(j>=0 && j!==i){getSpecialState(j).own=0; applySkillVisual(j);}});}
  }
  applySkillVisual(i);
  if(!chain){ renderSpecials(); return; }
  if(on){const li=lowerIndex(i); if(li>=0) setSpecialOwned(li,true,false);}
  else{const ui=upperIndex(i); if(ui>=0) setSpecialOwned(ui,false,false);}
  renderSpecials();
}
function setSpecialHint(i,level,chain=true){
  const st=getSpecialState(i); st.hint=Number(level)||0; applySkillVisual(i);
  if(chain){const p=pairIndex(i); if(p>=0) setSpecialHint(p,level,false);}
}
function toggleSpecial(i){setSpecialOwned(i,!(getSpecialState(i).own===1));}

document.addEventListener('dblclick',e=>{if(e.target.closest('button')) e.preventDefault();},{passive:false});
document.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t)return;
  if(isCalculating && t.id!=='calcBtn'){ e.preventDefault(); return; }
  const kind=t.dataset.kind;
  if(kind==='basic-hint'){const name=t.dataset.name; basicHints[name]=cycleHint(basicHints[name]); applyBasicVisual(name); return;}
  if(kind==='basic-name'){
    if(!hasAcademyJob()) return;
    const name=t.dataset.name; basicOwned[name]=!basicOwned[name];
    applyBasicVisual(name); return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});


function setInlineError(id,msg){const el=document.getElementById(id); if(el) el.textContent=msg||'';}
function validateExpField(name){
  const inp=document.getElementById('exp_'+name); if(!inp) return '';
  const v=inp.value;
  let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    if(!Number.isFinite(num) || num<0) msg='経験点は0以上の値を入力してください';
    else if(num>1000) msg='経験点は1000以下の値を入力してください';
  }
  setInlineError('err_exp_'+safeId(name),msg);
  inp.classList.toggle('input-error',!!msg);
  return msg;
}
function validateBasicField(name){
  const inp=document.getElementById('basic_'+name); if(!inp) return '';
  const lim=limits()[name]; const v=inp.value;
  let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    if(!Number.isFinite(num) || num<1) msg='基本能力は1以上の値を入力してください';
    else if(lim!=null && num>lim) msg='入力した値は上限を超えています';
  }
  setInlineError('err_basic_'+safeId(name),msg);
  inp.classList.toggle('input-error',!!msg);
  return msg;
}
function validateAllInline(){expNames.forEach(validateExpField); basicNames.forEach(validateBasicField);}

document.addEventListener('input',e=>{
  if(isCalculating) return;
  const inp=e.target;
  if(!inp || !inp.id) return;
  if(inp.id.startsWith('exp_')){ validateExpField(inp.id.replace('exp_','')); return; }
  if(!inp.id.startsWith('basic_')) return;
  const name=inp.id.replace('basic_','');
  validateBasicField(name);
  const lim=limits()[name];
  if(lim!=null && inp.value!=='' && Number(inp.value)===lim){
    basicOwned[name]=true;
    applyBasicVisual(name);
  }else{
    basicOwned[name]=false;
    applyBasicVisual(name);
  }
});

function jobScoreIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}
function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:({0:0,1:.5,2:.6,3:.7,4:.8,5:.9}[hint]||0); return Math.floor(cost*(1-disc));}
function currentHpForLife(life){let hp=50; for(const r of D.hp){if(life>=Number(r[0])) hp=Number(r[1]);} return hp;}
function parseRange(r){const m=String(r).match(/(\d+)→(\d+)/); return m?{a:Number(m[1]),b:Number(m[2])}:null;}
function tableFor(name){
  if(name==='生命力') return {cost:D.life,score:D.life};
  if(name==='パワー') return {cost:D.powerCost,score:['剣士','弓使い','重戦士'].includes(job.value)?D.powerPhysicalScore:D.powerMagicScore};
  if(name==='魔力') return {cost:D.magicCost,score:['魔闘士','魔法使い','僧侶'].includes(job.value)?D.magicMagicScore:D.magicPhysicalScore};
  if(name==='器用さ') return {cost:D.dexCost,score:D.dexScore};
  if(name==='耐久力') return {cost:D.staminaCost,score:D.staminaScore};
  if(name==='精神力') return {cost:D.mentalCost,score:D.mentalScore};
}
function addCost(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3],a[4]+b[4]];}
function leq(a,b){return a[0]<=b[0]&&a[1]<=b[1]&&a[2]<=b[2]&&a[3]<=b[3]&&a[4]<=b[4];}
function key(c){
  const n=((((c[0]*1001+c[1])*1001+c[2])*1001+c[3])*1001+c[4]);
  return String(n);
}
function stateKey(st){
  if(st._stateKey!==undefined && st._stateKey!==null) return st._stateKey;
  const value=key(st.cost)+'|'+scopeKeyFor(st.life,st.bits??EMPTY_BITS);
  st._stateKey=value;
  return value;
}
function costSum(c){return c[0]+c[1]+c[2]+c[3]+c[4];}
function mergeItems(a,b){return !b.length?a:(!a.length?b:a.concat(b));}
function itemLenOf(st){return st?.itemLen ?? (st?.items?.length || 0);}
function makeState(cost,score,life,prev=null,choice=EMPTY_ITEMS,itemLen=null,bits=null,stateKeyValue=null,usedCostValue=null){
  const ch=(choice&&choice.length)?choice:EMPTY_ITEMS;
  const chBits=bits!=null ? bits : specialItemsBits(ch);
  const prevBits=prev?.bits ?? EMPTY_BITS;
  const nextBits=prevBits|chBits;
  return {
    cost,
    score,
    life,
    prev,
    choice:ch,
    bits:nextBits,
    _pruneScopeKey:scopeKeyFor(life,nextBits),
    _stateKey:stateKeyValue,
    usedCost:usedCostValue ?? costSum(cost),
    itemLen:itemLen ?? ((prev?itemLenOf(prev):0)+ch.length)
  };
}
function inspectStateChain(st){
  if(!st){
    return {
      items:[],
      cycle:false,
      nodeCount:0,
      choiceCount:0,
      cachedItems:false
    };
  }

  const chunks=[];
  const seen=new Set();
  let cur=st;
  let cycle=false;
  let nodeCount=0;
  let choiceCount=0;

  while(cur){
    if(seen.has(cur)){
      cycle=true;
      break;
    }
    seen.add(cur);
    nodeCount++;

    if(cur.choice&&cur.choice.length){
      chunks.push(cur.choice);
      choiceCount+=cur.choice.length;
    }
    cur=cur.prev;
  }

  const items=[];
  for(let i=chunks.length-1;i>=0;i--){
    items.push(...chunks[i]);
  }

  return {
    items,
    cycle,
    nodeCount,
    choiceCount,
    cachedItems:Array.isArray(st.items)
  };
}

function itemNamesForDiagnosis(items){
  return (items||[])
    .map(debugItemLabel)
    .filter(Boolean);
}

function diagnosisHasTarget(items){
  return (items||[]).some(it=>String(it?.name||'')===TARGET_DEBUG_NAME);
}

function diagnosisHasMagicRaise(items){
  return (items||[]).some(it=>
    it?.type==='basic' &&
    String(it.name||'')==='魔力' &&
    Number(it.to)>Number(it.from)
  );
}

function traceItemLabel(it){
  if(!it) return '不明';
  if(it.type==='basic') return `${it.name} ${it.from}→${it.to}`;
  return String(it.name||'不明');
}

function topScoreRank(states, score){
  const values=[...states.values()]
    .map(s=>Number(s.score))
    .filter(Number.isFinite)
    .sort((a,b)=>b-a);
  let rank=1;
  for(const v of values){
    if(v>score) rank++;
    else break;
  }
  return {rank,total:values.length};
}

function inspectChainNodes(st){
  const nodes=[];
  const seen=new Set();
  let cur=st;
  let cycle=false;

  while(cur){
    if(seen.has(cur)){
      cycle=true;
      break;
    }
    seen.add(cur);

    nodes.push({
      score:Number(cur.score),
      cost:Array.isArray(cur.cost)?cur.cost.slice():[],
      choice:Array.isArray(cur.choice)?cur.choice.map(traceItemLabel):[],
      life:cur.life,
      key:stateKey(cur),
      groupIndex:Number.isInteger(cur._groupIndex)?cur._groupIndex:null,
      groupKind:cur._groupKind||'',
      stateRef:cur
    });

    cur=cur.prev;
  }

  nodes.reverse();
  return {nodes,cycle};
}

function meaningfulChainNodes(info){
  const nodes=info?.nodes||[];
  if(!nodes.length) return [];

  const out=[nodes[0]];
  for(let i=1;i<nodes.length;i++){
    const prev=out[out.length-1];
    const node=nodes[i];
    const hasChoice=Array.isArray(node.choice)&&node.choice.length>0;
    const scoreChanged=Number(node.score)!==Number(prev.score);
    const costChanged=(node.cost||[]).some((v,j)=>Number(v)!==Number(prev.cost?.[j]||0));

    // 基本能力探索から特殊能力探索へ渡す際に挟まる、
    // score・cost・choiceがすべて同じ「開始状態」ノードは表示・診断から除外する。
    if(!hasChoice && !scoreChanged && !costChanged) continue;
    out.push(node);
  }
  return out;
}

function compactChainText(info){
  const nodes=meaningfulChainNodes(info);
  if(!nodes.length) return 'なし';

  return nodes.map((node,i)=>{
    const added=node.choice.length?node.choice.join('・'):'開始状態';
    return `N${i}：${added} / score ${node.score.toFixed(2)} / cost ${node.cost.join(',')}`;
  }).join('<br>');
}

function candidateCategory(op){
  const names=(op.items||[]).map(traceItemLabel);
  if(names.some(n=>n.startsWith('魔力 '))) return '魔力';
  if(names.some(n=>n.startsWith('生命力 '))) return '生命力';
  if(names.some(n=>n.startsWith('器用さ '))) return '器用さ';
  if(names.some(n=>n.startsWith('パワー '))) return 'パワー';
  if(names.some(n=>n.startsWith('耐久力 '))) return '耐久力';
  if(names.some(n=>n.startsWith('精神力 '))) return '精神力';
  if(names.some(n=>n===TARGET_DEBUG_NAME)) return TARGET_DEBUG_NAME;
  if(names.length===0) return '何もしない';
  return names.join('・');
}

function compactCandidateRows(rows){
  if(!rows||!rows.length) return '<tr><td colspan="7">候補なし</td></tr>';

  return rows.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${r.label}</td>
      <td>${r.newScore.toFixed(2)}</td>
      <td>${r.gain>=0?'+':''}${r.gain.toFixed(2)}</td>
      <td>${r.cost.join(',')}</td>
      <td>${r.efficiency==null?'なし':r.efficiency.toFixed(5)}</td>
      <td>${r.selected?'採用':'不採用'}</td>
    </tr>
  `).join('');
}

function buildSelectedChainDecision(chainInfo,preferredIndex=6){
  const nodes=meaningfulChainNodes(chainInfo);
  if(nodes.length<2) return null;

  // 重複した「開始状態」ノードを除外した実質チェーン上でN6を診断する。
  // これにより、表示上のN6と候補比較の親・採用項目が一致する。
  const nodeIndex=Math.min(Math.max(1,preferredIndex),nodes.length-1);
  const parent=nodes[nodeIndex-1];
  const selected=nodes[nodeIndex];
  const added=selected.choice||[];
  const gain=Number(selected.score)-Number(parent.score);
  const deltaCost=selected.cost.map((v,i)=>Number(v)-Number(parent.cost[i]||0));
  const deltaSum=costSum(deltaCost);

  const parentItems=[];
  for(let i=1;i<nodeIndex;i++){
    parentItems.push(...(nodes[i].choice||[]));
  }

  return {
    gi:null,
    chainNodeIndex:nodeIndex,
    groupKind:'final-selected-chain',
    parentKey:parent.key,
    parentScore:Number(parent.score),
    parentCost:parent.cost.slice(),
    parentItems,
    selectedKey:selected.key,
    selectedLabel:added.length?added.join('・'):'何もしない',
    rows:[
      {
        label:added.length?added.join('・'):'何もしない',
        newScore:Number(selected.score),
        gain,
        cost:deltaCost,
        costSum:deltaSum,
        efficiency:deltaSum>0?gain/deltaSum:null,
        selected:true
      },
      {
        label:'何もしない',
        newScore:Number(parent.score),
        gain:0,
        cost:[0,0,0,0,0],
        costSum:0,
        efficiency:null,
        selected:added.length===0
      }
    ]
  };
}


function branchChoiceSignature(items){
  return (items||[]).map(it=>{
    if(it?.type==='special') return `special:${Number(it.idx)}`;
    if(it?.type==='basic') return `basic:${it.name}:${it.from}:${it.to}`;
    return traceItemLabel(it);
  }).sort().join('|');
}

function buildBranchCandidateDiagnostics(finalState,exp,startIndex=5,endIndex=8){
  const raw=inspectChainNodes(finalState);
  const nodes=meaningfulChainNodes(raw);
  const results=[];

  for(let nodeIndex=Math.max(1,startIndex);nodeIndex<=Math.min(endIndex,nodes.length-1);nodeIndex++){
    const selectedNode=nodes[nodeIndex];
    const parentNode=nodes[nodeIndex-1];
    const parent=parentNode.stateRef;
    const groupIndex=selectedNode.groupIndex;

    if(!parent || !Number.isInteger(groupIndex)){
      results.push({
        nodeIndex,
        selectedLabel:selectedNode.choice?.join('・')||'何もしない',
        groupIndex:null,
        groupKind:selectedNode.groupKind||'',
        parentScore:Number(parentNode.score),
        parentCost:(parentNode.cost||[]).slice(),
        rows:[],
        note:'グループ情報なし（基本能力ノードまたは旧キャッシュ）'
      });
      continue;
    }

    const hp=currentHpForLife(parent.life);
    const cacheKey=String(hp)+'|'+key(exp);
    const groups=orderedSpecialGroupCache.get(cacheKey) || specialChoiceGroupsForExpCached(hp,exp);
    const group=groups[groupIndex];

    if(!group){
      results.push({
        nodeIndex,
        selectedLabel:selectedNode.choice?.join('・')||'何もしない',
        groupIndex,
        groupKind:selectedNode.groupKind||'',
        parentScore:Number(parent.score),
        parentCost:(parent.cost||[]).slice(),
        rows:[],
        note:'対象グループを復元できず'
      });
      continue;
    }

    const parentBits=parent.bits??EMPTY_BITS;
    const selectedSignature=branchChoiceSignature(selectedNode.stateRef?.choice||[]);
    const rows=[];

    for(const op of group.opts){
      const opBits=op.bits??specialItemsBits(op.items);
      let result='候補';
      let reason='';
      if((parentBits&opBits)!==EMPTY_BITS){
        result='除外'; reason='取得済み重複';
      }else if((parentBits&(op.conflictBits??conflictBitsFor(opBits)))!==EMPTY_BITS){
        result='除外'; reason='相互排他';
      }

      const newCost=addCost(parent.cost,op.cost);
      if(result!=='除外' && !leq(newCost,exp)){
        result='除外'; reason='経験点不足';
      }

      const sig=branchChoiceSignature(op.items);
      const selected=sig===selectedSignature;
      if(selected && result!=='除外') result='採用';

      rows.push({
        label:(op.items||[]).map(traceItemLabel).join('・')||'不明',
        score:Number(parent.score)+Number(op.score),
        gain:Number(op.score),
        cost:(op.cost||[]).slice(),
        efficiency:(op.costSum??costSum(op.cost))>0 ? Number(op.score)/(op.costSum??costSum(op.cost)) : null,
        result,
        reason,
        selected
      });
    }

    rows.push({
      label:'何もしない',
      score:Number(parent.score),
      gain:0,
      cost:[0,0,0,0,0],
      efficiency:null,
      result:selectedSignature===''?'採用':'不採用',
      reason:'',
      selected:selectedSignature===''
    });

    rows.sort((a,b)=>{
      if(a.selected!==b.selected) return a.selected?-1:1;
      if(a.result==='除外' && b.result!=='除外') return 1;
      if(a.result!=='除外' && b.result==='除外') return -1;
      return b.score-a.score;
    });

    results.push({
      nodeIndex,
      selectedLabel:selectedNode.choice?.join('・')||'何もしない',
      groupIndex,
      groupKind:group.kind||selectedNode.groupKind||'',
      parentScore:Number(parent.score),
      parentCost:(parent.cost||[]).slice(),
      rows,
      note:''
    });
  }

  return results;
}

function compactBranchCandidateRows(rows){
  if(!rows?.length) return '<tr><td colspan="8">候補情報なし</td></tr>';
  return rows.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td>${r.label}</td>
    <td>${r.score.toFixed(2)}</td>
    <td>${r.gain>=0?'+':''}${r.gain.toFixed(2)}</td>
    <td>${r.cost.join(',')}</td>
    <td>${r.efficiency==null?'なし':r.efficiency.toFixed(5)}</td>
    <td>${r.result}</td>
    <td>${r.reason||'-'}</td>
  </tr>`).join('');
}

function shortDiagnosisItems(items,max=8){
  const names=itemNamesForDiagnosis(items);
  if(!names.length) return 'なし';
  return names.slice(0,max).join(' / ')+(names.length>max?` / 他${names.length-max}件`:'');
}

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
function yieldToBrowser(){
  return new Promise(r=>setTimeout(r,0)).then(()=>{
    throwIfCancelled();
  });
}
function prune(states,limit=12000){
  const mode=currentCalcMode();
  const targetBefore=countTargetStates(states);
  const routeBefore=targetRouteProfile(states);
  const arr=[...states.values()]
    .map(st=>{st.totalCost=costSum(st.cost); return st;})
    .sort((a,b)=>{
      if(b.score!==a.score) return b.score-a.score;
      return a.totalCost-b.totalCost;
    });

  function sameScope(a,b){
    return pruneScopeKey(a)===pruneScopeKey(b);
  }

  if(mode==='normal'){
    const preLimit=Math.min(arr.length,Math.floor(Math.max(limit*1.4,limit+500)));
    const src=arr.slice(0,preLimit);
    const keep=[];

    outer: for(const st of src){
      const checkMax=Math.min(keep.length,320);
      for(let i=0;i<checkMax;i++){
        const k=keep[i];

        // 正確性優先：
        // 生命力だけでなく、取得済み特殊能力bitも同じ状態だけを支配判定する。
          if(sameScope(k,st) && leq(k.cost,st.cost) && k.score>=st.score){
            continue outer;
        }
      }
      keep.push(st);
      if(keep.length>=limit) break;
    }

    const m=new Map();
    keep.forEach(st=>{
      delete st.totalCost;
      m.set(stateKey(st),st);
    });
    TARGET_DEBUG.pruneEvents.push({
      mode,
      before:states.size,
      after:m.size,
      targetBefore,
      targetAfter:countTargetStates(m),
      routeBefore,
      routeAfter:targetRouteProfile(m)
    });
    return m;
  }

  // 正確性優先版：
  // 同じ「生命力 + 特殊能力bit」の中だけで、低コスト・高査定の状態を支配判定する。
  // 生命力が同じでも取得済み特殊能力が違う状態は、今後の選択肢が違うため別物として残す。
  const preLimit=Math.min(arr.length,Math.max(limit*4,limit+2600));
  const src=arr.slice(0,preLimit);
  const avgExp=src.length?src.reduce((sum,st)=>sum+st.totalCost,0)/src.length:0;
  const EXACT_CHECK_LIMIT=avgExp>1500?1200:900;
  const BUCKET_SIZE=avgExp>1500?70:45;
  const BUCKET_KEEP_LIMIT=avgExp>1500?220:150;

  const keep=[];
  const skylineByScope=new Map();
  const buckets=new Map();

  function bucketKey(st){
    const c=st.cost;
    return Math.floor(c[0]/BUCKET_SIZE)+','+
      Math.floor(c[1]/BUCKET_SIZE)+','+
      Math.floor(c[2]/BUCKET_SIZE)+','+
      Math.floor(c[3]/BUCKET_SIZE)+','+
      Math.floor(c[4]/BUCKET_SIZE)+'|'+pruneScopeKey(st);
  }

  function nearbyBucketKeys(st){
    const c=st.cost;
    const base=[
      Math.floor(c[0]/BUCKET_SIZE),
      Math.floor(c[1]/BUCKET_SIZE),
      Math.floor(c[2]/BUCKET_SIZE),
      Math.floor(c[3]/BUCKET_SIZE),
      Math.floor(c[4]/BUCKET_SIZE)
    ];
    const scope=pruneScopeKey(st);
    const keys=[];
    for(let mask=0;mask<32;mask++){
      const b0=base[0]-((mask&1)?1:0);
      const b1=base[1]-((mask&2)?1:0);
      const b2=base[2]-((mask&4)?1:0);
      const b3=base[3]-((mask&8)?1:0);
      const b4=base[4]-((mask&16)?1:0);
      if(b0<0||b1<0||b2<0||b3<0||b4<0) continue;
      keys.push(b0+','+b1+','+b2+','+b3+','+b4+'|'+scope);
    }
    return keys;
  }

  function dominatedBySkyline(st){
    const list=skylineByScope.get(pruneScopeKey(st));
    if(!list) return false;
    const max=Math.min(list.length,EXACT_CHECK_LIMIT);
    for(let i=0;i<max;i++){
      const k=list[i];

      // 支配には「査定以上」かつ「総コスト以下」が最低条件。
      // 満たさない候補では5項目のコスト比較を行わない。
      if(k.score<st.score) break;
      if(k.totalCost>st.totalCost) continue;

      if(leq(k.cost,st.cost)){
        return true;
      }
    }
    return false;
  }

  function addToSkyline(st){
    const scope=pruneScopeKey(st);
    let list=skylineByScope.get(scope);
    if(!list){list=[]; skylineByScope.set(scope,list);}

    // arrは「査定の高い順、同査定なら総コストの低い順」で処理される。
    // そのため、後から来た状態が既存状態を支配して追い出すケースは実質発生しない。
    // ここで全件比較すると膨大な無駄になるため、登録だけ行う。
    list.push(st);
  }

  outer: for(const st of src){
    if(dominatedBySkyline(st)) continue;

    const keys=nearbyBucketKeys(st);
    for(const bk of keys){
      const list=buckets.get(bk);
      if(!list) continue;
      for(const k of list){

        // bucket内でも、支配の最低条件を満たさない候補は即スキップ。
        if(k.score<st.score) continue;
        if(k.totalCost>st.totalCost) continue;

          if(leq(k.cost,st.cost)){
            continue outer;
        }
      }
    }

    keep.push(st);
    addToSkyline(st);

    const bk=bucketKey(st);
    let list=buckets.get(bk);
    if(!list){list=[]; buckets.set(bk,list);}

    if(list.length<BUCKET_KEEP_LIMIT){
      list.push(st);
    }else{
      let worstIdx=0;
      let worst=list[0];
      for(let wi=1;wi<list.length;wi++){
        const cand=list[wi];
        if(cand.score<worst.score || (cand.score===worst.score && cand.totalCost>worst.totalCost)){
          worst=cand;
          worstIdx=wi;
        }
      }
      if(st.score>worst.score || (st.score===worst.score && st.totalCost<worst.totalCost)){
        list[worstIdx]=st;
      }
    }

    if(keep.length>=limit) break;
  }

  const m=new Map();
  keep.forEach(st=>{
    delete st.totalCost;
    m.set(stateKey(st),st);
  });
  TARGET_DEBUG.pruneEvents.push({
    mode,
    before:states.size,
    after:m.size,
    targetBefore,
    targetAfter:countTargetStates(m),
    routeBefore,
    routeAfter:targetRouteProfile(m)
  });
  return m;
}
const rangeRowCache=new WeakMap();
function rowsForTable(table){
  if(rangeRowCache.has(table)) return rangeRowCache.get(table);
  const rows=table.map(r=>({row:r,range:parseRange(r[0])})).filter(x=>x.range);
  rangeRowCache.set(table,rows);
  return rows;
}
function rowForValue(table,value){
  for(const x of rowsForTable(table)){
    if(value>=x.range.a && value<x.range.b) return x.row;
  }
  return null;
}
function basicCostVector(name,costRow,hint){
  // 生命力テーブルだけ、査定列を含むため必要経験点は3列目以降。
  // それ以外の基本能力は1列目以降が5種類の必要経験点。
  const raw = name==='生命力' ? [costRow[3],costRow[4],costRow[5],costRow[6],costRow[7]] : [costRow[1],costRow[2],costRow[3],costRow[4],costRow[5]];
  const nums = raw.map(x=>Number(x));
  if(nums.some(x=>!Number.isFinite(x))) return null;
  return nums.map(x=>costAfter(x,hint,true));
}
function basicOptions(name,exp){
  const lim=limits();
  const inp=document.getElementById('basic_'+name);
  const cur=Number(inp?.value||1);
  const hint=Number(basicHints[name]||0);
  const max=lim[name];
  if(basicOwned[name]) return [{cost:[0,0,0,0,0],score:0,items:EMPTY_ITEMS,itemLen:0,life: name==='生命力'?max:null,costSum:0,eff:0}];
  const t=tableFor(name);
  const opts=[{cost:[0,0,0,0,0],score:0,items:EMPTY_ITEMS,itemLen:0,life:name==='生命力'?cur:null,costSum:0,eff:0}];
  let c=[0,0,0,0,0], sc=0;
  let v=cur;
  while(max!=null && v<max){
    const costRow=rowForValue(t.cost,v);
    const scoreRow=rowForValue(t.score,v);
    if(!costRow || !scoreRow) break;
    const step=basicCostVector(name,costRow,hint);
    if(!step) break;
    c=addCost(c,step);
    sc += Number(scoreRow[2]||0);
    v += 1;
    if(leq(c,exp)){
      const cs=costSum(c);
      opts.push({
        cost:c.slice(),
        score:sc,
        items:[{type:'basic',name,from:cur,to:v,idx:basicNames.indexOf(name)}],
        itemLen:1,
        life:name==='生命力'?v:null,
        costSum:cs,
        eff:sc/(1+cs)
      });
    }
  }
  return opts;
}
function basicPlanEntry(name,exp){
  const opts=basicOptions(name,exp);
  let bestEff=0;
  let bestScore=0;
  for(const op of opts){
    if(op.eff>bestEff) bestEff=op.eff;
    if(op.score>bestScore) bestScore=op.score;
  }
  // 生命力はHP依存特殊能力に効くので、同効率なら少し早めに探索する。
  const priority=bestEff+(name==='生命力'?0.0001:0);
  return {name,opts,priority,bestScore};
}
function buildBasicStates(exp){
  const initialLife=Number(document.getElementById('basic_生命力')?.value||1);
  const init=makeState([0,0,0,0,0],0,initialLife,null,EMPTY_ITEMS,0,EMPTY_BITS);
  let states=new Map([[stateKey(init),init]]);

  // v4.5: 基礎能力は固定順ではなく、査定効率が高い能力から探索する。
  // 表示順は resultTable 側でゲーム順に戻すので、結果表示には影響しない。
  const plan=basicNames
    .map(name=>basicPlanEntry(name,exp))
    .sort((a,b)=>{
      if(b.priority!==a.priority) return b.priority-a.priority;
      return basicNames.indexOf(a.name)-basicNames.indexOf(b.name);
    });

  for(const entry of plan){
    const next=new Map();

    for(const st of states.values()){
      for(const op of entry.opts){
        const nc=addCost(st.cost,op.cost);
        if(!leq(nc,exp)) continue;

        const newScore=st.score+op.score;
        const newLife=op.life!==null?op.life:st.life;
        const k=key(nc)+'|'+(newLife==null?'':Number(newLife).toString(36));
        const old=next.get(k);
        const newItemLen=itemLenOf(st)+(op.itemLen ?? op.items.length);

        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))) continue;

        next.set(k,makeState(nc,newScore,newLife,st,op.items,newItemLen,null,k));
      }
    }

    if(!next.size) continue;
    states=next.size>6200 ? prune(next,6200) : next;
    if(!states.size) break;
  }

  return states;
}
const specialItemCache=new Map();
const specialGroupCache=new Map();
const filteredSpecialGroupCache=new Map();
const orderedSpecialGroupCache=new Map();
const calcResultCache=new Map();
function clearCalcCaches(){
  specialItemCache.clear();
  specialGroupCache.clear();
  filteredSpecialGroupCache.clear();
  orderedSpecialGroupCache.clear();
  // 診断版ではprevチェーンが必要なため、itemsだけの結果キャッシュを再利用しない。
  calcResultCache.clear();
}
function calcCacheKey(exp){
  const basicPart=basicNames.map(n=>{
    const v=document.getElementById('basic_'+n)?.value||'';
    return [n,v,basicOwned[n]?1:0,basicHints[n]||0].join(':');
  }).join('|');
  const specialPart=[...specialState.entries()]
    .filter(([,st])=>Number(st.hint||0)>0 || Number(st.own||0)>0)
    .sort((a,b)=>Number(a[0])-Number(b[0]))
    .map(([i,st])=>i+':'+(st.hint||0)+':'+(st.own||0))
    .join('|');
  return [academy.value,job.value,currentCalcMode(),key(exp),basicPart,specialPart].join('||');
}
function cloneResult(st){
  const items=restoreItems(st);
  return {
    cost:(st.cost||[0,0,0,0,0]).slice(),
    score:st.score||0,
    life:st.life??null,
    items:items.map(x=>({...x})),
    itemLen:itemLenOf(st),
    bits:st.bits ?? specialItemsBits(items),
    usedCost:st.usedCost ?? costSum(st.cost||[0,0,0,0,0])
  };
}
function getCachedResult(cacheKey){
  const hit=calcResultCache.get(cacheKey);
  return hit?cloneResult(hit):null;
}
function setCachedResult(cacheKey,result){
  if(calcResultCache.size>30){
    const first=calcResultCache.keys().next().value;
    calcResultCache.delete(first);
  }
  calcResultCache.set(cacheKey,cloneResult(result));
}
function itemForSpecialIndex(i,hp,includeLower=false){
  const s=D.special[i]; if(!s) return null;
  const cacheKey=[i,hp,includeLower?1:0,specialHint(i),specialOwned(i)?1:0].join('|');
  if(specialItemCache.has(cacheKey)){
    return specialItemCache.get(cacheKey);
  }

  const score=skillScore(s,hp);
  if(score<=0){
    if(String(s[1])===TARGET_DEBUG_NAME){
      TARGET_DEBUG.index=i;
      TARGET_DEBUG.hint=specialHint(i);
      TARGET_DEBUG.owned=specialOwned(i);
      TARGET_DEBUG.generated=false;
      TARGET_DEBUG.score=score;
      TARGET_DEBUG.notes.push('査定値が0以下のため候補生成されなかった');
    }
    specialItemCache.set(cacheKey,null);
    return null;
  }

  const hint=specialHint(i);
  const rawCosts=[s[3],s[4],s[5],s[6],s[7]].map(c=>Number(c||0));
  const costs=rawCosts.map(c=>costAfter(c,hint,false));

  if(String(s[1])===TARGET_DEBUG_NAME){
    TARGET_DEBUG.index=i;
    TARGET_DEBUG.hint=hint;
    TARGET_DEBUG.owned=specialOwned(i);
    TARGET_DEBUG.generated=true;
    TARGET_DEBUG.score=score;
    TARGET_DEBUG.rawCost=rawCosts.slice();
    TARGET_DEBUG.discountedCost=costs.slice();
  }

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
function specialChoiceGroups(hp){
  const used=new Set(); const groups=[];
  D.special.forEach((s,i)=>{
    if(used.has(i)) return;
    const ui=upperIndex(i);
    const li=lowerIndex(i);
    if(li>=0) return;
    if(ui>=0){
      used.add(i); used.add(ui);
      const opts=[];
      if(!specialOwned(i)){
        const lower=itemForSpecialIndex(i,hp,false); if(lower) opts.push(lower);
        if(!specialOwned(ui)){const upper=itemForSpecialIndex(ui,hp,true); if(upper) opts.push(upper);}
      }else if(!specialOwned(ui)){
        const upperOnly=itemForSpecialIndex(ui,hp,false); if(upperOnly) opts.push(upperOnly);
      }
      if(opts.length) groups.push({kind:'pair',base:baseNameOfSkill(i),opts});
    }
  });
  mutualGroups.forEach(g=>{
    const opts=[];
    const already=g.some(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); return i>=0 && specialOwned(i);});
    if(!already){
      g.forEach(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(i>=0 && !used.has(i) && !specialOwned(i)){const it=itemForSpecialIndex(i,hp,false); if(it) opts.push(it); used.add(i);}});
    }else{
      g.forEach(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(i>=0) used.add(i);});
    }
    if(opts.length) groups.push({kind:'mutual',opts});
  });
  D.special.forEach((s,i)=>{
    if(used.has(i) || specialOwned(i)) return;
    if(isUpperSpecial(i)) return;
    const it=itemForSpecialIndex(i,hp,false); if(it) groups.push({kind:'single',opts:[it]});
  });
  groups.forEach((g,gi)=>{
    if(g.opts.some(op=>op.items?.some(it=>String(it.name)===TARGET_DEBUG_NAME))){
      TARGET_DEBUG.grouped=true;
      TARGET_DEBUG.groupIndex=gi;
      TARGET_DEBUG.groupKind=g.kind||'';
    }
  });
  return groups;
}
function specialChoiceGroupsCached(hp){
  const k=String(hp);
  if(specialGroupCache.has(k)) return specialGroupCache.get(k);

  // v4.5: 特殊能力候補はHPごとに事前整形・事前ソートしてキャッシュする。
  // 計算本体では原則ソートし直さず、フィルタだけ行う。
  const groups=specialChoiceGroups(hp)
    .map(g=>{
      const opts=g.opts.map(op=>{
        const cs=costSum(op.cost);
        const bits=op.bits ?? specialItemsBits(op.items);
        return {...op,bits,conflictBits:op.conflictBits ?? conflictBitsFor(bits),costSum:cs,eff:op.score/(1+cs)};
      }).sort((a,b)=>{
        if(b.eff!==a.eff) return b.eff-a.eff;
        return b.score-a.score;
      });
      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce((m,o)=>Math.max(m,o.eff),0);
      return {...g,opts,maxScore,bestEfficiency};
    })
    .filter(g=>g.opts.length>0)
    .sort((a,b)=>{
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  specialGroupCache.set(k,groups);
  return groups;
}
function impossibleChoice(op,exp){return !leq(op.cost,exp);}
function specialChoiceGroupsForExpCached(hp,exp,preGroups=null){
  const cacheKey=String(hp)+'|'+key(exp);
  if(filteredSpecialGroupCache.has(cacheKey)){
    return filteredSpecialGroupCache.get(cacheKey);
  }

  const source=preGroups||specialChoiceGroupsCached(hp);
  const groups=source
    .map(g=>{
      const opts=g.opts.filter(op=>!impossibleChoice(op,exp));
      if(!opts.length) return null;

      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce(
        (m,o)=>Math.max(m,o.eff ?? (o.score/(1+(o.costSum??costSum(o.cost))))),
        0
      );

      return {...g,opts,maxScore,bestEfficiency};
    })
    .filter(Boolean)
    .sort((a,b)=>{
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  filteredSpecialGroupCache.set(cacheKey,groups);
  return groups;
}

function progressMessage(progress){
  if(!progress) return '計算中';
  const pct=Math.min(99,Math.floor(progress.done/progress.total*100));
  const d=progress.debug;
  if(d){
    return `計算中 ${pct}% / 候補:${d.candidate} 採用:${d.accept} UB:${d.ubCut} prune:${d.prune||0}`;
  }
  return `計算中 ${pct}%`;
}
function currentCalcMode(){
  return document.getElementById('calcMode')?.value || 'high';
}
function calcModeLabel(){
  return currentCalcMode()==='fast' ? '高速β' : '高精度';
}
function ensureCancelButton(){
  let cancelBtn=document.getElementById('cancelCalcBtn');
  if(cancelBtn) return cancelBtn;

  const calcBtn=document.getElementById('calcBtn');
  cancelBtn=document.createElement('button');
  cancelBtn.id='cancelCalcBtn';
  cancelBtn.type='button';
  cancelBtn.className='secondary';
  cancelBtn.textContent='キャンセル';
  cancelBtn.setAttribute('aria-label','計算をキャンセル');
  cancelBtn.setAttribute('aria-disabled','false');
  cancelBtn.style.display='none';
  cancelBtn.style.setProperty('pointer-events','auto','important');
  cancelBtn.style.setProperty('opacity','1','important');
  cancelBtn.style.setProperty('position','relative','important');
  cancelBtn.style.setProperty('z-index','2147483647','important');
  cancelBtn.style.setProperty('touch-action','manipulation','important');
  cancelBtn.style.setProperty('-webkit-tap-highlight-color','rgba(0,0,0,0)','important');
  cancelBtn.style.setProperty('background','#344054','important');
  cancelBtn.style.setProperty('color','#ffffff','important');
  cancelBtn.style.setProperty('border','2px solid #1d2939','important');
  cancelBtn.style.setProperty('box-shadow','0 3px 0 rgba(16,24,40,.22)','important');
  cancelBtn.style.setProperty('filter','none','important');
  cancelBtn.style.setProperty('font-weight','700','important');

  calcBtn.insertAdjacentElement('afterend',cancelBtn);

  const requestCancel=(ev)=>{
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    if(!isCalculating || cancelRequested) return;

    cancelRequested=true;
    cancelBtn.disabled=false;
    cancelBtn.setAttribute('aria-disabled','false');
    cancelBtn.textContent='キャンセル中…';
    cancelBtn.style.setProperty('background','#1d2939','important');
    cancelBtn.style.setProperty('color','#ffffff','important');
    cancelBtn.style.setProperty('opacity','1','important');
    cancelBtn.style.setProperty('filter','none','important');
  };

  cancelBtn.addEventListener('pointerdown',requestCancel,{passive:false});
  cancelBtn.addEventListener('touchstart',requestCancel,{passive:false});
  cancelBtn.addEventListener('click',requestCancel,{passive:false});

  return cancelBtn;
}

function renderCalcMode(){
  const btn=document.getElementById('calcBtn');
  if(!btn || document.getElementById('calcMode')) return;

  const wrap=document.createElement('div');
  wrap.className='calc-mode-wrap';
  wrap.innerHTML=`
    <label for="calcMode">計算モード</label>
    <select id="calcMode">
      <option value="high" selected>高精度（推奨）</option>
      <option value="fast">高速β（検証用）</option>
    </select>
  `;

  btn.parentNode.insertBefore(wrap,btn);
  wrap.querySelector('#calcMode')?.addEventListener('change',()=>{
    calcResultCache.clear();
  });
}
function groupEfficiency(g){
  return g.bestEfficiency ?? g.opts.reduce((m,o)=>Math.max(m,o.eff ?? (o.score/(1+(o.costSum??costSum(o.cost)))),0),0);
}
function optionHasTarget(op){
  return !!op?.items?.some(it=>String(it?.name)===TARGET_DEBUG_NAME);
}
function constrainSpecialGroups(groups,constraint){
  let out=groups.map(g=>({...g,opts:[...g.opts]}));

  if(constraint==='forbidden'){
    out=out
      .map(g=>{
        const opts=g.opts.filter(op=>!optionHasTarget(op));
        if(!opts.length) return null;
        const maxScore=opts.reduce((m,o)=>Math.max(m,o.score||0),0);
        const bestEfficiency=opts.reduce((m,o)=>Math.max(m,o.eff ?? ((o.score||0)/(1+(o.costSum??costSum(o.cost))))),0);
        return {...g,opts,maxScore,bestEfficiency};
      })
      .filter(Boolean);
  }

  if(constraint==='required'){
    const targetIndex=out.findIndex(g=>g.opts.some(optionHasTarget));
    if(targetIndex<0) return {groups:[],targetGroupIndex:-1};
    const targetGroup=out[targetIndex];
    out=[targetGroup,...out.slice(0,targetIndex),...out.slice(targetIndex+1)];
    return {groups:out,targetGroupIndex:0};
  }

  return {groups:out,targetGroupIndex:-1};
}
async function optimizeSpecialsForLife(baseStates, exp, hp, onProgress, progress, preGroups=null, targetConstraint='normal'){
  let groups=specialChoiceGroupsForExpCached(hp,exp,preGroups);

  const targetOp=(()=>{
    for(const g of groups){
      for(const op of g.opts){
        if(op.items?.some(it=>String(it.name)===TARGET_DEBUG_NAME)) return op;
      }
    }
    return null;
  })();

  const totalExp=costSum(exp);
  const mode=currentCalcMode();

  // 知力余り対策を含む最終候補順まで、HP + 経験点条件ごとにキャッシュする。
  const orderedCacheKey=String(hp)+'|'+key(exp)+'|'+targetConstraint;
  const orderedCached=orderedSpecialGroupCache.get(orderedCacheKey);
  if(orderedCached){
    groups=orderedCached;
  }else{
    function balancePenalty(cost){
      let p=0;
      for(let i=0;i<5;i++){
        const remain=exp[i]-cost[i];
        p += remain*remain;
      }
      return p;
    }

    groups=groups.map(g=>{
      const opts=[...g.opts].sort((a,b)=>{
        if((b.eff||0)!==(a.eff||0)) return (b.eff||0)-(a.eff||0);
        if(b.score!==a.score) return b.score-a.score;
        return balancePenalty(a.cost)-balancePenalty(b.cost);
      });
      return {...g,opts};
    });

    orderedSpecialGroupCache.set(orderedCacheKey,groups);
  }

  const constrainedGroupInfo=constrainSpecialGroups(groups,targetConstraint);
  groups=constrainedGroupInfo.groups;
  const requiredTargetGroupIndex=constrainedGroupInfo.targetGroupIndex;

  if(targetConstraint==='required' && requiredTargetGroupIndex<0){
    return null;
  }

  // v4.5: 事前ソートと上界枝刈りを前提に、高精度は少しだけ保持数を絞る。
  const STATE_LIMIT=(mode==='high'||mode==='fast')
    ? Math.max(2400,Math.min(6800,1700+Math.floor(totalExp*0.9)))
    : Math.max(700,Math.min(1800,500+Math.floor(totalExp*0.45)));
  // 高速化：
  // 正確性優先の修正で候補が増えるため、途中pruneの発火を少し遅らせる。
  // STATE_LIMIT自体は変えず、HARD_LIMITだけ広げてprune回数を減らす。
  const HARD_LIMIT=Math.floor(STATE_LIMIT*((mode==='high'||mode==='fast')?1.6:1.35));

  // ③ Upper Bound: 残りグループで取り得る最大査定を安全側に足し、
  // すでにベストへ届かない状態は早めにスキップする。
  const suffixMax=new Array(groups.length+1).fill(0);
  const suffixBestEff=new Array(groups.length+1).fill(0);
  for(let i=groups.length-1;i>=0;i--){
    suffixMax[i]=suffixMax[i+1]+(groups[i].maxScore||0);
    suffixBestEff[i]=Math.max(suffixBestEff[i+1],groupEfficiency(groups[i]));
  }

  function remainingCostSum(st){
    return totalExp-(st.usedCost ?? costSum(st.cost));
  }

  // Sprint: Upper Bound軽量化。
  // 残経験点は配列ではなく合計値だけで扱い、同じ条件のUpper Boundはキャッシュする。
  const upperBoundCaches=Array.from({length:groups.length+1},()=>new Map());
  function remainingScoreUpper(start,remainSum){
    const byGroup=suffixMax[start]||0;

    // 高精度は安全な上界だけを使う。
    // 残りグループの最大査定合計は必ず実現可能値以上なので、正解候補を落とさない。
    if(mode!=='fast') return byGroup;

    const cache=upperBoundCaches[start];
    const cached=cache.get(remainSum);
    if(cached!==undefined) return cached;

    // 高速βだけ、効率ベースの近似上界を使う。
    const byEfficiency=remainSum*(suffixBestEff[start]||0)*1.00;
    const v=byGroup<byEfficiency ? byGroup : byEfficiency;
    cache.set(remainSum,v);
    return v;
  }

  let states=new Map();

  for(const base of baseStates){
    if(!base) continue;
    const st=base;
    if(st._remainSum===undefined) st._remainSum=remainingCostSum(st);
    const k=stateKey(st);
    if(better(st,states.get(k))) states.set(k,st);
  }

  if(!states.size){
    return {items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
  }

  if(states.size>STATE_LIMIT) states=prune(states,STATE_LIMIT);
  let bestScore=-Infinity;
  for(const st of states.values()){
    if(st.score>bestScore) bestScore=st.score;
  }

  const debug=progress?.debug||null;
  const exp0=exp[0], exp1=exp[1], exp2=exp[2], exp3=exp[3], exp4=exp[4];
  const yieldEvery=mode==='fast' ? 2500 : 600;

  for(let gi=0;gi<groups.length;gi++){
    throwIfCancelled();
    const group=groups[gi];

    const beforeTargetNoMagic=[...states.values()].filter(isTargetNoMagicState);
    const diagnoseMutual=
      group.kind==='mutual' &&
      beforeTargetNoMagic.length>0 &&
      !TARGET_DEBUG.mutualTransition;

    const trackedNoMagicKeys=diagnoseMutual
      ? new Set(beforeTargetNoMagic.map(stateKey))
      : null;

    const mutualDiag=diagnoseMutual ? {
      gi,
      kind:group.kind||'',
      optionNames:group.opts.map(op=>op.items.map(it=>String(it.name)).join('+')),
      beforeTotal:states.size,
      beforeNoMagic:beforeTargetNoMagic.length,
      beforeBest:beforeTargetNoMagic.reduce((m,s)=>!m||s.score>m.score?s:m,null),
      overwritten:0,
      overwrittenByTargetMagic:0,
      overwrittenExamples:[],
      internalPruneLoss:0,
      finalPruneLoss:0,
      beforeFinalPrune:0,
      afterTotal:0,
      afterNoMagic:0,
      afterBest:null
    } : null;

    const next=new Map(states);
    let iter=0;
    let candidateInc=0;
    let acceptInc=0;
    let ubCutInc=0;
    let dupCutInc=0;
    let pruneInc=0;


    for(const st of states.values()){
      if((iter&255)===0) throwIfCancelled();
      // この状態から残り全部を最高値で取っても届かないならスキップ。
      if(st.score+suffixMax[gi]<bestScore){
        ubCutInc++;
        iter++;
        if(iter%yieldEvery===0) await yieldToBrowser();
        continue;
      }

      // 残経験点込みの上界でも届かないなら、より早く枝刈りする。
      const remainSum=st._remainSum;
      if(st.score+remainingScoreUpper(gi,remainSum)<bestScore){
        ubCutInc++;
        iter++;
        if(iter%yieldEvery===0) await yieldToBrowser();
        continue;
      }

      const stBits=st.bits ?? EMPTY_BITS;

      for(const op of group.opts){
        candidateInc++;
        if((candidateInc&127)===0){
          throwIfCancelled();
        }
        const isTargetOp=op.items?.some(it=>String(it.name)===TARGET_DEBUG_NAME);
        if(isTargetOp) TARGET_DEBUG.considered++;
        const opBits=op.bits;
        if((stBits & opBits)!==EMPTY_BITS){
          if(isTargetOp) TARGET_DEBUG.duplicateCut++;
          continue;
        }
        if((stBits & op.conflictBits)!==EMPTY_BITS){
          if(isTargetOp) TARGET_DEBUG.conflictCut++;
          continue;
        }

        const c=st.cost;
        const oc=op.cost;
        const n0=c[0]+oc[0];
        if(n0>exp0){
          if(isTargetOp) TARGET_DEBUG.notes.push('経験点不足:筋力');
          continue;
        }
        const n1=c[1]+oc[1];
        if(n1>exp1){
          if(isTargetOp) TARGET_DEBUG.notes.push('経験点不足:敏捷');
          continue;
        }
        const n2=c[2]+oc[2];
        if(n2>exp2){
          if(isTargetOp) TARGET_DEBUG.notes.push('経験点不足:技術');
          continue;
        }
        const n3=c[3]+oc[3];
        if(n3>exp3){
          if(isTargetOp) TARGET_DEBUG.notes.push('経験点不足:知力');
          continue;
        }
        const n4=c[4]+oc[4];
        if(n4>exp4){
          if(isTargetOp) TARGET_DEBUG.notes.push('経験点不足:精神');
          continue;
        }

        const nc=[n0,n1,n2,n3,n4];
        if(isTargetOp) TARGET_DEBUG.feasible++;
        const newScore=st.score+op.score;
        const childRemainSum=remainSum-op.costSum;
        if(newScore+remainingScoreUpper(gi+1,childRemainSum)<bestScore){
          ubCutInc++;
          if(isTargetOp) TARGET_DEBUG.ubCut++;
          continue;
        }
        if(newScore>bestScore) bestScore=newScore;

        // v5.0: 同一状態は生成直後に統合する。
        // items配列の結合は「採用される可能性がある状態」だけに限定する。
        const nextBits=stBits | opBits;
        const k=key(nc)+'|'+scopeKeyFor(st.life,nextBits);
        const old=next.get(k);
        const newItemLen=itemLenOf(st)+(op.itemLen ?? op.items.length);

        const addedMagicForDecision=op.items.find(it=>
          it?.type==='basic' &&
          String(it.name||'')==='魔力' &&
          Number(it.to)>Number(it.from)
        );

        if(
          addedMagicForDecision &&
          stateHasTarget(st) &&
          !TARGET_DEBUG.magicDecisionSnapshot
        ){
          TARGET_DEBUG.magicDecisionSnapshot={
            gi,
            groupKind:group.kind||'',
            parentKey:stateKey(st),
            parentScore:Number(st.score),
            parentCost:st.cost.slice(),
            parentItems:restoreItems(st).map(traceItemLabel),
            selectedKey:k,
            selectedLabel:candidateCategory(op),
            rows:[]
          };
        }

        const activeDecision=TARGET_DEBUG.magicDecisionSnapshot;
        if(
          activeDecision &&
          activeDecision.gi===gi &&
          activeDecision.parentKey===stateKey(st)
        ){
          const label=candidateCategory(op);
          const gain=Number(newScore)-Number(st.score);
          const costArr=op.cost.slice();
          const sum=op.costSum;
          activeDecision.rows.push({
            label,
            newScore:Number(newScore),
            gain,
            cost:costArr,
            costSum:sum,
            efficiency:sum>0?gain/sum:null,
            selected:k===activeDecision.selectedKey
          });
        }

        if(!TARGET_DEBUG.magicAcquisitionTrace){
          const addedMagic=op.items.find(it=>
            it?.type==='basic' &&
            String(it.name||'')==='魔力' &&
            Number(it.to)>Number(it.from)
          );
          if(addedMagic && stateHasTarget(st)){
            const preview=makeState(
              nc,
              newScore,
              st.life,
              st,
              op.items,
              newItemLen,
              opBits,
              k,
              (st.usedCost ?? costSum(st.cost))+op.costSum
            );
            const rankInfo=topScoreRank(next,newScore);
            TARGET_DEBUG.magicAcquisitionTrace={
              gi,
              groupKind:group.kind||'',
              parentScore:Number(st.score),
              newScore:Number(newScore),
              scoreGain:Number(newScore)-Number(st.score),
              addedItem:traceItemLabel(addedMagic),
              addedCost:op.cost.slice(),
              addedCostSum:op.costSum,
              efficiency:op.costSum>0?(Number(newScore)-Number(st.score))/op.costSum:null,
              rank:rankInfo.rank,
              rankTotal:rankInfo.total,
              parentItems:restoreItems(st).map(traceItemLabel),
              newItems:restoreItems(preview).map(traceItemLabel),
              stateKey:k,
              parentHasTarget:stateHasTarget(st),
              parentHasMagic:diagnosisHasMagicRaise(restoreItems(st))
            };
          }
        }

        if(mutualDiag && old && trackedNoMagicKeys.has(k) && isTargetNoMagicState(old)){
          const generatedPreview=makeState(
            nc,
            newScore,
            st.life,
            st,
            op.items,
            newItemLen,
            opBits,
            k,
            (st.usedCost ?? costSum(st.cost))+op.costSum
          );
          if(!isTargetNoMagicState(generatedPreview)){
            mutualDiag.overwritten++;
            if(stateHasTarget(generatedPreview)) mutualDiag.overwrittenByTargetMagic++;
            if(mutualDiag.overwrittenExamples.length<2){
              mutualDiag.overwrittenExamples.push(
                `旧[${briefState(old)}] → 新[${briefState(generatedPreview)}]`
              );
            }
          }
        }

        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))){
          dupCutInc++;
          if(isTargetOp) TARGET_DEBUG.duplicateCut++;
          continue;
        }

        const newState=makeState(
          nc,
          newScore,
          st.life,
          st,
          op.items,
          newItemLen,
          opBits,
          k,
          (st.usedCost ?? costSum(st.cost))+op.costSum
        );
        newState._remainSum=childRemainSum;
        newState._groupIndex=gi;
        newState._groupKind=group.kind||'';
        acceptInc++;
        next.set(k,newState);
      }

      if(next.size>HARD_LIMIT){
        pruneInc++;

        let beforeTracked=0;
        if(mutualDiag){
          for(const k of trackedNoMagicKeys) if(next.has(k)) beforeTracked++;
        }

        const pruned=prune(next,STATE_LIMIT);

        if(mutualDiag){
          let afterTracked=0;
          for(const k of trackedNoMagicKeys) if(pruned.has(k)) afterTracked++;
          mutualDiag.internalPruneLoss += Math.max(0,beforeTracked-afterTracked);
        }

        next.clear();
        pruned.forEach((v,k)=>next.set(k,v));
      }

      iter++;
      if(iter%yieldEvery===0) await yieldToBrowser();
    }

    // 支配除外がほぼ発生しないため、状態数が上限を超えた時だけpruneする。
    if(mutualDiag){
      mutualDiag.beforeFinalPrune=[...next.values()].filter(isTargetNoMagicState).length;
    }

    if(next.size>STATE_LIMIT){
      pruneInc++;

      let beforeTracked=0;
      if(mutualDiag){
        for(const k of trackedNoMagicKeys) if(next.has(k)) beforeTracked++;
      }

      states=prune(next,STATE_LIMIT);

      if(mutualDiag){
        let afterTracked=0;
        for(const k of trackedNoMagicKeys) if(states.has(k)) afterTracked++;
        mutualDiag.finalPruneLoss=Math.max(0,beforeTracked-afterTracked);
      }
    }else{
      states=next;
    }

    // 独立した「物理攻撃○必須」探索では、対象グループを最初に処理し、
    // その直後に○を含まない状態を除外する。以降は全保持枠を○ありルートだけで使う。
    if(targetConstraint==='required' && gi===requiredTargetGroupIndex){
      const requiredStates=new Map();
      for(const st of states.values()){
        if(stateHasTarget(st)) requiredStates.set(stateKey(st),st);
      }
      states=requiredStates;
      if(!states.size) return null;
      bestScore=-Infinity;
      for(const st of states.values()) if(st.score>bestScore) bestScore=st.score;
    }

    if(
      TARGET_DEBUG.magicDecisionSnapshot &&
      TARGET_DEBUG.magicDecisionSnapshot.gi===gi
    ){
      const snap=TARGET_DEBUG.magicDecisionSnapshot;

      if(!snap.rows.some(r=>r.label==='何もしない')){
        snap.rows.push({
          label:'何もしない',
          newScore:snap.parentScore,
          gain:0,
          cost:[0,0,0,0,0],
          costSum:0,
          efficiency:null,
          selected:false
        });
      }

      const priority=['魔力','生命力','器用さ','パワー','耐久力','精神力',TARGET_DEBUG_NAME,'何もしない'];
      const seen=new Set();
      snap.rows=snap.rows
        .sort((a,b)=>{
          const pa=priority.includes(a.label)?priority.indexOf(a.label):99;
          const pb=priority.includes(b.label)?priority.indexOf(b.label):99;
          if(pa!==pb) return pa-pb;
          return b.newScore-a.newScore;
        })
        .filter(r=>{
          const key=`${r.label}|${r.newScore}|${r.cost.join(',')}`;
          if(seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0,12);
    }

    if(mutualDiag){
      const afterNoMagicStates=[...states.values()].filter(isTargetNoMagicState);
      mutualDiag.afterTotal=states.size;
      mutualDiag.afterNoMagic=afterNoMagicStates.length;
      mutualDiag.afterBest=afterNoMagicStates.reduce((m,s)=>!m||s.score>m.score?s:m,null);
      TARGET_DEBUG.mutualTransition=mutualDiag;
    }
    for(const st of states.values()){
      if(st.score>bestScore) bestScore=st.score;
    }

    TARGET_DEBUG.groupSnapshots.push({
      gi,
      groupKind:group.kind||'',
      stateCount:states.size,
      targetCount:countTargetStates(states),
      bestScore
    });

    const routeProfile=targetRouteProfile(states);
    TARGET_DEBUG.routeGroupSnapshots.push({
      gi,
      groupKind:group.kind||'',
      stateCount:states.size,
      profile:routeProfile
    });

    if(debug){
      debug.candidate+=candidateInc;
      debug.accept+=acceptInc;
      debug.ubCut+=ubCutInc;
      debug.dupCut+=dupCutInc;
      debug.prune+=pruneInc;
    }

    if(progress){
      progress.done++;
      onProgress?.(progressMessage(progress));
    }else{
      onProgress?.('計算中');
    }

    if(mode!=='fast' || gi%4===3 || gi===groups.length-1){
      await yieldToBrowser();
    }
  }

  let best=null;
  TARGET_DEBUG.finalStatesWithTarget=countTargetStates(states);

  let bestWithTarget=null;
  let bestWithoutTarget=null;
  let bestAugmentable=null;
  let augmentableCount=0;
  let augmentableStateAlreadyExists=0;

  if(targetOp){
    const targetBits=targetOp.bits??specialItemsBits(targetOp.items);
    const targetConflict=targetOp.conflictBits??EMPTY_BITS;
    const targetCost=targetOp.cost;

    for(const st of states.values()){
      if(stateHasTarget(st)) continue;

      const stBits=st.bits??EMPTY_BITS;
      if((stBits&targetBits)!==EMPTY_BITS) continue;
      if((stBits&targetConflict)!==EMPTY_BITS) continue;

      const nc=addCost(st.cost,targetCost);
      if(!leq(nc,exp)) continue;

      augmentableCount++;
      const hypotheticalScore=st.score+targetOp.score;
      const hypotheticalItemLen=itemLenOf(st)+(targetOp.itemLen??targetOp.items.length);
      const nextBits=stBits|targetBits;
      const expectedKey=key(nc)+'|'+scopeKeyFor(st.life,nextBits);
      const exists=states.has(expectedKey);
      if(exists) augmentableStateAlreadyExists++;

      const cand={
        baseScore:st.score,
        hypotheticalScore,
        baseItemLen:itemLenOf(st),
        hypotheticalItemLen,
        baseCost:(st.cost||[]).slice(),
        newCost:nc.slice(),
        exists
      };

      if(
        !bestAugmentable ||
        hypotheticalScore>bestAugmentable.hypotheticalScore ||
        (
          hypotheticalScore===bestAugmentable.hypotheticalScore &&
          hypotheticalItemLen<bestAugmentable.hypotheticalItemLen
        )
      ){
        bestAugmentable=cand;
      }
    }
  }

  TARGET_DEBUG.augmentChecks.push({
    hp,
    targetOpFound:!!targetOp,
    augmentableCount,
    augmentableStateAlreadyExists,
    bestAugmentable
  });

  if(
    bestAugmentable &&
    (
      !TARGET_DEBUG.bestAugmentable ||
      bestAugmentable.hypotheticalScore>TARGET_DEBUG.bestAugmentable.hypotheticalScore ||
      (
        bestAugmentable.hypotheticalScore===TARGET_DEBUG.bestAugmentable.hypotheticalScore &&
        bestAugmentable.hypotheticalItemLen<TARGET_DEBUG.bestAugmentable.hypotheticalItemLen
      )
    )
  ){
    TARGET_DEBUG.bestAugmentable={hp,...bestAugmentable};
  }

  for(const st of states.values()){
    if(stateHasTarget(st)){
      if(better(st,bestWithTarget)) bestWithTarget=st;
    }else{
      if(better(st,bestWithoutTarget)) bestWithoutTarget=st;
    }

    if(better(st,best)) best=st;
  }

  TARGET_DEBUG._bestWithState=bestWithTarget;
  TARGET_DEBUG._bestWithoutState=bestWithoutTarget;

  TARGET_DEBUG.bestWithTarget=bestWithTarget ? {
    score:bestWithTarget.score,
    itemLen:itemLenOf(bestWithTarget),
    cost:(bestWithTarget.cost||[]).slice()
  } : null;

  TARGET_DEBUG.bestWithoutTarget=bestWithoutTarget ? {
    score:bestWithoutTarget.score,
    itemLen:itemLenOf(bestWithoutTarget),
    cost:(bestWithoutTarget.cost||[]).slice()
  } : null;

  TARGET_DEBUG.selectedScore=best?.score ?? null;
  TARGET_DEBUG.selectedItemLen=best ? itemLenOf(best) : null;
  TARGET_DEBUG.selectedHasTarget=!!best && stateHasTarget(best);

  return best||{items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
}
async function optimizeAsync(exp,onProgress,targetConstraint='normal'){
  await yieldToBrowser();
  onProgress?.('計算中 0%');

  const fallback={items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:Number(document.getElementById('basic_生命力')?.value||1)};

  pStart("基本能力生成");
  const basicMap=buildBasicStates(exp);
  pEnd("基本能力生成");
  const basicStates=[...basicMap.values()];

  if(!basicStates.length){
    onProgress?.('計算中 100%');
    return fallback;
  }

  await yieldToBrowser();

  const byLife=new Map();
  basicStates.forEach(st=>{
    const life=st.life||Number(document.getElementById('basic_生命力')?.value||1);
    const hp=currentHpForLife(life);
    if(!byLife.has(hp)) byLife.set(hp,[]);
    byLife.get(hp).push(st);
  });

  const tasks=[];
  let total=0;

  for(const [hp,statesRaw] of byLife.entries()){
    const baseMap=new Map();

    statesRaw.forEach(st=>{
      const k=stateKey(st);
      if(better(st,baseMap.get(k))) baseMap.set(k,st);
    });

    const states=[...(baseMap.size>6200 ? prune(baseMap,6200) : baseMap).values()];
    if(!states.length) continue;

    const groups=specialChoiceGroupsCached(hp);
    const groupCount=groups.filter(g=>g.opts.some(op=>!impossibleChoice(op,exp))).length || 1;

    total+=groupCount;
    tasks.push({hp,states,groupCount,groups});
  }

  if(!tasks.length){
    onProgress?.('計算中 100%');
    return fallback;
  }

  const progress={done:0,total:Math.max(1,total),start:Date.now(),debug:{candidate:0,accept:0,ubCut:0,dupCut:0,prune:0}};
  let best=null;
  let globalBestWithTarget=null;
  let globalBestWithoutTarget=null;
  TARGET_DEBUG.taskSummaries=[];

  for(const task of tasks){
    throwIfCancelled();
    pStart("特殊能力探索");
    const cand=await optimizeSpecialsForLife(task.states,exp,task.hp,onProgress,progress,task.groups,targetConstraint);
    pEnd("特殊能力探索");

    const taskBestWith=TARGET_DEBUG._bestWithState;
    const taskBestWithout=TARGET_DEBUG._bestWithoutState;

    if(taskBestWith && better(taskBestWith,globalBestWithTarget)){
      globalBestWithTarget=taskBestWith;
    }
    if(taskBestWithout && better(taskBestWithout,globalBestWithoutTarget)){
      globalBestWithoutTarget=taskBestWithout;
    }

    TARGET_DEBUG.taskSummaries.push({
      hp:task.hp,
      selectedScore:cand?.score ?? null,
      selectedHasTarget:!!cand && stateHasTarget(cand),
      bestWithScore:taskBestWith?.score ?? null,
      bestWithoutScore:taskBestWithout?.score ?? null
    });

    if(cand && better(cand,best)){
      best=cand;
    }

    if(currentCalcMode()!=='fast') await yieldToBrowser();
  }

  // 診断表示は、各HPタスク内ではなく全タスク横断の最終比較へ統一する。
  TARGET_DEBUG._bestWithState=globalBestWithTarget;
  TARGET_DEBUG._bestWithoutState=globalBestWithoutTarget;
  TARGET_DEBUG.bestWithTarget=globalBestWithTarget ? {
    score:globalBestWithTarget.score,
    itemLen:itemLenOf(globalBestWithTarget),
    cost:(globalBestWithTarget.cost||[]).slice()
  } : null;
  TARGET_DEBUG.bestWithoutTarget=globalBestWithoutTarget ? {
    score:globalBestWithoutTarget.score,
    itemLen:itemLenOf(globalBestWithoutTarget),
    cost:(globalBestWithoutTarget.cost||[]).slice()
  } : null;
  TARGET_DEBUG.finalStatesWithTarget=globalBestWithTarget ? 1 : 0;
  TARGET_DEBUG.selectedScore=best?.score ?? null;
  TARGET_DEBUG.selectedItemLen=best ? itemLenOf(best) : null;
  TARGET_DEBUG.selectedHasTarget=!!best && stateHasTarget(best);

  const rawWithTrace=inspectStateChain(globalBestWithTarget);
  const rawWithoutTrace=inspectStateChain(globalBestWithoutTarget);
  const rawSelectedTrace=inspectStateChain(best);

  const withChainTrace=inspectChainNodes(globalBestWithTarget);
  const selectedChainTrace=inspectChainNodes(best);

  TARGET_DEBUG.finalCandidateTrace={
    selectedIsWith:!!best && best===globalBestWithTarget,
    selectedIsWithout:!!best && best===globalBestWithoutTarget,
    selectedScore:best?.score ?? null,
    selectedCost:best?.cost ? best.cost.slice() : null,
    selectedStateKey:best?stateKey(best):null,

    withScore:globalBestWithTarget?.score ?? null,
    withCost:globalBestWithTarget?.cost ? globalBestWithTarget.cost.slice() : null,
    withStateKey:globalBestWithTarget?stateKey(globalBestWithTarget):null,
    withRawItems:rawWithTrace.items,
    withRawHasTarget:diagnosisHasTarget(rawWithTrace.items),
    withRawHasMagic:diagnosisHasMagicRaise(rawWithTrace.items),
    withCycle:rawWithTrace.cycle,
    withNodes:rawWithTrace.nodeCount,
    withChoices:rawWithTrace.choiceCount,
    withCachedBefore:rawWithTrace.cachedItems,
    withChain:withChainTrace,

    withoutScore:globalBestWithoutTarget?.score ?? null,
    withoutCost:globalBestWithoutTarget?.cost ? globalBestWithoutTarget.cost.slice() : null,
    withoutStateKey:globalBestWithoutTarget?stateKey(globalBestWithoutTarget):null,
    withoutRawItems:rawWithoutTrace.items,
    withoutRawHasTarget:diagnosisHasTarget(rawWithoutTrace.items),
    withoutRawHasMagic:diagnosisHasMagicRaise(rawWithoutTrace.items),

    selectedRawItems:rawSelectedTrace.items,
    selectedRawHasTarget:diagnosisHasTarget(rawSelectedTrace.items),
    selectedRawHasMagic:diagnosisHasMagicRaise(rawSelectedTrace.items),
    selectedCycle:rawSelectedTrace.cycle,
    selectedNodes:rawSelectedTrace.nodeCount,
    selectedChoices:rawSelectedTrace.choiceCount,
    selectedCachedBefore:rawSelectedTrace.cachedItems,
    selectedChain:selectedChainTrace
  };

  // 診断は途中で最初に見つけた候補ではなく、実際に最終採用されたチェーンから作り直す。
  // これによりN6候補比較と最終候補チェーンの参照先を統一する。
  TARGET_DEBUG.magicDecisionSnapshot=buildSelectedChainDecision(selectedChainTrace,6);

  const candidateDiff=compareDebugItems(globalBestWithTarget,globalBestWithoutTarget);
  TARGET_DEBUG.withOnlyItems=candidateDiff.withOnly;
  TARGET_DEBUG.withoutOnlyItems=candidateDiff.withoutOnly;
  TARGET_DEBUG.withOnlyDetails=candidateDiff.withOnlyDetails;
  TARGET_DEBUG.withoutOnlyDetails=candidateDiff.withoutOnlyDetails;

  const currentJob=String(job?.value||'');
  const suspicious=[];
  const withItemsForWarning=globalBestWithTarget ? restoreItems(globalBestWithTarget) : [];

  for(const it of withItemsForWarning){
    if(it?.type!=='basic') continue;
    const name=String(it.name||'');

    if(['剣士','重戦士','弓使い'].includes(currentJob) && name==='魔力'){
      suspicious.push(`${currentJob}で魔力 ${it.from}→${it.to} を選択`);
    }
    if(['魔法使い','僧侶','魔闘士'].includes(currentJob) && name==='パワー'){
      suspicious.push(`${currentJob}でパワー ${it.from}→${it.to} を選択`);
    }
  }

  TARGET_DEBUG.suspiciousBasicWarnings=suspicious;
  TARGET_DEBUG.withCost=globalBestWithTarget?.cost ? globalBestWithTarget.cost.slice() : null;
  TARGET_DEBUG.withoutCost=globalBestWithoutTarget?.cost ? globalBestWithoutTarget.cost.slice() : null;
  TARGET_DEBUG.costDiff=(
    TARGET_DEBUG.withCost && TARGET_DEBUG.withoutCost
      ? TARGET_DEBUG.withCost.map((v,i)=>v-TARGET_DEBUG.withoutCost[i])
      : null
  );
  TARGET_DEBUG.withLife=globalBestWithTarget?.life ?? null;
  TARGET_DEBUG.withoutLife=globalBestWithoutTarget?.life ?? null;

  onProgress?.('計算中 100%');
  return best||fallback;
}
function resultTable(items,kind){
  let filtered=items.filter(x=>x.type===kind);
  if(kind==='special'){
    let chosenBits=EMPTY_BITS;
    filtered.forEach(x=>{ if(Number.isFinite(Number(x.idx))) chosenBits|=specialBit(Number(x.idx)); });
    filtered=filtered.filter(x=>{const ui=upperIndex(x.idx); return !(ui>=0 && (chosenBits & specialBit(ui))!==EMPTY_BITS);});
  }
  if(!filtered.length) return '<p>追加なし</p>';
  const sorted=filtered.sort((a,b)=>{
    if(kind==='basic') return (a.idx??0)-(b.idx??0);
    return (a.idx??0)-(b.idx??0);
  });
  const rows=sorted.map(c=>`<tr><td>${kind==='basic'?`${c.name} ${c.from}→${c.to}`:renderSkillName(c.name)}</td></tr>`).join('');
  return `<table class="result-table"><tbody>${rows}</tbody></table>`;
}
function validateInputs(){
  const errs=[];
  if(!academy.value){errs.push('アカデミー及びジョブを選択してください。'); return errs;}
  if(!job.value) errs.push('ジョブを選択してください。');
  expNames.forEach(n=>{
    const v=document.getElementById('exp_'+n)?.value;
    if(v==='' || v==null){errs.push(`${n}経験点を入力してください。`); return;}
    const num=Number(v);
    if(!Number.isFinite(num) || num<0) errs.push(`${n}経験点は0以上の値を入力してください。`);
    if(num>1000) errs.push(`${n}経験点は1000以下の値を入力してください。`);
  });
  const lim=limits();
  basicNames.forEach(n=>{
    const v=document.getElementById('basic_'+n)?.value;
    if(!basicOwned[n] && (v==='' || v==null)){errs.push(`${n}を入力してください。`); return;}
    if(v!=='' && v!=null){
      const num=Number(v);
      if(!Number.isFinite(num) || num<1) errs.push(`${n}は1以上の値を入力してください。`);
      if(lim[n]!=null && num>lim[n]) errs.push(`${n}は入力上限を超えています。`);
    }
  });
  return errs;
}
async function calc(){
  clearCalcCaches();
  TARGET_DEBUG.reset();
  pReset();
  validateAllInline();
  const result=document.getElementById('result');
  const errs=validateInputs();
  if(errs.length){result.innerHTML=`<div class="error-box">${errs.map(e=>`<p>⚠️ ${e}</p>`).join('')}</div>`; return;}
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const startTime=performance.now();
  const btn=document.getElementById('calcBtn');
  const cancelBtn=ensureCancelButton();
  const cacheKey=calcCacheKey(exp);
  let lastProgressMessage='';
  let lastDetailedProgress='';
  cancelRequested=false;
  isCalculating=true;
  document.body.classList.add('is-calculating');
  document.querySelectorAll('button,input,select').forEach(el=>{
    if(el.id!=='calcBtn' && el.id!=='cancelCalcBtn') el.disabled=true;
  });
  btn.disabled=true;
  btn.textContent='計算中';
  cancelBtn.disabled=false;
  cancelBtn.textContent='キャンセル';
  cancelBtn.style.display='';
  cancelBtn.style.setProperty('pointer-events','auto','important');
  cancelBtn.style.setProperty('opacity','1','important');
  cancelBtn.style.setProperty('z-index','2147483647','important');
  cancelBtn.style.setProperty('background','#344054','important');
  cancelBtn.style.setProperty('color','#ffffff','important');
  cancelBtn.style.setProperty('border','2px solid #1d2939','important');
  cancelBtn.style.setProperty('box-shadow','0 3px 0 rgba(16,24,40,.22)','important');
  cancelBtn.style.setProperty('filter','none','important');

  let cancelParent=cancelBtn.parentElement;
  while(cancelParent && cancelParent!==document.body){
    cancelParent.style.setProperty('pointer-events','auto','important');
    cancelParent=cancelParent.parentElement;
  }

  result.innerHTML='<p class="calculating">計算中</p>';
  try{
    // まず物理攻撃○必須を完全に独立した探索として実行する。
    // 対象グループを最初に処理した直後、○なし状態を全除外するため、
    // 以降のprune保持枠はすべて○ありルート専用になる。
    activeTargetConstraint='required';
    clearCalcCaches();
    TARGET_DEBUG.reset();
    const requiredCandidateRaw=await optimizeAsync(exp,(msg)=>{
      const shown=`○必須検証：${msg}`;
      btn.textContent=shown;
      result.innerHTML=`<p class="calculating">${shown}</p>`;
    },'required');
    const independentRequired=(requiredCandidateRaw && stateHasTarget(requiredCandidateRaw))
      ? cloneResult(requiredCandidateRaw)
      : null;

    // 通常探索を最後に実行し、画面表示・チェーン診断は通常結果の情報だけで作る。
    activeTargetConstraint='normal';
    clearCalcCaches();
    TARGET_DEBUG.reset();
    let best=await optimizeAsync(exp,(msg)=>{
      lastProgressMessage=msg;
      if(msg.includes('候補:') || msg.includes('UB:') || msg.includes('prune:')){
        lastDetailedProgress=msg;
      }
      const shown=`通常計算：${msg}`;
      btn.textContent=shown;
      result.innerHTML=`<p class="calculating">${shown}</p>`;
    },'normal');

    // 通常最適解が○なしなら、それ自体が「○禁止探索」の厳密な最高値になる。
    // 理由：○禁止集合は通常探索の部分集合で、通常最高解がその部分集合に含まれるため。
    const independentForbidden=(!stateHasTarget(best)) ? cloneResult(best) : null;
    // 最終表示・診断・キャッシュ保存で参照する候補をここで固定する。
    // 以降の通常結果表示では、○あり／なし比較用候補を直接参照しない。
    const finalCandidate=best;

    pStart("結果復元");
    const finalItems=restoreItems(finalCandidate);
    pEnd("結果復元");

    const finalTrace=TARGET_DEBUG.finalCandidateTrace||{};
    const selectedRawNow=inspectStateChain(finalCandidate);
    const withState=TARGET_DEBUG._bestWithState;
    const withRawNow=inspectStateChain(withState);
    const withRestoredNow=withState ? restoreItems(withState) : [];

    finalTrace.selectedRestoredItems=finalItems.slice();
    finalTrace.selectedRawItemsAfter=selectedRawNow.items;
    finalTrace.selectedRestoredHasTarget=diagnosisHasTarget(finalItems);
    finalTrace.selectedRestoredHasMagic=diagnosisHasMagicRaise(finalItems);
    finalTrace.selectedRawRestoredSame=
      JSON.stringify(itemNamesForDiagnosis(selectedRawNow.items))===
      JSON.stringify(itemNamesForDiagnosis(finalItems));

    finalTrace.withRawItemsAfter=withRawNow.items;
    finalTrace.withRestoredItems=withRestoredNow.slice();
    finalTrace.withRestoredHasTarget=diagnosisHasTarget(withRestoredNow);
    finalTrace.withRestoredHasMagic=diagnosisHasMagicRaise(withRestoredNow);
    finalTrace.withRawRestoredSame=
      JSON.stringify(itemNamesForDiagnosis(withRawNow.items))===
      JSON.stringify(itemNamesForDiagnosis(withRestoredNow));

    TARGET_DEBUG.finalCandidateTrace=finalTrace;

    finalCandidate.items=finalItems;
    TARGET_DEBUG.selected=finalItems.some(it=>String(it.name)===TARGET_DEBUG_NAME);
    TARGET_DEBUG.branchCandidateDiagnostics=buildBranchCandidateDiagnostics(finalCandidate,exp,5,8);
    setCachedResult(cacheKey,finalCandidate);

    const elapsed=((performance.now()-startTime)/1000).toFixed(2);
    const remain=exp.map((v,i)=>v-(finalCandidate.cost?.[i]||0));
    const remainHtml=`<div class="result-block"><h3>残経験点</h3><table class="result-table remain-table"><tbody>${expNames.map((n,i)=>`<tr><td>${n}</td><td>${remain[i]}</td></tr>`).join('')}</tbody></table></div>`;
    const rawCostText=TARGET_DEBUG.rawCost?TARGET_DEBUG.rawCost.join(','):'未生成';
    const discountedCostText=TARGET_DEBUG.discountedCost?TARGET_DEBUG.discountedCost.join(','):'未生成';
    const targetNotes=[...new Set(TARGET_DEBUG.notes)].slice(0,8).join(' / ')||'なし';
    const snapshotText=TARGET_DEBUG.groupSnapshots
      .map(x=>`G${x.gi}:${x.targetCount}/${x.stateCount}`)
      .join(' → ')||'なし';
    const pruneText=TARGET_DEBUG.pruneEvents
      .map((x,i)=>`P${i+1}:${x.targetBefore}→${x.targetAfter} / 全体${x.before}→${x.after}`)
      .join(' | ')||'なし';

    const routeRows=TARGET_DEBUG.routeGroupSnapshots||[];
    const routeKeys=[
      ['target','物理攻撃○付き'],
      ['targetNoMagic','魔力なし'],
      ['targetNoMagicDex60','魔力なし＋器用60'],
      ['targetNoMagicLife52','魔力なし＋生命52'],
      ['targetNoMagicDexOrLife','有力ルート']
    ];

    function routeLifeSummary(key,label){
      const first=routeRows.find(x=>Number(x.profile?.[key]||0)>0);
      if(!first) return `${label}：一度も生成されず`;

      let firstZeroAfter=null;
      let lastPositive=first;
      let peakCount=0;
      let bestScore=null;

      for(const x of routeRows){
        const count=Number(x.profile?.[key]||0);
        if(count>0){
          lastPositive=x;
          peakCount=Math.max(peakCount,count);
          const scoreKey=key==='target'
            ? 'bestTarget'
            : key==='targetNoMagic'
              ? 'bestNoMagic'
              : 'bestNoMagicDexOrLife';
          const score=x.profile?.[scoreKey];
          if(score!=null && (bestScore==null || score>bestScore)) bestScore=score;
        }else if(x.gi>first.gi && lastPositive && x.gi>lastPositive.gi && !firstZeroAfter){
          firstZeroAfter=x;
        }
      }

      const generated=`初生成 G${first.gi}(${first.groupKind||'-'})`;
      const survived=firstZeroAfter
        ? `初消滅 G${firstZeroAfter.gi}(${firstZeroAfter.groupKind||'-'})`
        : `最終G${lastPositive.gi}まで生存`;
      const best=bestScore==null?'なし':Number(bestScore).toFixed(2).replace(/\.00$/,'');
      return `${label}：${generated} / ${survived} / 最大件数${peakCount} / 最高score ${best}`;
    }

    const routeGroupSummaryText=routeKeys
      .map(([key,label])=>routeLifeSummary(key,label))
      .join('<br>');

    const pruneDisappearances=[];
    TARGET_DEBUG.pruneEvents.forEach((x,i)=>{
      const b=x.routeBefore;
      const a=x.routeAfter;
      if(!b || !a) return;

      const lost=[];
      if(b.target>0 && a.target===0) lost.push('物理攻撃○付き');
      if(b.targetNoMagic>0 && a.targetNoMagic===0) lost.push('魔力なし');
      if(b.targetNoMagicDex60>0 && a.targetNoMagicDex60===0) lost.push('魔力なし＋器用60');
      if(b.targetNoMagicLife52>0 && a.targetNoMagicLife52===0) lost.push('魔力なし＋生命52');
      if(b.targetNoMagicDexOrLife>0 && a.targetNoMagicDexOrLife===0) lost.push('有力ルート');

      if(lost.length){
        pruneDisappearances.push(
          `P${i+1}（全体${x.before}→${x.after}）：${lost.join('・')}が消滅`
        );
      }
    });

    const routePruneSummaryText=pruneDisappearances.length
      ? pruneDisappearances.join('<br>')
      : '枝刈り直後に0件となった追跡ルートはなし';

    const firstUseful=routeRows.find(x=>Number(x.profile?.targetNoMagicDexOrLife||0)>0);
    const lastUseful=[...routeRows].reverse().find(x=>Number(x.profile?.targetNoMagicDexOrLife||0)>0);
    const firstUsefulZero=firstUseful
      ? routeRows.find(x=>x.gi>firstUseful.gi && Number(x.profile?.targetNoMagicDexOrLife||0)===0)
      : null;

    const routeCauseText=(()=>{
      if(!firstUseful) return '有力ルート自体が生成されていないため、候補生成条件または状態統合を優先確認';
      if(pruneDisappearances.some(s=>s.includes('有力ルート'))) return '有力ルートが枝刈りで消滅。prune順位・上限6200・状態評価を優先確認';
      if(firstUsefulZero) return `有力ルートはG${firstUsefulZero.gi}のグループ処理後に消滅。競合・重複・状態統合を優先確認`;
      return `有力ルートは最終G${lastUseful?.gi ?? firstUseful.gi}まで残存。最終比較または候補score算定を優先確認`;
    })();

    const lastUsefulScore=lastUseful?.profile?.bestNoMagicDexOrLife;
    const routeFinalText=lastUseful
      ? `最終到達 G${lastUseful.gi} / 件数${lastUseful.profile.targetNoMagicDexOrLife} / 最高score ${lastUsefulScore==null?'なし':Number(lastUsefulScore).toFixed(2).replace(/\.00$/,'')}`
      : '最終到達なし';

    const decision=TARGET_DEBUG.magicDecisionSnapshot;
    const decisionBest=decision?.rows?.slice().sort((a,b)=>b.newScore-a.newScore)[0]||null;
    const selectedDecision=decision?.rows?.find(r=>r.selected)||null;

    const decisionDiagnosis=(()=>{
      if(!decision) return '最終採用チェーンから比較対象を取得できず';
      if(!selectedDecision) return '最終採用ノードの特定に失敗';
      const nodeText=decision.chainNodeIndex==null?'対象ノード':`N${decision.chainNodeIndex}`;
      return `${nodeText}で「${selectedDecision.label}」を採用。表示内容は最終採用チェーンと同一`;
    })();

    const decisionDiagnosisHtml=`<div class="result-block">
      <h3>N6候補比較</h3>
      <table class="result-table">
        <tbody>
          <tr><td>親状態</td><td colspan="6">score ${decision?decision.parentScore.toFixed(2):'なし'} / cost ${decision?decision.parentCost.join(','):'なし'} / ${decision?decision.parentItems.slice(0,8).join(' / '):'なし'}</td></tr>
          <tr><td>判定</td><td colspan="6">${decisionDiagnosis}</td></tr>
        </tbody>
        <thead>
          <tr><th>#</th><th>候補</th><th>score</th><th>増加</th><th>cost</th><th>効率</th><th>結果</th></tr>
        </thead>
        <tbody>
          ${compactCandidateRows(decision?.rows||[])}
        </tbody>
      </table>
    </div>`;

    const trace=TARGET_DEBUG.finalCandidateTrace||{};
    const selectedChainText=compactChainText(trace.selectedChain);
    const displayedChainNodes=meaningfulChainNodes(trace.selectedChain);
    const magicNodeIndex=displayedChainNodes.findIndex(node=>
      node.choice.some(name=>String(name).startsWith('魔力 '))
    );

    const chainDiagnosis=(()=>{
      if(trace.selectedCycle) return '最終採用チェーンに循環あり';
      if(magicNodeIndex>=0){
        const node=displayedChainNodes[magicNodeIndex];
        return `最終採用候補では魔力をN${magicNodeIndex}で追加（${node.choice.join('・')}）`;
      }
      return '最終採用候補に魔力上昇なし';
    })();

    const magicDiagnosisHtml=`<div class="result-block">
      <h3>最終候補チェーン</h3>
      <table class="result-table"><tbody>
        <tr><td>判定</td><td>${chainDiagnosis}</td></tr>
        <tr><td>最終採用チェーン</td><td>${selectedChainText}</td></tr>
      </tbody></table>
    </div>`;

    const f=v=>v==null?'なし':Number(v).toFixed(2).replace(/\.00$/,'');
    const c=v=>Array.isArray(v)?v.join(','):'なし';

    const finalDiagnosis=(()=>{
      if(trace.selectedCycle){
        return '最終採用候補のprevチェーンに循環あり';
      }
      if(trace.selectedRawRestoredSame===false){
        return '最終採用候補の生チェーンと復元結果が不一致';
      }
      if(trace.selectedRestoredHasTarget!==trace.selectedRawHasTarget){
        return '最終採用候補で物理攻撃○の有無が復元前後で不一致';
      }
      if(trace.selectedRestoredHasMagic!==trace.selectedRawHasMagic){
        return '最終採用候補で魔力上昇の有無が復元前後で不一致';
      }
      return '最終採用候補・チェーン表示・復元結果は一致';
    })();

    const compactDiagnosisHtml=`<div class="result-block">
      <h3>最終候補診断</h3>
      <table class="result-table"><tbody>
        <tr><td>最終採用</td><td>${trace.selectedIsWith?'物理攻撃○側':trace.selectedIsWithout?'物理攻撃○なし側':'別候補'} / score ${f(trace.selectedScore)} / cost ${c(trace.selectedCost)}</td></tr>
        <tr><td>○側候補</td><td>score ${f(trace.withScore)} / cost ${c(trace.withCost)}</td></tr>
        <tr><td>選択時の最終候補</td><td>物理攻撃○:${trace.selectedRawHasTarget?'あり':'なし'} / 魔力上昇:${trace.selectedRawHasMagic?'あり':'なし'} / itemsキャッシュ:${trace.selectedCachedBefore?'あり':'なし'}</td></tr>
        <tr><td>復元後の最終候補</td><td>物理攻撃○:${trace.selectedRestoredHasTarget?'あり':'なし'} / 魔力上昇:${trace.selectedRestoredHasMagic?'あり':'なし'} / 生チェーンと一致:${trace.selectedRawRestoredSame?'はい':'いいえ'}</td></tr>
        <tr><td>最終候補の能力</td><td>${shortDiagnosisItems(trace.selectedRestoredItems||trace.selectedRawItems)}</td></tr>
        <tr><td>チェーン</td><td>ノード${trace.selectedNodes??'なし'} / 選択項目${trace.selectedChoices??'なし'} / 循環:${trace.selectedCycle?'あり':'なし'}</td></tr>
        <tr><td>判定</td><td>${finalDiagnosis}</td></tr>
      </tbody></table>
    </div>`;

    const requiredState=independentRequired;
    const forbiddenState=independentForbidden;
    const bestWith=requiredState ? {
      score:requiredState.score,
      itemLen:itemLenOf(requiredState),
      cost:(requiredState.cost||[]).slice()
    } : null;
    const bestWithout=forbiddenState ? {
      score:forbiddenState.score,
      itemLen:itemLenOf(forbiddenState),
      cost:(forbiddenState.cost||[]).slice()
    } : null;
    const fmtScore=v=>Number.isFinite(Number(v))
      ? Number(v).toFixed(2).replace(/\.00$/,'')
      : 'なし';
    const withScoreText=bestWith ? fmtScore(bestWith.score) : 'なし';
    const withoutScoreText=bestWithout ? fmtScore(bestWithout.score) : 'なし';
    const scoreDiff=(bestWith&&bestWithout) ? (bestWith.score-bestWithout.score) : null;
    const scoreDiffText=scoreDiff==null ? '比較不可' : fmtScore(scoreDiff);

    const independentDiff=compareDebugItems(requiredState,forbiddenState);
    const withOnlyText=independentDiff.withOnly.length
      ? independentDiff.withOnly.join(' / ')
      : 'なし';
    const withoutOnlyText=independentDiff.withoutOnly.length
      ? independentDiff.withoutOnly.join(' / ')
      : 'なし';
    const withCostText=requiredState?.cost ? requiredState.cost.join(',') : 'なし';
    const withoutCostText=forbiddenState?.cost ? forbiddenState.cost.join(',') : 'なし';

    const finalDisplayLabels=itemNamesForDiagnosis(finalItems);
    const traceDisplayLabels=itemNamesForDiagnosis(
      trace.selectedRestoredItems||trace.selectedRawItems||[]
    );
    const finalDisplayMatchesTrace=
      JSON.stringify(finalDisplayLabels)===JSON.stringify(traceDisplayLabels);

    const constrainedExpected=(()=>{
      if(requiredState && forbiddenState) return better(requiredState,forbiddenState)?requiredState:forbiddenState;
      return requiredState||forbiddenState||null;
    })();
    const constrainedMatchesNormal=!!constrainedExpected &&
      Number(constrainedExpected.score)===Number(finalCandidate.score) &&
      stateHasTarget(constrainedExpected)===stateHasTarget(finalCandidate) &&
      JSON.stringify(constrainedExpected.cost||[])===JSON.stringify(finalCandidate.cost||[]);

    const targetCompareDiagnosis=(()=>{
      if(!bestWith) return '○必須の独立探索で候補を取得できず';
      if(!bestWithout) return '通常結果が○ありのため、○禁止の独立値は今回未算出';
      if(!constrainedMatchesNormal){
        return '通常結果と独立制約探索が不一致。探索途中の枝刈り・状態統合を要確認';
      }
      if(bestWith.score>bestWithout.score) return '○必須側が高査定。通常結果も○ありなら整合';
      if(bestWith.score<bestWithout.score) return '○必須ルートを専用保持枠で探索しても○禁止側が高査定。今回の条件では○なしが上';
      return '○必須側と○禁止側が同査定。item数またはMap順で決定';
    })();


    const branchCandidateHtml=(TARGET_DEBUG.branchCandidateDiagnostics||[]).map(d=>`<div class="result-block">
      <h3>N${d.nodeIndex} 分岐候補診断</h3>
      <table class="result-table">
        <tbody>
          <tr><td>親状態</td><td colspan="7">score ${fmtScore(d.parentScore)} / cost ${d.parentCost.join(',')}</td></tr>
          <tr><td>採用</td><td colspan="7">${d.selectedLabel}</td></tr>
          <tr><td>グループ</td><td colspan="7">G${d.groupIndex==null?'なし':d.groupIndex} / ${d.groupKind||'-'}${d.note?` / ${d.note}`:''}</td></tr>
        </tbody>
        <thead><tr><th>#</th><th>候補</th><th>score</th><th>増加</th><th>cost</th><th>効率</th><th>結果</th><th>理由</th></tr></thead>
        <tbody>${compactBranchCandidateRows(d.rows)}</tbody>
      </table>
    </div>`).join('');

    const targetCompareHtml=`<div class="result-block">
      <h3>物理攻撃○ 独立制約探索</h3>
      <table class="result-table"><tbody>
        <tr><td>検証方式</td><td>○必須は対象グループ処理後に○なし状態を全除外し、専用保持枠で独立探索</td></tr>
        <tr><td>通常結果</td><td>${stateHasTarget(finalCandidate)?'○あり':'○なし'} / score ${fmtScore(finalCandidate.score)} / cost ${finalCandidate.cost.join(',')}</td></tr>
        <tr><td>○必須・独立探索</td><td>score ${withScoreText} / cost ${withCostText}</td></tr>
        <tr><td>○禁止の最高</td><td>score ${withoutScoreText} / cost ${withoutCostText}</td></tr>
        <tr><td>査定差（あり−なし）</td><td>${scoreDiffText}</td></tr>
        <tr><td>○あり側だけ</td><td>${withOnlyText}</td></tr>
        <tr><td>○なし側だけ</td><td>${withoutOnlyText}</td></tr>
        <tr><td>通常結果との整合</td><td>${constrainedMatchesNormal?'一致':'不一致'}</td></tr>
        <tr><td>判定</td><td>${targetCompareDiagnosis}</td></tr>
      </tbody></table>
    </div>`;

    const displayReferenceHtml=`<div class="result-block">
      <h3>最終表示参照チェック</h3>
      <table class="result-table"><tbody>
        <tr><td>表示元</td><td>finalCandidate / finalItems に統一</td></tr>
        <tr><td>能力一覧と診断</td><td>${finalDisplayMatchesTrace?'一致':'不一致'}</td></tr>
        <tr><td>能力数</td><td>${finalItems.length}</td></tr>
      </tbody></table>
    </div>`;

    const finalDecisionReason=(()=>{
      if(!bestWith && !bestWithout) return '最終候補なし';
      if(bestWith && !bestWithout) return '物理攻撃○あり候補のみ';
      if(!bestWith && bestWithout) return '物理攻撃○なし候補のみ';
      if(bestWith.score>bestWithout.score) return '物理攻撃○ありのscoreが高い';
      if(bestWith.score<bestWithout.score) return '物理攻撃○なしのscoreが高い';
      if(bestWith.itemLen<bestWithout.itemLen) return '同scoreで、物理攻撃○ありのitem数が少ない';
      if(bestWith.itemLen>bestWithout.itemLen) return '同scoreで、物理攻撃○なしのitem数が少ない';
      return 'score・item数とも同じ（Map順で決定）';
    })();

    result.innerHTML=`
<div class="result-block">
  <h3>基本能力</h3>
  ${resultTable(finalItems,'basic')}
</div>

<div class="result-block">
  <h3>特殊能力</h3>
  ${resultTable(finalItems,'special')}
</div>
${remainHtml}

${decisionDiagnosisHtml}

${magicDiagnosisHtml}

${compactDiagnosisHtml}

${targetCompareHtml}

${branchCandidateHtml}

${displayReferenceHtml}

<div class="result-block">
  <h3>計算時間</h3>
  <p>${elapsed} 秒</p>
</div>
`;
  }catch(err){
    if(err?.name==='CalculationCancelledError'){
      result.innerHTML=`<div class="result-block">
        <p>計算をキャンセルしました。</p>
        <p>条件を変更して、もう一度「計算する」を押してください。</p>
      </div>`;
    }else{
      const name=err?.name||'Error';
      const message=err?.message||'原因不明のエラーです';

      result.innerHTML=`<div class="error-box">
        <p>⚠️ 計算中にエラーが発生しました。</p>
        <p>${name}</p>
        <p>${message}</p>
      </div>`;

      console.error(err);
    }
  }finally{
    isCalculating=false;
    document.body.classList.remove('is-calculating');
    document.querySelectorAll('button,input,select').forEach(el=>{ el.disabled=false; });
    job.disabled=!academy.value;
    basicNames.forEach(n=>applyBasicVisual(n));
    D.special.forEach((_,i)=>applySkillVisual(i));
    btn.disabled=false;
    btn.textContent='計算する';
    cancelBtn.disabled=false;
    cancelBtn.textContent='キャンセル';
    cancelBtn.style.display='none';
    cancelRequested=false;
  }
}
function resetAll(){
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value='';});

  academy.value='';
  updateJobs();

  Object.keys(basicOwned).forEach(k=>basicOwned[k]=false);
  Object.keys(basicHints).forEach(k=>basicHints[k]=0);

  specialState.clear();
  calcResultCache.clear();
  search.value='';

  renderBasic();
  renderSpecials();

  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}

document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
ensureCancelButton();
initAcademies(); renderExp(); renderBasic(); renderSpecials(); renderCalcMode(); validateAllInline();
})();
