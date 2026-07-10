(function(){
// Speed optimized v5: high-accuracy path overhead reduction; calculation progress is shown only on the button.
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
const ENABLE_INTERNAL_DIAGNOSTICS=false;
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
function key5(c0,c1,c2,c3,c4){
  return String(((((c0*1001+c1)*1001+c2)*1001+c3)*1001+c4));
}
function key(c){return key5(c[0],c[1],c[2],c[3],c[4]);}
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
  const arr=Array.from(states.values());
  arr.sort((a,b)=>{
    if(b.score!==a.score) return b.score-a.score;
    return a.usedCost-b.usedCost;
  });

  if(mode==='normal'){
    const preLimit=Math.min(arr.length,Math.floor(Math.max(limit*1.4,limit+500)));
    const keep=[];

    outer: for(let si=0;si<preLimit;si++){
      const st=arr[si];
      const stScope=pruneScopeKey(st);
      const checkMax=Math.min(keep.length,320);
      for(let i=0;i<checkMax;i++){
        const k=keep[i];
        if(pruneScopeKey(k)===stScope && leq(k.cost,st.cost) && k.score>=st.score){
          continue outer;
        }
      }
      keep.push(st);
      if(keep.length>=limit) break;
    }

    const m=new Map();
    for(let i=0;i<keep.length;i++){
      const st=keep[i];
      m.set(stateKey(st),st);
    }
    return m;
  }

  const preLimit=Math.min(arr.length,Math.max(limit*4,limit+2600));
  let usedTotal=0;
  for(let i=0;i<preLimit;i++) usedTotal+=arr[i].usedCost;
  const avgExp=preLimit?usedTotal/preLimit:0;
  const EXACT_CHECK_LIMIT=avgExp>1500?1200:900;
  const BUCKET_SIZE=avgExp>1500?70:45;
  const BUCKET_KEEP_LIMIT=avgExp>1500?220:150;
  const BUCKET_BASE=32;

  const keep=[];
  const skylineByScope=new Map();
  const bucketsByScope=new Map();

  function bucketCode(b0,b1,b2,b3,b4){
    return ((((b0*BUCKET_BASE+b1)*BUCKET_BASE+b2)*BUCKET_BASE+b3)*BUCKET_BASE+b4);
  }

  outer: for(let si=0;si<preLimit;si++){
    const st=arr[si];
    const scope=pruneScopeKey(st);
    const skyline=skylineByScope.get(scope);

    if(skyline){
      const max=Math.min(skyline.length,EXACT_CHECK_LIMIT);
      for(let i=0;i<max;i++){
        const k=skyline[i];
        if(k.score<st.score) break;
        if(k.usedCost>st.usedCost) continue;
        if(leq(k.cost,st.cost)) continue outer;
      }
    }

    const c=st.cost;
    const b0=Math.floor(c[0]/BUCKET_SIZE);
    const b1=Math.floor(c[1]/BUCKET_SIZE);
    const b2=Math.floor(c[2]/BUCKET_SIZE);
    const b3=Math.floor(c[3]/BUCKET_SIZE);
    const b4=Math.floor(c[4]/BUCKET_SIZE);
    const scopeBuckets=bucketsByScope.get(scope);

    if(scopeBuckets){
      for(let mask=0;mask<32;mask++){
        const n0=b0-((mask&1)?1:0);
        const n1=b1-((mask&2)?1:0);
        const n2=b2-((mask&4)?1:0);
        const n3=b3-((mask&8)?1:0);
        const n4=b4-((mask&16)?1:0);
        if(n0<0||n1<0||n2<0||n3<0||n4<0) continue;

        const list=scopeBuckets.get(bucketCode(n0,n1,n2,n3,n4));
        if(!list) continue;
        for(let i=0;i<list.length;i++){
          const k=list[i];
          if(k.score<st.score || k.usedCost>st.usedCost) continue;
          if(leq(k.cost,st.cost)) continue outer;
        }
      }
    }

    keep.push(st);

    if(skyline) skyline.push(st);
    else skylineByScope.set(scope,[st]);

    let activeBuckets=scopeBuckets;
    if(!activeBuckets){
      activeBuckets=new Map();
      bucketsByScope.set(scope,activeBuckets);
    }
    const code=bucketCode(b0,b1,b2,b3,b4);
    let list=activeBuckets.get(code);
    if(!list){
      list=[];
      activeBuckets.set(code,list);
    }

    if(list.length<BUCKET_KEEP_LIMIT){
      list.push(st);
    }else{
      let worstIdx=0;
      let worst=list[0];
      for(let wi=1;wi<list.length;wi++){
        const cand=list[wi];
        if(cand.score<worst.score || (cand.score===worst.score && cand.usedCost>worst.usedCost)){
          worst=cand;
          worstIdx=wi;
        }
      }
      if(st.score>worst.score || (st.score===worst.score && st.usedCost<worst.usedCost)){
        list[worstIdx]=st;
      }
    }

    if(keep.length>=limit) break;
  }

  const m=new Map();
  for(let i=0;i<keep.length;i++){
    const st=keep[i];
    m.set(stateKey(st),st);
  }
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
      const stItemLen=itemLenOf(st);
      for(const op of entry.opts){
        const nc=addCost(st.cost,op.cost);
        if(!leq(nc,exp)) continue;

        const newScore=st.score+op.score;
        const newLife=op.life!==null?op.life:st.life;
        const k=key(nc)+'|'+(newLife==null?'':Number(newLife).toString(36));
        const old=next.get(k);
        const newItemLen=stItemLen+(op.itemLen ?? op.items.length);

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
    if(ENABLE_INTERNAL_DIAGNOSTICS && String(s[1])===TARGET_DEBUG_NAME){
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

  if(ENABLE_INTERNAL_DIAGNOSTICS && String(s[1])===TARGET_DEBUG_NAME){
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
  if(ENABLE_INTERNAL_DIAGNOSTICS) groups.forEach((g,gi)=>{
    if(g.opts.some(op=>op.items?.some(it=>String(it.name)===TARGET_DEBUG_NAME))){
      TARGET_DEBUG.grouped=true;
      TARGET_DEBUG.groupIndex=gi;
      TARGET_DEBUG.groupKind=g.kind||'';
    }
  });
  return groups;
}
function specialOptionIsHpDependent(op){
  return !!op?.items?.some(it=>
    it?.type==='special' && Number(D.special[Number(it.idx)]?.[11]||0)!==0
  );
}
function specialGroupIsHpDependent(g){
  return !!g?.opts?.length && g.opts.every(specialOptionIsHpDependent);
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
        const ah=specialOptionIsHpDependent(a)?1:0;
        const bh=specialOptionIsHpDependent(b)?1:0;
        if(ah!==bh) return ah-bh;
        if(b.eff!==a.eff) return b.eff-a.eff;
        return b.score-a.score;
      });
      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce((m,o)=>Math.max(m,o.eff),0);
      const hpDependent=specialGroupIsHpDependent({opts});
      return {...g,opts,maxScore,bestEfficiency,hpDependent};
    })
    .filter(g=>g.opts.length>0)
    .sort((a,b)=>{
      if(!!a.hpDependent!==!!b.hpDependent) return a.hpDependent?1:-1;
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

      const hpDependent=specialGroupIsHpDependent({opts});
      return {...g,opts,maxScore,bestEfficiency,hpDependent};
    })
    .filter(Boolean)
    .sort((a,b)=>{
      if(!!a.hpDependent!==!!b.hpDependent) return a.hpDependent?1:-1;
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  filteredSpecialGroupCache.set(cacheKey,groups);
  return groups;
}

function progressMessage(progress){
  if(!progress) return '計算中';
  const pct=Math.min(99,Math.floor(progress.done/progress.total*100));
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
  const isRequired=String(constraint).startsWith('required');
  const keepNormalOrder=constraint==='requiredNormalOrder';

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

  if(isRequired){
    const targetIndex=out.findIndex(g=>g.opts.some(optionHasTarget));
    if(targetIndex<0) return {groups:[],targetGroupIndex:-1};
    if(keepNormalOrder){
      return {groups:out,targetGroupIndex:targetIndex};
    }
    const targetGroup=out[targetIndex];
    out=[targetGroup,...out.slice(0,targetIndex),...out.slice(targetIndex+1)];
    return {groups:out,targetGroupIndex:0};
  }

  return {groups:out,targetGroupIndex:-1};
}
async function optimizeSpecialsForLife(baseStates, exp, hp, onProgress, progress, preGroups=null, targetConstraint='normal'){
  let groups=specialChoiceGroupsForExpCached(hp,exp,preGroups);

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

  if(String(targetConstraint).startsWith('required') && requiredTargetGroupIndex<0){
    return null;
  }

  // v4.5: 事前ソートと上界枝刈りを前提に、高精度は少しだけ保持数を絞る。
  const baseStateLimit=(mode==='high'||mode==='fast')
    ? Math.max(2400,Math.min(6800,1700+Math.floor(totalExp*0.9)))
    : Math.max(700,Math.min(1800,500+Math.floor(totalExp*0.45)));
  // 最終完全性検証：
  // requiredNoUB はUpper Boundだけ無効、requiredFullはUpper Bound無効＋保持上限を大幅拡大する。
  const disableUpperBound=targetConstraint==='requiredNoUB' || targetConstraint==='requiredFull';
  const STATE_LIMIT=targetConstraint==='requiredFull'
    ? Math.max(120000,Math.floor(baseStateLimit*30))
    : baseStateLimit;
  // 高速化：
  // 正確性優先の修正で候補が増えるため、途中pruneの発火を少し遅らせる。
  // STATE_LIMIT自体は変えず、HARD_LIMITだけ広げてprune回数を減らす。
  const HARD_LIMIT=Math.floor(STATE_LIMIT*((mode==='high'||mode==='fast')?1.6:1.35));

  // Upper Bound高速化：
  // 高精度では安全なsuffixMaxだけを使う。従来は同じ上界を2回判定していたため一本化する。
  // 高速βでのみ効率ベース近似上界を追加し、整数の残経験点は配列キャッシュで再利用する。
  const groupCount=groups.length;
  const suffixMax=new Float64Array(groupCount+1);
  const useFastApproxUpper=!disableUpperBound && mode==='fast';
  const suffixBestEff=useFastApproxUpper ? new Float64Array(groupCount+1) : null;

  for(let i=groupCount-1;i>=0;i--){
    suffixMax[i]=suffixMax[i+1]+(groups[i].maxScore||0);
    if(useFastApproxUpper){
      const eff=groupEfficiency(groups[i]);
      suffixBestEff[i]=eff>suffixBestEff[i+1] ? eff : suffixBestEff[i+1];
    }
  }

  function remainingCostSum(st){
    return totalExp-(st.usedCost ?? costSum(st.cost));
  }

  const upperBoundCaches=useFastApproxUpper
    ? Array.from({length:groupCount+1},()=>{
        const cache=new Float64Array(totalExp+1);
        cache.fill(-1);
        return cache;
      })
    : null;

  function fastRemainingScoreUpper(start,remainSum){
    const safeRemain=remainSum<=0 ? 0 : (remainSum>=totalExp ? totalExp : remainSum|0);
    const cache=upperBoundCaches[start];
    const cached=cache[safeRemain];
    if(cached>=0) return cached;

    const byGroup=suffixMax[start];
    const byEfficiency=safeRemain*suffixBestEff[start];
    const value=byGroup<byEfficiency ? byGroup : byEfficiency;
    cache[safeRemain]=value;
    return value;
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

  const exp0=exp[0], exp1=exp[1], exp2=exp[2], exp3=exp[3], exp4=exp[4];
  const yieldEvery=mode==='fast' ? 7000 : 2400;

  for(let gi=0;gi<groups.length;gi++){
    throwIfCancelled();
    const group=groups[gi];
    const groupOpts=group.opts;

    let next=new Map(states);
    let iter=0;

    for(const st of states.values()){
      if((iter&255)===0) throwIfCancelled();
      const remainSum=st._remainSum;

      // 高精度は安全なsuffixMaxを1回だけ判定。
      // 高速βのみ、より厳しい効率ベース近似上界も追加する。
      if(!disableUpperBound){
        const upper=useFastApproxUpper
          ? fastRemainingScoreUpper(gi,remainSum)
          : suffixMax[gi];
        if(st.score+upper<bestScore){
          iter++;
          if(iter%yieldEvery===0) await yieldToBrowser();
          continue;
        }
      }

      const stBits=st.bits ?? EMPTY_BITS;

      const stItemLen=itemLenOf(st);
      for(let oi=0;oi<groupOpts.length;oi++){
        const op=groupOpts[oi];
        if((iter&127)===0) throwIfCancelled();
        const opBits=op.bits;
        if((stBits & opBits)!==EMPTY_BITS){
          continue;
        }
        if((stBits & op.conflictBits)!==EMPTY_BITS){
          continue;
        }

        const c=st.cost;
        const oc=op.cost;
        const n0=c[0]+oc[0];
        if(n0>exp0){
          continue;
        }
        const n1=c[1]+oc[1];
        if(n1>exp1){
          continue;
        }
        const n2=c[2]+oc[2];
        if(n2>exp2){
          continue;
        }
        const n3=c[3]+oc[3];
        if(n3>exp3){
          continue;
        }
        const n4=c[4]+oc[4];
        if(n4>exp4){
          continue;
        }

        const newScore=st.score+op.score;
        const childRemainSum=remainSum-op.costSum;
        if(!disableUpperBound){
          const childUpper=useFastApproxUpper
            ? fastRemainingScoreUpper(gi+1,childRemainSum)
            : suffixMax[gi+1];
          if(newScore+childUpper<bestScore) continue;
        }
        if(newScore>bestScore) bestScore=newScore;

        // v5.0: 同一状態は生成直後に統合する。
        // items配列の結合は「採用される可能性がある状態」だけに限定する。
        const nextBits=stBits | opBits;
        const k=key5(n0,n1,n2,n3,n4)+'|'+scopeKeyFor(st.life,nextBits);
        const old=next.get(k);
        const newItemLen=itemLenOf(st)+(op.itemLen ?? op.items.length);

        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))){
          continue;
        }

        const nc=[n0,n1,n2,n3,n4];
        const newState=makeState(
          nc,
          newScore,
          st.life,
          st,
          op.items,
          newItemLen,
          opBits,
          k,
          st.usedCost+op.costSum
        );
        newState._remainSum=childRemainSum;
        next.set(k,newState);
      }

      if(next.size>HARD_LIMIT){

        next=prune(next,STATE_LIMIT);
      }

      iter++;
      if(iter%yieldEvery===0) await yieldToBrowser();
    }

    // 支配除外がほぼ発生しないため、状態数が上限を超えた時だけpruneする。
    if(next.size>STATE_LIMIT){

      states=prune(next,STATE_LIMIT);
    }else{
      states=next;
    }

    // 独立した「物理攻撃○必須」探索では、対象グループを最初に処理し、
    // その直後に○を含まない状態を除外する。以降は全保持枠を○ありルートだけで使う。
    if(String(targetConstraint).startsWith('required') && gi===requiredTargetGroupIndex){
      const requiredStates=new Map();
      for(const st of states.values()){
        if(stateHasTarget(st)) requiredStates.set(stateKey(st),st);
      }
      states=requiredStates;
      if(!states.size) return null;
      bestScore=-Infinity;
      for(const st of states.values()) if(st.score>bestScore) bestScore=st.score;
    }

    for(const st of states.values()){
      if(st.score>bestScore) bestScore=st.score;
    }

    if(ENABLE_INTERNAL_DIAGNOSTICS){
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
    }


    if(progress){
      progress.done++;
      onProgress?.(progressMessage(progress));
    }else{
      onProgress?.('計算中');
    }

    if((gi&1)===1 || gi===groupCount-1){
      await yieldToBrowser();
    }
  }

  let best=null;
  for(const st of states.values()){
    if(better(st,best)) best=st;
  }

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

  const progress={done:0,total:Math.max(1,total),start:Date.now()};
  let best=null;

  for(const task of tasks){
    throwIfCancelled();
    pStart("特殊能力探索");
    const cand=await optimizeSpecialsForLife(task.states,exp,task.hp,onProgress,progress,task.groups,targetConstraint);
    pEnd("特殊能力探索");

    if(cand && better(cand,best)){
      best=cand;
    }

    if(currentCalcMode()!=='fast') await yieldToBrowser();
  }

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
  if(errs.length){
    result.innerHTML=`<div class="error-box">${errs.map(e=>`<p>⚠️ ${e}</p>`).join('')}</div>`;
    return;
  }

  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const startTime=performance.now();
  const btn=document.getElementById('calcBtn');
  const cancelBtn=ensureCancelButton();
  const cacheKey=calcCacheKey(exp);

  cancelRequested=false;
  isCalculating=true;
  activeTargetConstraint='normal';
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

  result.innerHTML='';

  try{
    let finalCandidate=getCachedResult(cacheKey);

    if(finalCandidate){
      btn.textContent='計算中 100%';
    }else{
      let lastProgressPaint=0;
      finalCandidate=await optimizeAsync(exp,(msg)=>{
        const now=performance.now();
        if(msg.includes('100%') || now-lastProgressPaint>=250){
          lastProgressPaint=now;
          btn.textContent=msg;
        }
      },'normal');
      setCachedResult(cacheKey,finalCandidate);
    }

    const finalItems=restoreItems(finalCandidate);
    const elapsed=((performance.now()-startTime)/1000).toFixed(2);
    const remain=exp.map((v,i)=>v-(finalCandidate.cost?.[i]||0));

    const remainHtml=`<div class="result-block"><h3>残経験点</h3><table class="result-table remain-table"><tbody>${expNames.map((n,i)=>`<tr><td>${n}</td><td>${remain[i]}</td></tr>`).join('')}</tbody></table></div>`;

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
<div class="result-block">
  <h3>計算時間</h3>
  <p>${elapsed} 秒</p>
</div>`;
  }catch(err){
    if(err?.name==='CalculationCancelledError'){
      result.innerHTML=`<div class="result-block"><p>計算をキャンセルしました。</p><p>条件を変更して、もう一度「計算する」を押してください。</p></div>`;
    }else{
      const name=err?.name||'Error';
      const message=err?.message||'原因不明のエラーです';
      result.innerHTML=`<div class="error-box"><p>⚠️ 計算中にエラーが発生しました。</p><p>${name}</p><p>${message}</p></div>`;
      console.error(err);
    }
  }finally{
    isCalculating=false;
    activeTargetConstraint='normal';
    document.body.classList.remove('is-calculating');
    document.querySelectorAll('button,input,select').forEach(el=>{el.disabled=false;});
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
