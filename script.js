(function(){
// v8.0 高精度専用：安全な総経験点Upper Boundを追加。査定条件・保持上限・候補集合は変更なし。
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
// 不具合切り分け用
// normal : 現行
// no_ub  : Upper Boundだけ無効
// wide   : Upper Bound無効＋保持上限拡大
// life50 : Upper Bound無効＋保持上限拡大＋生命力50固定
let diagnosticRunMode='normal';
const MANUAL_ROUTE_TRACE={
  reset(){
    this.plan=[];
    this.basic=[];
    this.special=[];
    this.baseFound=false;
    this.baseScore=null;
    this.baseCost=null;
    this.finalFound=false;
    this.firstLoss='';
    this.firstLossDetail=null;
  }
};
MANUAL_ROUTE_TRACE.reset();
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


function removeTemporaryVersionDisplay(){
  const nodes=document.querySelectorAll('body *');
  for(const el of nodes){
    if(el.children.length) continue;
    const text=(el.textContent||'').trim();
    if(/^Version\s+\d/i.test(text)){
      el.remove();
      break;
    }
  }
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
        <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}">＋</button>
        <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}"><span class="ability-name-text">${n}</span></button>
        <input class="ability-value" type="number" min="1" ${lim[n]?`max="${lim[n]}"`:''} id="basic_${n}" inputmode="numeric" autocomplete="off" ${disabled?'readonly aria-disabled="true"':''}>
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
function pairIndex(i){const li=lowerIndex(i); if(li>=0)return li; return upperIndex(i);}
function specialOwned(i){return getSpecialState(i).own===1;}
function specialHint(i){return Number(getSpecialState(i).hint||0);}
function shouldShowSpecial(i){
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
function ownedLabel(on){return on ? '<span class="owned-label">✓取得済</span>' : ''}
function setHintBtn(btn,level){if(!btn)return; btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function cycleHint(v){return (Number(v)||0)>=5 ? 0 : (Number(v)||0)+1;}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  const lim=limits(); const disabled=!hasAcademyJob();
  setHintBtn(row.querySelector('.hint-btn'),basicHints[name]||0);
  row.classList.toggle('owned',!!basicOwned[name]);
  const hintBtn=row.querySelector('.hint-btn');
  if(hintBtn) hintBtn.disabled=false;
  const btn=row.querySelector('.name-btn');
  if(btn) btn.disabled=false;
  btn.innerHTML=`<span class="ability-name-text">${name}</span>${ownedLabel(!!basicOwned[name])}`;
  const inp=document.getElementById('basic_'+name);
  if(inp){
    // アカデミー／ジョブ未選択時はreadonlyにして、タップ時の案内を受け取れるようにする。
    // 取得済みで固定された能力だけは従来どおりdisabledにする。
    inp.disabled=!!basicOwned[name];
    inp.readOnly=disabled;
    inp.setAttribute('aria-disabled',(disabled || !!basicOwned[name])?'true':'false');
    inp.classList.toggle('locked',disabled || !!basicOwned[name]);
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
    if(group){group.forEach(n=>{const j=specialNameIndex.get(String(n)) ?? -1; if(j>=0 && j!==i){getSpecialState(j).own=0; applySkillVisual(j);}});}
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
    const name=t.dataset.name;
    if(!hasAcademyJob()){
      showAcademyJobRequired(name);
      return;
    }
    basicOwned[name]=!basicOwned[name];
    applyBasicVisual(name);
    return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});


function setInlineError(id,msg){const el=document.getElementById(id); if(el) el.textContent=msg||'';}
function showAcademyJobRequired(name){
  const msg=!academy.value
    ? 'アカデミー、ジョブを選択してください'
    : 'ジョブを選択してください';
  setInlineError('err_basic_'+safeId(name),msg);
  const inp=document.getElementById('basic_'+name);
  if(inp) inp.classList.add('input-error');
}

// 未選択時の数値欄はreadonlyにしてタップを受け取り、
// 数値欄または基本能力名のタップ時に選択を促すメッセージを表示する。
// 左側の「＋」はアカデミー・ジョブ未選択時でもコツ入力に使える。
document.addEventListener('pointerdown',e=>{
  const nameBtn=e.target.closest?.('button[data-kind="basic-name"]');
  if(nameBtn && !hasAcademyJob()){
    e.preventDefault();
    showAcademyJobRequired(nameBtn.dataset.name);
    return;
  }

  const inp=e.target.closest?.('input[id^="basic_"]');
  if(!inp || hasAcademyJob()) return;
  e.preventDefault();
  const name=inp.id.replace('basic_','');
  showAcademyJobRequired(name);
  inp.blur();
},{passive:false});

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

function initialLifeValue(){
  return Number(document.getElementById('basic_生命力')?.value||1);
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
    const delta=Math.round((after-before)*10)/10;
    if(delta===0) continue;

    rows.push({
      name:String(skill[1]),
      before,
      after,
      delta
    });
    total=Math.round((total+delta)*10)/10;
  }

  return {baseHp,finalHp,total,rows};
}
const SPECIAL_DISCOUNT=[0,.5,.6,.7,.8,.9];
function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:(SPECIAL_DISCOUNT[hint]||0); return Math.floor(cost*(1-disc));}
const hpByLifeCache=new Map();
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

// 基本能力の途中prune専用。
// 現在査定だけでなく、残経験点から取得できそうな高効率特殊能力の見込み査定も加えて並べる。
// 完全な混在探索ではなく、候補を早期に落としすぎないための保守的な中間評価。
const BASIC_SPECIAL_LOOKAHEAD_GROUPS=14;
function estimateSpecialPotentialForBasicState(st,exp){
  if(!st || !exp) return 0;

  const remain=[
    Math.max(0,Number(exp[0]||0)-Number(st.cost?.[0]||0)),
    Math.max(0,Number(exp[1]||0)-Number(st.cost?.[1]||0)),
    Math.max(0,Number(exp[2]||0)-Number(st.cost?.[2]||0)),
    Math.max(0,Number(exp[3]||0)-Number(st.cost?.[3]||0)),
    Math.max(0,Number(exp[4]||0)-Number(st.cost?.[4]||0))
  ];

  const hp=currentHpForLife(st.life);
  const groups=specialChoiceGroupsCached(hp);
  let bonus=0;
  let checked=0;

  for(let gi=0;gi<groups.length && checked<BASIC_SPECIAL_LOOKAHEAD_GROUPS;gi++){
    const g=groups[gi];

    // コツなしHP依存グループは、見込み査定でも後回し。
    if(g.hpPriorityPenalty) continue;

    let chosen=null;
    for(const op of g.opts){
      if(op.cost[0]>remain[0]||op.cost[1]>remain[1]||op.cost[2]>remain[2]||
         op.cost[3]>remain[3]||op.cost[4]>remain[4]) continue;
      chosen=op;
      break;
    }

    checked++;
    if(!chosen) continue;

    remain[0]-=chosen.cost[0];
    remain[1]-=chosen.cost[1];
    remain[2]-=chosen.cost[2];
    remain[3]-=chosen.cost[3];
    remain[4]-=chosen.cost[4];
    bonus+=Number(chosen.score||0);
  }

  return bonus;
}
function basicPruneProjectedScore(st,exp){
  if(st._basicProjectedScoreKey===key(exp) && Number.isFinite(st._basicProjectedScore)){
    return st._basicProjectedScore;
  }
  const projected=Number(st.score||0)+estimateSpecialPotentialForBasicState(st,exp);
  st._basicProjectedScore=projected;
  st._basicProjectedScoreKey=key(exp);
  return projected;
}

function yieldToBrowser(){
  return new Promise(r=>setTimeout(r,0)).then(()=>{
    throwIfCancelled();
  });
}
function prune(states,limit=12000,mode=currentCalcMode(),context='generic',expForProjection=null){
  const arr=Array.from(states.values());
  arr.sort((a,b)=>{
    if(context==='basic' && expForProjection){
      const bp=basicPruneProjectedScore(b,expForProjection);
      const ap=basicPruneProjectedScore(a,expForProjection);
      if(bp!==ap) return bp-ap;
    }
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
        if(pruneScopeKey(k)===stScope && k.score>=st.score){
          const kc=k.cost, sc=st.cost;
          if(kc[0]<=sc[0]&&kc[1]<=sc[1]&&kc[2]<=sc[2]&&kc[3]<=sc[3]&&kc[4]<=sc[4]) continue outer;
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
        const kc=k.cost, sc=st.cost;
        if(kc[0]<=sc[0]&&kc[1]<=sc[1]&&kc[2]<=sc[2]&&kc[3]<=sc[3]&&kc[4]<=sc[4]) continue outer;
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
          const kc=k.cost, sc=st.cost;
          if(kc[0]<=sc[0]&&kc[1]<=sc[1]&&kc[2]<=sc[2]&&kc[3]<=sc[3]&&kc[4]<=sc[4]) continue outer;
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
const valueRowCache=new WeakMap();
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
function basicOptions(name,exp){
  const lim=limits();
  const inp=document.getElementById('basic_'+name);
  const cur=Number(inp?.value||1);
  if(diagnosticRunMode==='life50' && name==='生命力'){
    return [{
      cost:[0,0,0,0,0],
      score:0,
      items:EMPTY_ITEMS,
      itemLen:0,
      life:cur,
      costSum:0,
      eff:0
    }];
  }
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
    c[0]+=step[0];
    c[1]+=step[1];
    c[2]+=step[2];
    c[3]+=step[3];
    c[4]+=step[4];
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
function basicMilestoneTargets(name,current,max){
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

function basicPlanEntry(name,exp){
  const opts=basicOptions(name,exp);
  let bestEff=0;
  let bestScore=0;
  for(const op of opts){
    if(op.eff>bestEff) bestEff=op.eff;
    if(op.score>bestScore) bestScore=op.score;
  }

  const current=Number(document.getElementById('basic_'+name)?.value||1);
  const max=limits()[name];
  let milestoneEff=0;
  let milestoneTarget=null;

  if(max!=null){
    const targets=basicMilestoneTargets(name,current,max);

    for(const target of targets){
      const op=opts.find(x=>x.items?.length && Number(x.items[0]?.to)===Number(target));
      if(!op) continue;

      milestoneEff=Number(op.score||0)/Math.max(1,Number(op.costSum||0));
      milestoneTarget=target;

      // 最も近い節目だけで優先判定する。
      break;
    }
  }

  // 節目優先でない能力は、遠い将来の最高効率ではなく
  // 「現在値→次の1」の査定効率で並べる。
  const firstStep=opts.find(x=>x.items?.length && Number(x.items[0]?.to)===current+1);
  const currentEff=firstStep
    ? Number(firstStep.score||0)/Math.max(1,Number(firstStep.costSum||0))
    : 0;

  const milestonePriority=milestoneEff>=0.5;
  const highRangePriority=current>=90 && !milestonePriority;

  // 僧侶・魔法使い・魔闘士のパワーは通常区間での探索優先度を明確に下げる。
  // ただし節目効率0.5以上、または90以上なら通常どおり優先判定する。
  const lowPowerJob=['僧侶','魔法使い','魔闘士'].includes(job.value);
  const roleDeprioritized=
    name==='パワー' &&
    lowPowerJob &&
    !milestonePriority &&
    !highRangePriority;

  const priorityTier=milestonePriority ? 3 : (highRangePriority ? 2 : (roleDeprioritized ? 0 : 1));
  const priorityValue=milestonePriority
    ? milestoneEff
    : currentEff;

  return {
    name,
    opts,
    priority:priorityValue,
    priorityTier,
    bestScore,
    bestEff,
    currentEff,
    milestoneEff,
    milestoneTarget,
    milestonePriority,
    highRangePriority,
    roleDeprioritized
  };
}

function manualTargetForBasic(name){
  return Number(DIAGNOSTIC_MANUAL_PLAN?.basicTargets?.[name] ??
    document.getElementById('basic_'+name)?.value ?? 1);
}
function findStateByCostLife(states,cost,life){
  for(const st of states.values()){
    if(Number(st.life)!==Number(life)) continue;
    const c=st.cost;
    if(c[0]===cost[0]&&c[1]===cost[1]&&c[2]===cost[2]&&c[3]===cost[3]&&c[4]===cost[4]){
      return st;
    }
  }
  return null;
}
function basicStateDistance(st,targetCost,targetLife){
  const c=st.cost||[0,0,0,0,0];
  let d=Math.abs(Number(st.life)-Number(targetLife))*25;
  for(let i=0;i<5;i++) d+=Math.abs(Number(c[i]||0)-Number(targetCost[i]||0));
  return d;
}
function analyzeBasicPruneLoss(targetState,beforeStates,survivors,beforeCount,limit,exp){
  if(!targetState) return null;

  let dominator=null;
  let closest=null;
  let closestDistance=Infinity;
  const tc=targetState.cost;
  const targetScope=pruneScopeKey(targetState);

  const ranked=Array.from(beforeStates.values()).sort((a,b)=>{
    const bp=basicPruneProjectedScore(b,exp);
    const ap=basicPruneProjectedScore(a,exp);
    if(bp!==ap) return bp-ap;
    if(Number(b.score)!==Number(a.score)) return Number(b.score)-Number(a.score);
    return Number(a.usedCost??costSum(a.cost))-Number(b.usedCost??costSum(b.cost));
  });
  const rawRank=Math.max(1,ranked.indexOf(targetState)+1);
  const cutoffIndex=Math.min(Math.max(0,Number(limit||1)-1),Math.max(0,ranked.length-1));
  const cutoffState=ranked[cutoffIndex]||null;
  const targetProjected=basicPruneProjectedScore(targetState,exp);
  const cutoffScore=cutoffState?Number(cutoffState.score):null;
  const cutoffProjected=cutoffState?basicPruneProjectedScore(cutoffState,exp):null;
  const cutoffUsedCost=cutoffState?Number(cutoffState.usedCost??costSum(cutoffState.cost)):null;

  for(const st of survivors.values()){
    const dist=basicStateDistance(st,tc,targetState.life);
    if(dist<closestDistance){
      closestDistance=dist;
      closest=st;
    }

    if(pruneScopeKey(st)!==targetScope) continue;
    const c=st.cost;
    if(Number(st.score)>=Number(targetState.score) &&
       c[0]<=tc[0]&&c[1]<=tc[1]&&c[2]<=tc[2]&&c[3]<=tc[3]&&c[4]<=tc[4]){
      if(!dominator || Number(st.score)>Number(dominator.score) ||
         (Number(st.score)===Number(dominator.score) && st.usedCost<dominator.usedCost)){
        dominator=st;
      }
    }
  }

  return {
    reason:dominator?'同一生命力・同一取得状態の支配候補に負けた':'保持上限による順位カットの可能性が高い',
    targetScore:Number(targetState.score),
    targetCost:tc.slice(),
    targetLife:Number(targetState.life),
    beforeCount:Number(beforeCount||0),
    afterCount:survivors.size,
    limit:Number(limit||0),
    rawRank,
    targetProjected,
    cutoffScore,
    cutoffProjected,
    cutoffUsedCost,
    scoreToCutoff:cutoffScore==null?null:Number(targetState.score)-cutoffScore,
    projectedToCutoff:cutoffProjected==null?null:targetProjected-cutoffProjected,
    targetItems:restoreItems(targetState).map(debugItemLabel),
    cutoff:cutoffState?{
      score:Number(cutoffState.score),
      usedCost:Number(cutoffState.usedCost??costSum(cutoffState.cost)),
      cost:cutoffState.cost.slice(),
      life:Number(cutoffState.life),
      items:restoreItems(cutoffState).map(debugItemLabel)
    }:null,
    dominator:dominator?{
      score:Number(dominator.score),
      cost:dominator.cost.slice(),
      life:Number(dominator.life),
      items:restoreItems(dominator).map(debugItemLabel)
    }:null,
    closest:closest?{
      score:Number(closest.score),
      cost:closest.cost.slice(),
      life:Number(closest.life),
      distance:closestDistance,
      items:restoreItems(closest).map(debugItemLabel)
    }:null
  };
}

function traceBasicStage(stage,entry,states,cost,life,phase,lossDetail=null){
  if(diagnosticRunMode!=='wide') return;
  const hit=findStateByCostLife(states,cost,life);
  MANUAL_ROUTE_TRACE.basic.push({
    stage,
    ability:entry.name,
    phase,
    found:!!hit,
    score:hit?Number(hit.score):null,
    stateCount:states.size,
    cost:cost.slice(),
    life:Number(life),
    lossDetail
  });
  if(!hit && !MANUAL_ROUTE_TRACE.firstLoss){
    MANUAL_ROUTE_TRACE.firstLoss=`基本能力「${entry.name}」処理後（${phase}）`;
    MANUAL_ROUTE_TRACE.firstLossDetail=lossDetail;
  }
}
function manualSpecialNamesSet(){
  return new Set(DIAGNOSTIC_MANUAL_PLAN?.specials||[]);
}
function manualOptionForGroup(group,targetNames){
  let best=null;
  for(const op of group.opts||[]){
    const names=(op.items||[]).map(it=>String(it.name||''));
    const containsTarget=names.some(n=>targetNames.has(n));
    if(!containsTarget) continue;
    if(!best || Number(op.score)>Number(best.score)) best=op;
  }
  return best;
}
function traceSpecialStage(gi,group,states,expected,phase,chosenLabel){
  if(diagnosticRunMode!=='wide' || !expected?.active) return;
  const k=key5(expected.cost[0],expected.cost[1],expected.cost[2],expected.cost[3],expected.cost[4])+
    '|'+scopeKeyFor(expected.life,expected.bits??EMPTY_BITS);
  const hit=states.get(k)||null;
  MANUAL_ROUTE_TRACE.special.push({
    group:gi+1,
    kind:group.kind||'',
    choice:chosenLabel||'何もしない',
    phase,
    found:!!hit,
    score:hit?Number(hit.score):null,
    stateCount:states.size,
    cost:expected.cost.slice()
  });
  if(!hit && !MANUAL_ROUTE_TRACE.firstLoss){
    MANUAL_ROUTE_TRACE.firstLoss=`特殊能力グループ${gi+1}「${chosenLabel||'何もしない'}」処理後（${phase}）`;
  }
}

function buildBasicStates(exp){
  const mode=currentCalcMode();
  const initialLife=Number(document.getElementById('basic_生命力')?.value||1);
  const init=makeState([0,0,0,0,0],0,initialLife,null,EMPTY_ITEMS,0,EMPTY_BITS);
  let states=new Map([[stateKey(init),init]]);

  // v4.5: 基礎能力は固定順ではなく、査定効率が高い能力から探索する。
  // 表示順は resultTable 側でゲーム順に戻すので、結果表示には影響しない。
  const plan=basicNames
    .map(name=>basicPlanEntry(name,exp))
    .sort((a,b)=>{
      // 優先順位：
      // 1. 次節目までの累積効率0.5以上
      // 2. 現在値90以上
      // 3. 現在区間（次の1）の査定効率順
      // 4. 僧侶・魔法使い・魔闘士の通常区間パワー
      if(b.priorityTier!==a.priorityTier){
        return b.priorityTier-a.priorityTier;
      }

      if(b.priority!==a.priority){
        return b.priority-a.priority;
      }

      return basicNames.indexOf(a.name)-basicNames.indexOf(b.name);
    });

  if(diagnosticRunMode==='wide'){
    MANUAL_ROUTE_TRACE.reset();
    MANUAL_ROUTE_TRACE.plan=plan.map((entry,index)=>({
      order:index+1,
      name:entry.name,
      priority:Number(entry.priority||0),
      priorityTier:Number(entry.priorityTier||0),
      bestEff:Number(entry.bestEff||0),
      currentEff:Number(entry.currentEff||0),
      milestoneTarget:entry.milestoneTarget,
      milestoneEff:Number(entry.milestoneEff||0),
      milestonePriority:!!entry.milestonePriority,
      highRangePriority:!!entry.highRangePriority,
      roleDeprioritized:!!entry.roleDeprioritized,
      optionCount:entry.opts.length
    }));
  }

  let manualExpectedCost=[0,0,0,0,0];
  let manualExpectedLife=initialLife;

  for(const entry of plan){
    const next=new Map();

    const exp0=exp[0],exp1=exp[1],exp2=exp[2],exp3=exp[3],exp4=exp[4];
    for(const st of states.values()){
      const stItemLen=st.itemLen ?? 0;
      const stScore=st.score;
      const stUsedCost=st.usedCost;
      const sc=st.cost;
      for(const op of entry.opts){
        const oc=op.cost;
        const n0=sc[0]+oc[0]; if(n0>exp0) continue;
        const n1=sc[1]+oc[1]; if(n1>exp1) continue;
        const n2=sc[2]+oc[2]; if(n2>exp2) continue;
        const n3=sc[3]+oc[3]; if(n3>exp3) continue;
        const n4=sc[4]+oc[4]; if(n4>exp4) continue;

        const newScore=stScore+op.score;
        const newLife=op.life!==null?op.life:st.life;
        const k=key5(n0,n1,n2,n3,n4)+'|'+(newLife==null?'':Number(newLife).toString(36));
        const old=next.get(k);
        const newItemLen=stItemLen+(op.itemLen ?? op.items.length);

        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))) continue;

        const nc=[n0,n1,n2,n3,n4];
        next.set(k,makeState(nc,newScore,newLife,st,op.items,newItemLen,null,k,stUsedCost+op.costSum));
      }
    }

    if(!next.size) continue;

    let manualTargetStateBeforePrune=null;
    if(diagnosticRunMode==='wide'){
      const target=manualTargetForBasic(entry.name);
      const targetOp=entry.opts.find(op=>{
        if(!op.items?.length){
          const current=Number(document.getElementById('basic_'+entry.name)?.value||1);
          return Number(target)===current;
        }
        return Number(op.items[0]?.to)===Number(target);
      });
      if(targetOp){
        manualExpectedCost=addCost(manualExpectedCost,targetOp.cost);
        if(entry.name==='生命力' && targetOp.life!=null) manualExpectedLife=Number(targetOp.life);
        manualTargetStateBeforePrune=findStateByCostLife(next,manualExpectedCost,manualExpectedLife);
        traceBasicStage(MANUAL_ROUTE_TRACE.basic.length+1,entry,next,manualExpectedCost,manualExpectedLife,'prune前');
      }else if(!MANUAL_ROUTE_TRACE.firstLoss){
        MANUAL_ROUTE_TRACE.firstLoss=`基本能力「${entry.name}」の手動目標候補が未生成`;
      }
    }

    const basicStateLimit=(diagnosticRunMode==='wide'||diagnosticRunMode==='life50')?16000:6200;
    const beforePruneCount=next.size;
    states=next.size>basicStateLimit
      ? prune(next,basicStateLimit,mode,'basic',exp)
      : next;

    if(diagnosticRunMode==='wide'){
      const survived=findStateByCostLife(states,manualExpectedCost,manualExpectedLife);
      const lossDetail=!survived && manualTargetStateBeforePrune
        ? analyzeBasicPruneLoss(
            manualTargetStateBeforePrune,
            next,
            states,
            beforePruneCount,
            basicStateLimit,
            exp
          )
        : null;
      traceBasicStage(MANUAL_ROUTE_TRACE.basic.length+1,entry,states,manualExpectedCost,manualExpectedLife,'prune後',lossDetail);
    }

    if(!states.size) break;
  }

  // 取得済みHP依存能力は、現在HP時点の査定を再加算せず、
  // 生命力上昇で増えた査定差分だけを追加する。
  for(const st of states.values()){
    const ownedHp=ownedHpDependentBreakdown(st.life);
    st.ownedHpDelta=ownedHp.total;
    st.score=Math.round((st.score+ownedHp.total)*10)/10;
  }

  if(diagnosticRunMode==='wide'){
    const base=findStateByCostLife(states,manualExpectedCost,manualExpectedLife);
    MANUAL_ROUTE_TRACE.baseFound=!!base;
    MANUAL_ROUTE_TRACE.baseScore=base?Number(base.score):null;
    MANUAL_ROUTE_TRACE.baseCost=manualExpectedCost.slice();
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
  // 最終結果キャッシュは入力条件を含むキーで管理するため維持する。
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
    usedCost:st.usedCost ?? costSum(st.cost||[0,0,0,0,0]),
    ownedHpDelta:Number(st.ownedHpDelta||0)
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
  const cachedItem=specialItemCache.get(cacheKey);
  if(cachedItem!==undefined) return cachedItem;

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
    const already=g.some(n=>{const i=specialNameIndex.get(String(n)) ?? -1; return i>=0 && specialOwned(i);});
    if(!already){
      g.forEach(n=>{const i=specialNameIndex.get(String(n)) ?? -1; if(i>=0 && !used.has(i) && !specialOwned(i)){const it=itemForSpecialIndex(i,hp,false); if(it) opts.push(it); used.add(i);}});
    }else{
      g.forEach(n=>{const i=specialNameIndex.get(String(n)) ?? -1; if(i>=0) used.add(i);});
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
function specialOptionHasHint(op){
  return !!op?.items?.some(it=>
    it?.type==='special' && specialHint(Number(it.idx))>0
  );
}
function specialOptionIsUnhintedHpDependent(op){
  return specialOptionIsHpDependent(op) && !specialOptionHasHint(op);
}
function specialGroupIsHpDependent(g){
  return !!g?.opts?.length && g.opts.every(specialOptionIsHpDependent);
}
function specialGroupIsUnhintedHpDependent(g){
  return !!g?.opts?.length && g.opts.every(specialOptionIsUnhintedHpDependent);
}
function specialChoiceGroupsCached(hp){
  const k=String(hp);
  const cachedGroups=specialGroupCache.get(k);
  if(cachedGroups!==undefined) return cachedGroups;

  // v4.5: 特殊能力候補はHPごとに事前整形・事前ソートしてキャッシュする。
  // 計算本体では原則ソートし直さず、フィルタだけ行う。
  const groups=specialChoiceGroups(hp)
    .map(g=>{
      const opts=g.opts.map(op=>{
        const cs=costSum(op.cost);
        const bits=op.bits ?? specialItemsBits(op.items);
        return {...op,bits,conflictBits:op.conflictBits ?? conflictBitsFor(bits),costSum:cs,eff:op.score/(1+cs)};
      }).sort((a,b)=>{
        // HP依存はコツなしの場合だけ後回し。
        // コツが付いているHP依存能力は、通常能力と同じく実効率で比較する。
        const ah=specialOptionIsUnhintedHpDependent(a)?1:0;
        const bh=specialOptionIsUnhintedHpDependent(b)?1:0;
        if(ah!==bh) return ah-bh;
        if(b.eff!==a.eff) return b.eff-a.eff;
        return b.score-a.score;
      });
      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce((m,o)=>Math.max(m,o.eff),0);
      const hpDependent=specialGroupIsHpDependent({opts});
      const hpPriorityPenalty=specialGroupIsUnhintedHpDependent({opts});
      return {...g,opts,maxScore,bestEfficiency,hpDependent,hpPriorityPenalty};
    })
    .filter(g=>g.opts.length>0)
    .sort((a,b)=>{
      if(!!a.hpPriorityPenalty!==!!b.hpPriorityPenalty) return a.hpPriorityPenalty?1:-1;
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  specialGroupCache.set(k,groups);
  return groups;
}
function impossibleChoice(op,exp){return !leq(op.cost,exp);}
function specialChoiceGroupsForExpCached(hp,exp,preGroups=null){
  const cacheKey=String(hp)+'|'+key(exp);
  const cached=filteredSpecialGroupCache.get(cacheKey);
  if(cached!==undefined) return cached;

  const source=preGroups||specialChoiceGroupsCached(hp);
  const groups=[];
  for(let gi=0;gi<source.length;gi++){
    const g=source[gi];
    const opts=[];
    let maxScore=0;
    let bestEfficiency=0;
    let allHpDependent=true;
    let allUnhintedHpDependent=true;

    for(let oi=0;oi<g.opts.length;oi++){
      const op=g.opts[oi];
      if(impossibleChoice(op,exp)) continue;
      opts.push(op);
      if(op.score>maxScore) maxScore=op.score;
      const eff=op.eff ?? (op.score/(1+(op.costSum??costSum(op.cost))));
      if(eff>bestEfficiency) bestEfficiency=eff;
      if(!specialOptionIsHpDependent(op)) allHpDependent=false;
      if(!specialOptionIsUnhintedHpDependent(op)) allUnhintedHpDependent=false;
    }
    if(!opts.length) continue;
    groups.push({
      ...g,
      opts,
      maxScore,
      bestEfficiency,
      hpDependent:allHpDependent,
      hpPriorityPenalty:allUnhintedHpDependent
    });
  }

  groups.sort((a,b)=>{
    if(!!a.hpPriorityPenalty!==!!b.hpPriorityPenalty) return a.hpPriorityPenalty?1:-1;
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
function currentCalcMode(){return 'high';}
function calcModeLabel(){return '高精度';}
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

function groupEfficiency(g){
  return g.bestEfficiency ?? g.opts.reduce((m,o)=>Math.max(m,o.eff ?? (o.score/(1+(o.costSum??costSum(o.cost)))),0),0);
}
async function optimizeSpecialsForLife(baseStates, exp, hp, onProgress, progress, preGroups=null, modeValue=null, totalExpValue=null, expKeyValue=null){
  // optimizeAsyncで準備済みの値はそのまま受け取り、同じ計算・キャッシュ参照を繰り返さない。
  let groups=preGroups || specialChoiceGroupsForExpCached(hp,exp);

  const totalExp=totalExpValue ?? costSum(exp);
  const mode=modeValue || currentCalcMode();

  // 知力余り対策を含む最終候補順まで、HP + 経験点条件ごとにキャッシュする。
  const orderedCacheKey=String(hp)+'|'+(expKeyValue || key(exp));
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

  // v4.5: 事前ソートと上界枝刈りを前提に、高精度は少しだけ保持数を絞る。
  const normalStateLimit=Math.max(2400,Math.min(6800,1700+Math.floor(totalExp*0.9)));
  const STATE_LIMIT=(diagnosticRunMode==='wide'||diagnosticRunMode==='life50')
    ? Math.max(16000,Math.min(26000,normalStateLimit*4))
    : normalStateLimit;
  // wide検証時だけ保持上限を広げ、pruneによる最適解落ちを切り分ける。
  const HARD_LIMIT=Math.floor(STATE_LIMIT*((diagnosticRunMode==='wide'||diagnosticRunMode==='life50')?2.0:1.6));

  // v8.0: 高精度を維持する安全なBranch & Bound。
  // 1) 各グループの最大査定合計
  // 2) 残り総経験点 × 残グループ中の最大「査定/総コスト」
  // の小さい方を上界にする。どちらも実現可能な査定以上になるため、精度は落とさない。
  const groupCount=groups.length;
  const suffixMax=new Float64Array(groupCount+1);
  const suffixBestRatio=new Float64Array(groupCount+1);
  const suffixZeroScore=new Float64Array(groupCount+1);

  for(let i=groupCount-1;i>=0;i--){
    const g=groups[i];
    let groupBestRatio=0;
    let groupZeroScore=0;
    const opts=g.opts;
    for(let oi=0;oi<opts.length;oi++){
      const op=opts[oi];
      const cs=op.costSum??costSum(op.cost);
      if(cs>0){
        const ratio=op.score/cs;
        if(ratio>groupBestRatio) groupBestRatio=ratio;
      }else if(op.score>groupZeroScore){
        groupZeroScore=op.score;
      }
    }
    suffixMax[i]=suffixMax[i+1]+(g.maxScore||0);
    suffixBestRatio[i]=Math.max(suffixBestRatio[i+1],groupBestRatio);
    suffixZeroScore[i]=suffixZeroScore[i+1]+groupZeroScore;
  }

  function remainingScoreUpper(start,remainSum){
    const byGroup=suffixMax[start];
    const byTotalCost=suffixZeroScore[start]+Math.max(0,remainSum)*suffixBestRatio[start];
    return byTotalCost<byGroup?byTotalCost:byGroup;
  }

  function remainingCostSum(st){
    return totalExp-(st.usedCost ?? costSum(st.cost));
  }

  let states;

  // optimizeAsync から Map を受け取った場合は、そのまま初期状態集合として利用する。
  // 通常の iterable の場合だけ重複統合用 Map を生成する。
  if(baseStates instanceof Map){
    states=baseStates;
    for(const st of states.values()){
      if(st._remainSum===undefined) st._remainSum=remainingCostSum(st);
    }
  }else{
    states=new Map();
    for(const base of baseStates){
      if(!base) continue;
      const st=base;
      if(st._remainSum===undefined) st._remainSum=remainingCostSum(st);
      const k=stateKey(st);
      if(better(st,states.get(k))) states.set(k,st);
    }
  }

  if(!states.size){
    return {items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
  }

  if(states.size>STATE_LIMIT) states=prune(states,STATE_LIMIT,mode);

  let manualExpected=null;
  const manualTargetNames=manualSpecialNamesSet();
  if(diagnosticRunMode==='wide'){
    const manualBaseCost=MANUAL_ROUTE_TRACE.baseCost||[0,0,0,0,0];
    const manualLife=Number(DIAGNOSTIC_MANUAL_PLAN?.basicTargets?.['生命力'] ?? initialLifeValue());
    const base=findStateByCostLife(states,manualBaseCost,manualLife);
    manualExpected=base ? {
      active:true,
      cost:base.cost.slice(),
      score:Number(base.score),
      life:Number(base.life),
      bits:base.bits??EMPTY_BITS
    } : {active:false};
  }

  let bestScore=-Infinity;
  for(const st of states.values()){
    if(st.score>bestScore) bestScore=st.score;
  }

  const exp0=exp[0], exp1=exp[1], exp2=exp[2], exp3=exp[3], exp4=exp[4];
  const yieldEvery=2400;

  for(let gi=0;gi<groups.length;gi++){
    throwIfCancelled();
    const group=groups[gi];
    const groupOpts=group.opts;

    let manualChosen=null;
    let manualChosenLabel='何もしない';
    if(diagnosticRunMode==='wide' && manualExpected?.active){
      manualChosen=manualOptionForGroup(group,manualTargetNames);
      if(manualChosen){
        manualChosenLabel=(manualChosen.items||[]).map(it=>String(it.name||'')).join('・');
      }
    }

    let next=new Map(states);
    let iter=0;

    for(const st of states.values()){
      if((iter&255)===0) throwIfCancelled();
      const remainSum=st._remainSum;

      const upper=remainingScoreUpper(gi,remainSum);
      if(diagnosticRunMode==='normal' && st.score+upper+1e-9<bestScore){
        iter++;
        if(iter%yieldEvery===0) await yieldToBrowser();
        continue;
      }

      const stBits=st.bits ?? EMPTY_BITS;
      const stCost=st.cost;
      const stScore=st.score;
      const stLife=st.life;
      const stUsedCost=st.usedCost;
      const stItemLen=st.itemLen ?? 0;
      for(let oi=0,optsLen=groupOpts.length;oi<optsLen;oi++){
        const op=groupOpts[oi];
        if((iter&127)===0) throwIfCancelled();
        const opBits=op.bits;
        if((stBits & opBits)!==EMPTY_BITS){
          continue;
        }
        if((stBits & op.conflictBits)!==EMPTY_BITS){
          continue;
        }

        const oc=op.cost;
        const n0=stCost[0]+oc[0];
        if(n0>exp0){
          continue;
        }
        const n1=stCost[1]+oc[1];
        if(n1>exp1){
          continue;
        }
        const n2=stCost[2]+oc[2];
        if(n2>exp2){
          continue;
        }
        const n3=stCost[3]+oc[3];
        if(n3>exp3){
          continue;
        }
        const n4=stCost[4]+oc[4];
        if(n4>exp4){
          continue;
        }

        const newScore=stScore+op.score;
        const childRemainSum=remainSum-op.costSum;
        const childUpper=remainingScoreUpper(gi+1,childRemainSum);
        if(diagnosticRunMode==='normal' && newScore+childUpper+1e-9<bestScore) continue;
        if(newScore>bestScore) bestScore=newScore;

        // v5.0: 同一状態は生成直後に統合する。
        // items配列の結合は「採用される可能性がある状態」だけに限定する。
        const nextBits=stBits | opBits;
        const k=key5(n0,n1,n2,n3,n4)+'|'+scopeKeyFor(stLife,nextBits);
        const old=next.get(k);
        const newItemLen=stItemLen+(op.itemLen ?? op.items.length);

        if(old && (old.score>newScore || (old.score===newScore && (old.itemLen??0)<=newItemLen))){
          continue;
        }

        const nc=[n0,n1,n2,n3,n4];
        const newState=makeState(
          nc,
          newScore,
          stLife,
          st,
          op.items,
          newItemLen,
          opBits,
          k,
          stUsedCost+op.costSum
        );
        newState._remainSum=childRemainSum;
        next.set(k,newState);
      }

      if(next.size>HARD_LIMIT){

        next=prune(next,STATE_LIMIT,mode);
      }

      iter++;
      if(iter%yieldEvery===0) await yieldToBrowser();
    }

    if(diagnosticRunMode==='wide' && manualExpected?.active){
      if(manualChosen){
        const nextBits=(manualExpected.bits??EMPTY_BITS)|(manualChosen.bits??EMPTY_BITS);
        const nextCost=addCost(manualExpected.cost,manualChosen.cost);
        if(leq(nextCost,exp) &&
           ((manualExpected.bits??EMPTY_BITS)&(manualChosen.bits??EMPTY_BITS))===EMPTY_BITS &&
           ((manualExpected.bits??EMPTY_BITS)&(manualChosen.conflictBits??EMPTY_BITS))===EMPTY_BITS){
          manualExpected={
            active:true,
            cost:nextCost,
            score:Math.round((manualExpected.score+Number(manualChosen.score||0))*10)/10,
            life:manualExpected.life,
            bits:nextBits
          };
        }else{
          manualExpected.active=false;
          if(!MANUAL_ROUTE_TRACE.firstLoss){
            MANUAL_ROUTE_TRACE.firstLoss=`特殊能力グループ${gi+1}で手動案が経験点不足・重複・相互排他`;
          }
        }
      }
      if(manualExpected.active){
        traceSpecialStage(gi,group,next,manualExpected,'prune前',manualChosenLabel);
      }
    }

    // 支配除外がほぼ発生しないため、状態数が上限を超えた時だけpruneする。
    if(next.size>STATE_LIMIT){

      states=prune(next,STATE_LIMIT,mode);
    }else{
      states=next;
    }

    if(diagnosticRunMode==='wide' && manualExpected?.active){
      traceSpecialStage(gi,group,states,manualExpected,'prune後',manualChosenLabel);
    }


    // bestScore は候補生成時に更新済み。prune は新しい高得点状態を作らないため、
    // グループごとの全状態再走査は不要。
    if(progress){
      progress.done++;
      if(onProgress) onProgress(progressMessage(progress));
    }else{
      if(onProgress) onProgress('計算中');
    }

    if((gi&1)===1 || gi===groupCount-1){
      await yieldToBrowser();
    }
  }

  let best=null;
  for(const st of states.values()){
    if(better(st,best)) best=st;
  }

  if(diagnosticRunMode==='wide' && manualExpected?.active){
    const k=key5(manualExpected.cost[0],manualExpected.cost[1],manualExpected.cost[2],manualExpected.cost[3],manualExpected.cost[4])+
      '|'+scopeKeyFor(manualExpected.life,manualExpected.bits??EMPTY_BITS);
    MANUAL_ROUTE_TRACE.finalFound=states.has(k);
  }

  return best||{items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
}
async function optimizeAsync(exp,onProgress){
  await yieldToBrowser();
  if(onProgress) onProgress('計算中 0%');

  const mode=currentCalcMode();
  const totalExp=costSum(exp);
  const expKeyValue=key(exp);
  const defaultLife=Number(document.getElementById('basic_生命力')?.value||1);
  const fallback={items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:defaultLife};

  pStart("基本能力生成");
  const basicMap=buildBasicStates(exp);
  pEnd("基本能力生成");

  if(!basicMap.size){
    if(onProgress) onProgress('計算中 100%');
    return fallback;
  }

  await yieldToBrowser();

  // basicMapはstateKeyで一意。entriesの既存キーをそのまま再利用し、
  // HP別グループ化でstateKey再生成・better判定を行わない。
  const byHp=new Map();
  for(const [stateKeyValue,st] of basicMap){
    const life=st.life||defaultLife;
    const hp=currentHpForLife(life);
    let hpStates=byHp.get(hp);
    if(!hpStates){
      hpStates=new Map();
      byHp.set(hp,hpStates);
    }
    hpStates.set(stateKeyValue,st);
  }

  // 進捗率の総数を先に確定する必要があるため、HP単位の準備情報だけ保持する。
  // 小オブジェクトを増やさず、固定長配列 [hp, states, groups] を使う。
  const prepared=[];
  let totalGroups=0;
  for(const [hp,baseMap] of byHp){
    const preparedLimit=(diagnosticRunMode==='wide'||diagnosticRunMode==='life50')?16000:6200;
    const states=baseMap.size>preparedLimit ? prune(baseMap,preparedLimit,mode) : baseMap;
    if(!states.size) continue;

    const groups=specialChoiceGroupsForExpCached(hp,exp);
    totalGroups+=groups.length || 1;
    prepared.push([hp,states,groups]);
  }

  // 以後byHpは不要。大きいMapへの参照を早めに外してGC対象にしやすくする。
  byHp.clear();

  if(!prepared.length){
    if(onProgress) onProgress('計算中 100%');
    return fallback;
  }

  const progress={done:0,total:Math.max(1,totalGroups),start:Date.now()};
  let best=null;

  // プロファイル計測もタスクごとではなく特殊能力探索全体で1回だけ行う。
  pStart("特殊能力探索");
  for(let ti=0,taskLen=prepared.length;ti<taskLen;ti++){
    throwIfCancelled();
    const task=prepared[ti];
    const cand=await optimizeSpecialsForLife(
      task[1],exp,task[0],onProgress,progress,task[2],mode,totalExp,expKeyValue
    );

    if(cand && better(cand,best)) best=cand;

    // optimizeSpecialsForLife内ですでに定期yieldしているため、
    // HPタスク間の追加yieldは複数タスク時だけ間引いて行う。
    if(mode!=='fast' && ti+1<taskLen && (ti&1)===1){
      await yieldToBrowser();
    }
  }
  pEnd("特殊能力探索");

  if(onProgress) onProgress('計算中 100%');
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


function basicItemScore(it){
  const table=tableFor(String(it?.name||''));
  if(!table) return 0;

  let total=0;
  for(let v=Number(it.from);v<Number(it.to);v++){
    const row=rowForValue(table.score,v);
    if(row) total+=Number(row[2]||0);
  }
  return Math.round(total*10)/10;
}
function diagnosticScoreBreakdown(st){
  const items=restoreItems(st);
  const life=Number(st?.life??initialLifeValue());
  const hp=currentHpForLife(life);

  const basicRows=[];
  const normalSpecialRows=[];
  const newHpSpecialRows=[];
  let basicTotal=0;
  let normalSpecialTotal=0;
  let newHpSpecialTotal=0;

  for(const it of items){
    if(it?.type==='basic'){
      const score=basicItemScore(it);
      basicRows.push({name:`${it.name} ${it.from}→${it.to}`,score});
      basicTotal=Math.round((basicTotal+score)*10)/10;
      continue;
    }

    if(it?.type==='special'){
      const skill=D.special[Number(it.idx)];
      if(!skill) continue;
      const score=skillScore(skill,hp);
      const row={name:String(it.name||skill[1]),score};
      if(Number(skill[11]||0)){
        newHpSpecialRows.push(row);
        newHpSpecialTotal=Math.round((newHpSpecialTotal+score)*10)/10;
      }else{
        normalSpecialRows.push(row);
        normalSpecialTotal=Math.round((normalSpecialTotal+score)*10)/10;
      }
    }
  }

  const ownedHp=ownedHpDependentBreakdown(life);
  const reconstructed=Math.round((
    basicTotal+
    normalSpecialTotal+
    newHpSpecialTotal+
    ownedHp.total
  )*10)/10;

  return {
    basicRows,
    basicTotal,
    normalSpecialRows,
    normalSpecialTotal,
    newHpSpecialRows,
    newHpSpecialTotal,
    ownedHp,
    reconstructed,
    internal:Number(st?.score||0),
    difference:Math.round((Number(st?.score||0)-reconstructed)*10)/10
  };
}
function diagnosticBreakdownRows(rows){
  if(!rows.length) return '<div>該当なし</div>';
  return rows.map(r=>`<div>${r.name}：${r.score>=0?'+':''}${r.score}</div>`).join('');
}
function diagnosticOwnedHpRows(ownedHp){
  if(!ownedHp.rows.length) return '<div>上昇分なし</div>';
  return ownedHp.rows.map(r=>
    `<div>${r.name}：${r.before} → ${r.after}（+${r.delta}）</div>`
  ).join('');
}
function diagnosticBreakdownHtml(st){
  const b=diagnosticScoreBreakdown(st);
  const diffNote=b.difference===0
    ? '内部査定と内訳合計は一致'
    : `⚠️ 内部査定との差：${b.difference>0?'+':''}${b.difference}`;

  return `<details>
    <summary>査定内訳</summary>
    <div style="margin-top:8px">
      <strong>基本能力査定</strong>
      ${diagnosticBreakdownRows(b.basicRows)}
      <div><strong>基本能力合計：${b.basicTotal}</strong></div>

      <div style="margin-top:8px"><strong>新規取得・通常特殊能力査定</strong></div>
      ${diagnosticBreakdownRows(b.normalSpecialRows)}
      <div><strong>通常特殊能力合計：${b.normalSpecialTotal}</strong></div>

      <div style="margin-top:8px"><strong>新規取得・HP依存特殊能力査定</strong></div>
      ${diagnosticBreakdownRows(b.newHpSpecialRows)}
      <div><strong>新規HP依存特殊能力合計：${b.newHpSpecialTotal}</strong></div>

      <div style="margin-top:8px"><strong>取得済みHP依存能力のHP上昇分</strong></div>
      <div>HP：${b.ownedHp.baseHp} → ${b.ownedHp.finalHp}</div>
      ${diagnosticOwnedHpRows(b.ownedHp)}
      <div><strong>HP上昇分合計：+${b.ownedHp.total}</strong></div>

      <div style="margin-top:8px"><strong>内訳合計：${b.reconstructed}</strong></div>
      <div><strong>内部査定：${b.internal}</strong></div>
      <div>${diffNote}</div>
    </div>
  </details>`;
}

function diagnosticItemNames(st){
  return restoreItems(st)
    .map(it=>it?.type==='basic'
      ? `${it.name} ${it.from}→${it.to}`
      : String(it?.name||''))
    .filter(Boolean);
}
function diagnosticResultSummary(label,st,seconds){
  return {
    label,
    score:Number(st?.score||0),
    cost:(st?.cost||[0,0,0,0,0]).slice(),
    seconds,
    names:diagnosticItemNames(st),
    state:st
  };
}
function diagnosticCompareHtml(rows){
  const base=rows[0];
  const bestScore=Math.max(...rows.map(r=>r.score));

  let verdict='';
  if(rows[1].score>base.score){
    verdict='Upper Boundで、より高い候補を落としている可能性が高いです。';
  }else if(rows[2].score>rows[1].score){
    verdict='保持上限またはpruneで、より高い候補を落としている可能性が高いです。';
  }else{
    verdict='Upper Bound・保持上限・pruneを緩めても大きな改善がありません。候補生成または査定データを確認してください。';
  }

  if(rows[3]){
    const lifeDiff=Math.round((rows[3].score-rows[2].score)*10)/10;
    verdict+=lifeDiff>0
      ? ` 生命力50固定の方が検証2より${lifeDiff}高く、生命力を上げる判断が探索を悪化させています。`
      : ` 生命力50固定は検証2比${lifeDiff}で、生命力上昇の過大評価だけが主因ではありません。`;
  }

  const cards=rows.map(r=>{
    const diff=r.score-base.score;
    return `<div style="margin:8px 0;padding:8px;border:1px solid #d7dfed;border-radius:10px">
      <strong>${r.label}${r.score===bestScore?' ✅最高':''}</strong><br>
      内部査定：${r.score}${diff?`（現行比 ${diff>0?'+':''}${diff}）`:''}<br>
      使用経験点：${r.cost.join(',')}<br>
      計算時間：${r.seconds} 秒
      <details><summary>選択内容</summary><div style="margin-top:6px">${r.names.join('<br>')||'追加なし'}</div></details>
      ${diagnosticBreakdownHtml(r.state)}
    </div>`;
  }).join('');

  return `<div class="result-block">
    <h3>不具合切り分け結果</h3>
    <p><strong>最大の検証目標：</strong>生命力固定なしで、検証3（生命力50固定）と同等以上の内部査定を再現すること。</p>
    <p><strong>${verdict}</strong></p>
    ${cards}
  </div>`;
}


const DIAGNOSTIC_MANUAL_PLAN={
  basicTargets:{
    '生命力':51,
    'パワー':15,
    '器用さ':11
  },
  specials:[
    '物理防御◎',
    '魔法防御◎',
    'アクションスキル◎',
    'ケガしにくさ◎',
    '柔軟な体',
    '無心の構え',
    '狙い撃ち',
    '通常攻撃○',
    '対スケルトン○'
  ]
};

function manualBasicChoice(name,target,exp){
  const options=basicOptions(name,exp);
  return options.find(op=>{
    if(!op.items?.length) return Number(target)===Number(document.getElementById('basic_'+name)?.value||1);
    return Number(op.items[0]?.to)===Number(target);
  })||null;
}

function manualSpecialChoice(name,hp){
  const idx=specialNameIndex.get(String(name));
  if(idx==null) return {name,idx:-1,generated:false,reason:'data.jsに名称なし',choice:null};

  if(specialOwned(idx)){
    return {name,idx,generated:true,reason:'取得済みのため追加不要',choice:null,alreadyOwned:true};
  }

  const includeLower=isUpperSpecial(idx);
  const choice=itemForSpecialIndex(idx,hp,includeLower);
  if(!choice){
    return {name,idx,generated:false,reason:'候補生成されない（査定0・データ不備など）',choice:null};
  }

  return {name,idx,generated:true,reason:'候補生成あり',choice};
}

function scoreManualPlan(exp){
  const startLife=initialLifeValue();
  let cost=[0,0,0,0,0];
  let score=0;
  let finalLife=startLife;
  const basicRows=[];
  const missing=[];

  for(const [name,target] of Object.entries(DIAGNOSTIC_MANUAL_PLAN.basicTargets)){
    const current=Number(document.getElementById('basic_'+name)?.value||1);
    if(Number(target)===current) continue;

    const op=manualBasicChoice(name,target,exp);
    if(!op){
      missing.push(`${name}${current}→${target}を基本能力候補として生成できない`);
      continue;
    }

    cost=addCost(cost,op.cost);
    score=Math.round((score+Number(op.score||0))*10)/10;
    if(name==='生命力' && op.life!=null) finalLife=Number(op.life);
    basicRows.push({
      name:`${name} ${current}→${target}`,
      score:Number(op.score||0),
      cost:op.cost.slice()
    });
  }

  const hp=currentHpForLife(finalLife);
  let bits=EMPTY_BITS;
  const specialRows=[];
  const generationRows=[];
  let conflict=false;

  for(const name of DIAGNOSTIC_MANUAL_PLAN.specials){
    const info=manualSpecialChoice(name,hp);
    generationRows.push({
      name,
      generated:info.generated,
      reason:info.reason
    });

    if(!info.generated){
      missing.push(`${name}：${info.reason}`);
      continue;
    }
    if(info.alreadyOwned || !info.choice) continue;

    const op=info.choice;
    if((bits & op.bits)!==EMPTY_BITS){
      conflict=true;
      missing.push(`${name}：手動案内で重複`);
      continue;
    }
    if((bits & op.conflictBits)!==EMPTY_BITS){
      conflict=true;
      missing.push(`${name}：手動案内で相互排他`);
      continue;
    }

    bits|=op.bits;
    cost=addCost(cost,op.cost);
    score=Math.round((score+Number(op.score||0))*10)/10;
    specialRows.push({
      name,
      score:Number(op.score||0),
      cost:op.cost.slice(),
      items:(op.items||[]).map(x=>String(x.name||''))
    });
  }

  const ownedHp=ownedHpDependentBreakdown(finalLife);
  score=Math.round((score+ownedHp.total)*10)/10;

  const feasible=leq(cost,exp) && !conflict && missing.length===0;
  return {
    score,
    cost,
    remain:exp.map((v,i)=>v-cost[i]),
    feasible,
    finalLife,
    hp,
    basicRows,
    specialRows,
    generationRows,
    ownedHp,
    missing
  };
}

function manualPlanHtml(manual,wideResult){
  const wideScore=Number(wideResult?.score||0);
  const diff=Math.round((manual.score-wideScore)*10)/10;

  let verdict='';
  if(!manual.feasible){
    verdict='手動案はツール内部で完全な実行可能候補として組み立てられていません。下の不足・候補生成結果を確認してください。';
  }else if(manual.score>wideScore){
    verdict='手動案の内部査定が検証2を上回っています。候補自体は作れるのに探索途中で落としている可能性が高いです。';
  }else{
    verdict='手動案は内部採点できていますが、ツール内部では検証2以下です。ゲーム内査定との差は、査定データまたは計算式のズレが本命です。';
  }

  const basic=manual.basicRows.length
    ? manual.basicRows.map(r=>`<div>${r.name}：査定 +${r.score}／経験点 ${r.cost.join(',')}</div>`).join('')
    : '<div>基本能力の追加なし</div>';

  const specials=manual.specialRows.length
    ? manual.specialRows.map(r=>`<div>${r.name}：査定 +${r.score}／経験点 ${r.cost.join(',')}<br><small>内部項目：${r.items.join('・')}</small></div>`).join('')
    : '<div>新規特殊能力なし</div>';

  const generated=manual.generationRows.map(r=>
    `<div>${r.generated?'✅':'❌'} ${r.name}：${r.reason}</div>`
  ).join('');

  const missing=manual.missing.length
    ? `<div style="margin-top:8px"><strong>不足・不整合</strong><br>${manual.missing.join('<br>')}</div>`
    : '';

  return `<div class="result-block">
    <h3>手動案・強制内部採点</h3>
    <p>※診断版では、全基本能力について次の節目までの累積査定効率が0.5以上なら優先します。110→115は査定一定のため、115は節目に含めません。査定値そのものは変更していません。</p>
    <p><strong>${verdict}</strong></p>
    <p>内部査定：${manual.score}（検証2比 ${diff>=0?'+':''}${diff}）</p>
    <p>使用経験点：${manual.cost.join(',')}</p>
    <p>残経験点：${manual.remain.join(',')}</p>
    <p>最終生命力：${manual.finalLife}／HP：${manual.hp}</p>
    <p>実行可能判定：${manual.feasible?'✅ 実行可能':'❌ 不完全'}</p>

    <details open>
      <summary>基本能力の強制採点</summary>
      <div style="margin-top:6px">${basic}</div>
    </details>

    <details open>
      <summary>特殊能力の強制採点</summary>
      <div style="margin-top:6px">${specials}</div>
    </details>

    <details open>
      <summary>各手動特殊能力は候補生成されるか</summary>
      <div style="margin-top:6px">${generated}</div>
    </details>

    <details>
      <summary>取得済みHP依存能力の上昇分</summary>
      <div style="margin-top:6px">${diagnosticOwnedHpRows(manual.ownedHp)}</div>
      <div><strong>合計：+${manual.ownedHp.total}</strong></div>
    </details>
    ${missing}
  </div>`;
}

function manualRouteTraceHtml(){
  const planRows=MANUAL_ROUTE_TRACE.plan.map(r=>{
    const category=r.milestonePriority
      ? '節目優先'
      : (r.highRangePriority
          ? '90以上'
          : (r.roleDeprioritized?'ジョブ補正で後回し':'通常'));
    return `<tr><td>${r.order}</td><td>${r.name}</td><td>${category}</td><td>${r.milestoneTarget??'-'}</td><td>${r.milestoneEff.toFixed(4)}</td><td>${Number(r.currentEff||0).toFixed(4)}</td><td>${r.optionCount}</td></tr>`;
  }).join('');

  const basicRows=MANUAL_ROUTE_TRACE.basic.map(r=>
    `<tr><td>${r.ability}</td><td>${r.phase}</td><td>${r.found?'✅ 生存':'❌ 消失'}</td><td>${r.stateCount}</td><td>${r.cost.join(',')}</td></tr>`
  ).join('');

  const specialRows=MANUAL_ROUTE_TRACE.special.map(r=>
    `<tr><td>${r.group}</td><td>${r.choice}</td><td>${r.phase}</td><td>${r.found?'✅ 生存':'❌ 消失'}</td><td>${r.stateCount}</td></tr>`
  ).join('');

  const loss=MANUAL_ROUTE_TRACE.firstLossDetail;
  const lossHtml=loss?`<div class="error-box" style="margin:10px 0">
    <p><strong>消失理由の判定：</strong>${loss.reason}</p>
    <p>消えた状態：査定 ${loss.targetScore}／生命力 ${loss.targetLife}／経験点 ${loss.targetCost.join(',')}</p>
    <p>prune：${loss.beforeCount}件 → ${loss.afterCount}件（上限 ${loss.limit}件）</p>
    <p><strong>prune前の見込み査定順位：</strong>${loss.rawRank}位／${loss.beforeCount}件</p>
    <p><strong>消えた状態：</strong>現在査定 ${loss.targetScore}／特殊能力見込み込み ${loss.targetProjected}</p>
    ${loss.cutoff?`<p><strong>保持境界（${loss.limit}位相当）：</strong>現在査定 ${loss.cutoff.score}／特殊能力見込み込み ${loss.cutoffProjected}／使用経験点合計 ${loss.cutoff.usedCost}／生命力 ${loss.cutoff.life}／経験点 ${loss.cutoff.cost.join(',')}<br>見込み査定差：${loss.projectedToCutoff>=0?'+':''}${loss.projectedToCutoff}<br>${loss.cutoff.items.join('・')||'基本状態'}</p>`:''}
    ${loss.targetItems?.length?`<p><strong>消えた状態の基本能力：</strong>${loss.targetItems.join('・')}</p>`:''}
    ${loss.dominator?`<p><strong>支配候補：</strong>査定 ${loss.dominator.score}／生命力 ${loss.dominator.life}／経験点 ${loss.dominator.cost.join(',')}<br>${loss.dominator.items.join('・')||'基本状態'}</p>`:''}
    ${loss.closest?`<p><strong>最も近い生存候補：</strong>査定 ${loss.closest.score}／生命力 ${loss.closest.life}／経験点 ${loss.closest.cost.join(',')}／距離 ${loss.closest.distance}<br>${loss.closest.items.join('・')||'基本状態'}</p>`:''}
  </div>`:'';

  return `<div class="result-block">
    <h3>手動案系ルートの生存追跡</h3>
    <p><strong>最大目標：</strong>生命力固定なしで検証3（生命力50固定）と同等以上の内部査定を再現する。</p>
    <p>基本能力の途中pruneは、現在査定に「残経験点で取得できそうな高効率特殊能力の見込み査定」を加えて順位付けしています。コツなしHP依存特殊能力は見込み対象から後回しにします。</p>
    <p><strong>最初に消えた箇所：</strong>${MANUAL_ROUTE_TRACE.firstLoss||'最後まで生存'}</p>
    <p>基本能力の手動案状態：${MANUAL_ROUTE_TRACE.baseFound?'✅ 生存':'❌ 消失'}／最終状態：${MANUAL_ROUTE_TRACE.finalFound?'✅ 生存':'❌ 消失'}</p>
    ${lossHtml}

    <details open>
      <summary>実際の基本能力探索順</summary>
      <table class="result-table"><thead><tr><td>順</td><td>能力</td><td>区分</td><td>次節目</td><td>節目効率</td><td>現在効率</td><td>候補数</td></tr></thead><tbody>${planRows||'<tr><td colspan="7">記録なし</td></tr>'}</tbody></table>
    </details>

    <details open>
      <summary>基本能力探索</summary>
      <table class="result-table"><thead><tr><td>能力</td><td>時点</td><td>状態</td><td>保持数</td><td>使用経験点</td></tr></thead><tbody>${basicRows||'<tr><td colspan="5">記録なし</td></tr>'}</tbody></table>
    </details>

    <details open>
      <summary>特殊能力探索</summary>
      <table class="result-table"><thead><tr><td>群</td><td>手動案の選択</td><td>時点</td><td>状態</td><td>保持数</td></tr></thead><tbody>${specialRows||'<tr><td colspan="5">記録なし</td></tr>'}</tbody></table>
    </details>
  </div>`;
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
      });
      setCachedResult(cacheKey,finalCandidate);
    }

    const normalElapsed=((performance.now()-startTime)/1000).toFixed(2);
    const diagnosticRows=[
      diagnosticResultSummary(
        '現行（Upper Bound有効・通常保持上限）',
        finalCandidate,
        normalElapsed
      )
    ];

    diagnosticRunMode='no_ub';
    clearCalcCaches();
    const noUbStart=performance.now();
    const verifyNoUb=await optimizeAsync(exp,msg=>{
      btn.textContent='検証1/2 '+msg.replace('計算中','').trim();
    });
    diagnosticRows.push(diagnosticResultSummary(
      '検証1（Upper Bound無効・通常保持上限）',
      verifyNoUb,
      ((performance.now()-noUbStart)/1000).toFixed(2)
    ));

    diagnosticRunMode='wide';
    clearCalcCaches();
    const wideStart=performance.now();
    const verifyWide=await optimizeAsync(exp,msg=>{
      btn.textContent='検証2/2 '+msg.replace('計算中','').trim();
    });
    diagnosticRows.push(diagnosticResultSummary(
      '検証2（Upper Bound無効・保持上限拡大）',
      verifyWide,
      ((performance.now()-wideStart)/1000).toFixed(2)
    ));

    diagnosticRunMode='life50';
    clearCalcCaches();
    const life50Start=performance.now();
    const verifyLife50=await optimizeAsync(exp,msg=>{
      btn.textContent='検証3/3 '+msg.replace('計算中','').trim();
    });
    diagnosticRows.push(diagnosticResultSummary(
      '検証3（生命力50固定・Upper Bound無効・保持上限拡大）',
      verifyLife50,
      ((performance.now()-life50Start)/1000).toFixed(2)
    ));

    diagnosticRunMode='normal';
    const manualPlan=scoreManualPlan(exp);

    const finalItems=restoreItems(finalCandidate);
    const elapsed=normalElapsed;
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
  <p>${elapsed} 秒（現行計算のみ）</p>
</div>
${diagnosticCompareHtml(diagnosticRows)}
${manualPlanHtml(manualPlan,verifyWide)}
${manualRouteTraceHtml()}`;
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
    diagnosticRunMode='normal';
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

  renderBasic();
  renderSpecials();

  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}


function applyTemporaryDiagnosticPreset(){
  const academyOption=[...academy.options].find(o=>String(o.value).includes('タテレスキュア'));
  if(!academyOption) return;

  academy.value=academyOption.value;
  updateJobs();

  const jobOption=[...job.options].find(o=>String(o.value)==='僧侶');
  if(!jobOption) return;
  job.value=jobOption.value;

  clearBasicState();
  renderBasic();
  renderSpecials();

  const expPreset={
    '筋力':506,
    '敏捷':639,
    '技術':490,
    '知力':145,
    '精神':559
  };
  const basicPreset={
    '生命力':50,
    'パワー':10,
    '魔力':95,
    '器用さ':10,
    '耐久力':90,
    '精神力':50
  };
  const hintPreset={
    '物理攻撃○':3,
    '物理防御○':3,
    '魔法防御○':3,
    '生存本能':1,
    '狙い撃ち':2,
    'アクションスキル◎':3,
    'ケガしにくさ◎':1,
    '免疫強化':3,
    '仲間思い':1,
    '危機察知':2
  };
  const ownedPreset=[
    '忍耐',
    'アクションスキル○',
    '単体攻撃○',
    'ケガしにくさ○',
    '見切り',
    '意志',
    '対弓使い○',
    '対キラービー○',
    '対ハーピー○',
    '対フィッシュ○',
    'バランス感覚'
  ];

  for(const [name,value] of Object.entries(expPreset)){
    const input=document.getElementById('exp_'+name);
    if(input) input.value=value;
  }
  for(const [name,value] of Object.entries(basicPreset)){
    const input=document.getElementById('basic_'+name);
    if(input){
      input.value=value;
      basicOwned[name]=false;
      applyBasicVisual(name);
    }
  }

  specialState.clear();

  for(const [name,level] of Object.entries(hintPreset)){
    const idx=specialNameIndex.get(String(name));
    if(idx!=null) setSpecialHint(idx,level,true);
  }
  for(const name of ownedPreset){
    const idx=specialNameIndex.get(String(name));
    if(idx!=null) setSpecialOwned(idx,true,true);
  }

  renderBasic();
  renderSpecials();

  // renderSpecialsや取得済み連動の後でも基本能力値が消えないよう、最後に再設定する。
  for(const [name,value] of Object.entries(basicPreset)){
    const input=document.getElementById('basic_'+name);
    if(input){
      input.value=String(value);
      basicOwned[name]=false;
      input.disabled=false;
      input.readOnly=false;
      applyBasicVisual(name);
    }
  }

  requestAnimationFrame(()=>{
    for(const [name,value] of Object.entries(basicPreset)){
      const input=document.getElementById('basic_'+name);
      if(input) input.value=String(value);
    }
    validateAllInline();
  });

  validateAllInline();
  document.getElementById('result').textContent='検証条件を自動入力しました。「計算する」を押してください。';
}

document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
ensureCancelButton();
removeTemporaryVersionDisplay();
initAcademies(); renderExp(); renderBasic(); renderSpecials(); validateAllInline();
applyTemporaryDiagnosticPreset();
})();