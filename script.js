(function(){
// v8.0 高精度専用：安全な総経験点Upper Boundを追加。査定条件・保持上限・候補集合は変更なし。
// Speed optimized v5: high-accuracy path overhead reduction; calculation progress is shown only on the button.
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const MAX_EXP_SAMPLES=6;
let expSamples=[Object.fromEntries(expNames.map(n=>[n,'']))];
let plannedExp=Object.fromEntries(expNames.map(n=>[n,'']));
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const basicIconMap={生命力:'❤️',パワー:'⚔️',器用さ:'🎯',精神力:'🔥'};
const mutualGroups=[
  ['生存本能','闘争本能'],
  ['柔軟な体','頑丈な体'],
  ['無心の構え','護身の構え'],
  ['力学の理解','魔法の理解']
];
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1]);});
const jobClassMap={
  '剣士':'job-swordsman',
  '重戦士':'job-heavy',
  '弓使い':'job-archer',
  '双剣士':'job-dual',
  '魔法使い':'job-mage',
  '僧侶':'job-priest',
  '魔闘士':'job-spellblade'
};
const orderedJobNames=Object.keys(jobClassMap);
const academy=document.getElementById('academy');
const job=document.getElementById('job');
const DEFAULT_EXP_LIMIT=1000;
const BOOTRAIN_EXP_LIMITS={筋力:1300,敏捷:1200,技術:1400,知力:1300,精神:1200};
function expLimit(name){
  return academy?.value==='ブートレインアカデミー'
    ? Number(BOOTRAIN_EXP_LIMITS[name]||DEFAULT_EXP_LIMIT)
    : DEFAULT_EXP_LIMIT;
}
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
let activeCalcWorker=null;
let activeCalcWorkerReject=null;

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
function updateInputAvailabilityUI(){
  const jobField=document.getElementById('jobFieldLabel');
  const basicCard=document.getElementById('basicCard');
  const academyMissing=!academy.value;
  const basicLocked=!hasAcademyJob();

  if(jobField) jobField.classList.toggle('is-locked',academyMissing);
  if(basicCard) basicCard.classList.toggle('is-locked',basicLocked);
}
function updateJobs(){
  const jobs=jobsByAcademy[academy.value]||[];
  job.innerHTML=''; job.add(opt('ジョブを選択',''));
  jobs.forEach(j=>job.add(opt(j)));
  job.disabled=!academy.value;
  updateInputAvailabilityUI();
  clearBasicState(); renderBasic(); renderSpecials(); applyCurrentJobTheme();
}
academy.addEventListener('change',()=>{updateJobs();renderExp();validateAllInline();});
job.addEventListener('change',()=>{
  updateInputAvailabilityUI();
  clearBasicState();renderBasic();renderSpecials();applyCurrentJobTheme();
});

function clearBasicState(){basicNames.forEach(n=>{basicOwned[n]=false; basicHints[n]=basicHints[n]||0;});}
function setBasicOwnedState(name,on,{clearValueOnRelease=false}={}){
  basicOwned[name]=!!on;
  const inp=document.getElementById('basic_'+name);
  if(!basicOwned[name] && clearValueOnRelease && inp) inp.value='';
  applyBasicVisual(name);
}
function safeId(s){return String(s).replace(/[^a-zA-Z0-9_぀-ヿ㐀-鿿]/g,'_');}
function sampleLabel(index){
  return `パターン${['A','B','C','D','E','F'][index]||String.fromCharCode(65+index)}`;
}
function sampleLabelHtml(index){
  return `<span class="pattern-label">${sampleLabel(index)}</span>`;
}
function sampleErrorPrefix(index){
  return expSamples.length>1 ? `${sampleLabelHtml(index)}の` : '';
}
function syncExpSamplesFromDom(){
  expSamples=expSamples.map((sample,index)=>{
    const next={...sample};
    expNames.forEach(name=>{
      const inp=document.getElementById(`exp_${index}_${safeId(name)}`);
      if(inp) next[name]=inp.value;
    });
    return next;
  });
  if(expSamples.length>1){
    expNames.forEach(name=>{
      const inp=document.getElementById(`planned_exp_${safeId(name)}`);
      if(inp) plannedExp[name]=inp.value;
    });
  }
}
function updateResultTitle(){
  const el=document.getElementById('resultTitle');
  if(!el) return;
  el.textContent = expSamples.length>1 ? '結果（査定上昇量）' : '結果';
}
function isExpSampleReady(sample){
  if(!academy.value || !sample) return false;
  return expNames.every(name=>{
    const value=sample[name];
    if(value==='' || value==null) return false;
    const num=Number(value);
    return Number.isFinite(num) && num>=0 && num<=expLimit(name);
  });
}
function updateExpActionStates(sampleIndex){
  const ready=isExpSampleReady(expSamples[sampleIndex]);
  const limitReached=expSamples.length>=MAX_EXP_SAMPLES;
  document.querySelectorAll(`.exp-action-btn[data-sample-index="${sampleIndex}"]`).forEach(btn=>{
    const action=btn.dataset.expAction;
    if(action==='duplicate' || action==='add'){
      btn.disabled=!ready || limitReached;
      btn.setAttribute('aria-disabled',btn.disabled?'true':'false');
    }
  });
}
function renderExp(){
  const inputsLocked=!academy.value;
  const wrap=document.getElementById('expInputs');
  const limitReached=expSamples.length>=MAX_EXP_SAMPLES;
  const plannedHtml=expSamples.length>1?`
    <div class="planned-exp-block">
      <div class="planned-exp-title">訓練後の付与予定経験点</div>
      <div class="exp-list planned-exp-list">
        ${expNames.map(name=>`<div class="exp-row"><label>${name}</label><input type="number" min="0" id="planned_exp_${safeId(name)}" data-planned-exp-name="${name}" value="${plannedExp[name]??''}" inputmode="numeric" autocomplete="off"><div class="inline-error" id="err_planned_exp_${safeId(name)}"></div></div>`).join('')}
      </div>
    </div>`:'';
  wrap.innerHTML=plannedHtml+expSamples.map((sample,index)=>{
    const actionsLocked=!isExpSampleReady(sample) || limitReached;
    return `
    <div class="exp-sample" data-sample-index="${index}">
      ${expSamples.length>1?`<div class="exp-sample-head"><h3>${sampleLabelHtml(index)}</h3></div>`:''}
      <div class="exp-list">
        ${expNames.map(name=>`<div class="exp-row"><label>${name}</label><input type="number" min="0" max="${expLimit(name)}" id="exp_${index}_${safeId(name)}" data-exp-name="${name}" data-sample-index="${index}" ${inputsLocked?'disabled aria-disabled="true"':''} value="${sample[name]??''}" inputmode="numeric" autocomplete="off"><div class="inline-error" id="err_exp_${index}_${safeId(name)}"></div></div>`).join('')}
      </div>
      <div class="exp-sample-actions">
        <button type="button" class="secondary exp-action-btn" data-exp-action="duplicate" data-sample-index="${index}" ${actionsLocked?'disabled aria-disabled="true"':'aria-disabled="false"'}>パターンを複製</button>
        <button type="button" class="secondary exp-action-btn" data-exp-action="add" data-sample-index="${index}" ${actionsLocked?'disabled aria-disabled="true"':'aria-disabled="false"'}>パターンを追加</button>
        ${index>0?`<button type="button" class="secondary exp-action-btn exp-delete-btn" data-exp-action="remove" data-sample-index="${index}">削除</button>`:''}
      </div>
    </div>`;
  }).join('');
  updateResultTitle();
}


function applyCurrentJobTheme(){
  document.getElementById('specialTitle').textContent='特殊能力';
  document.body.classList.remove(...Object.values(jobClassMap).map(cls=>`theme-${cls}`));
  const cls=jobClassMap[job.value];
  if(cls) document.body.classList.add(`theme-${cls}`);
}
function formatErrorMessage(message){
  const text=String(message??'');
  const keepExpTogether=value=>value.replace(/経験点/g,'<span class="error-no-break">経験点</span>');
  if(/\d+以下の値を入力してください。/.test(text)){
    return keepExpTogether(text.replace(
      /(\d+以下の値を)入力してください。/g,
      '$1<br><span class="error-no-break">入力してください。</span>'
    ));
  }
  return keepExpTogether(text.replace(
    /入力してください。/g,
    '<span class="error-no-break">入力してください。</span>'
  ));
}
function renderErrorBox(messages){
  const items=(messages||[]).map(msg=>`<li>${formatErrorMessage(msg)}</li>`).join('');
  return `<div class="error-box"><ul class="error-box-list">${items}</ul></div>`;
}


function animateResultCard(){
  const card=document.querySelector('.result-card');
  if(!card) return;
  card.classList.remove('result-card-complete');
  // 同じ条件で再計算した場合でもアニメーションを再実行する。
  void card.offsetWidth;
  card.classList.add('result-card-complete');
}

function basicNameHtml(name){
  let iconHtml='';
  if(name==='魔力'){
    iconHtml=`<svg class="ability-name-svg magic-wand-icon" viewBox="0 0 42 42" aria-hidden="true" focusable="false"><defs><linearGradient id="magicWandShaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b57635"/><stop offset=".48" stop-color="#77461d"/><stop offset="1" stop-color="#3d210e"/></linearGradient><linearGradient id="magicWandGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a4"/><stop offset=".42" stop-color="#e5b24b"/><stop offset=".75" stop-color="#bd771e"/><stop offset="1" stop-color="#7d430e"/></linearGradient><radialGradient id="magicWandGem" cx="35%" cy="28%" r="78%"><stop offset="0" stop-color="#effcff"/><stop offset=".35" stop-color="#8bdcff"/><stop offset=".72" stop-color="#3d8dcc"/><stop offset="1" stop-color="#214c82"/></radialGradient></defs><path d="M9.4 35.3 22.7 21.1" fill="none" stroke="#43220d" stroke-width="7" stroke-linecap="round"/><path d="M9.4 35.3 22.7 21.1" fill="none" stroke="url(#magicWandShaft)" stroke-width="4.6" stroke-linecap="round"/><path d="m8.4 34.2 2.6 3" fill="none" stroke="url(#magicWandGold)" stroke-width="2.8" stroke-linecap="round"/><path d="m20.9 23.4 4.1-4.2" fill="none" stroke="url(#magicWandGold)" stroke-width="3" stroke-linecap="round"/><path d="M23.4 18.7c-2.2-2.8-2.1-7 .2-9.8 2.5-3 7-4.1 10.6-2.5 3.8 1.7 5.6 6 4.3 9.7-1.1 3.3-4.2 5.7-7.7 5.9-2.9.2-5.6-1.1-7.4-3.3Z" fill="url(#magicWandGold)" stroke="#653613" stroke-width="1.8" stroke-linejoin="round"/><path d="M26.4 11.3 31 8.1l4.6 3.2v5.3L31 19.8l-4.6-3.2Z" fill="url(#magicWandGem)" stroke="#244a76" stroke-width="1.5" stroke-linejoin="round"/><path d="M31 8.1v11.7M26.4 11.3h9.2" fill="none" stroke="#f7fdff" stroke-width="1.15" opacity=".72"/><path d="M25.3 8.9c2.1-1.9 5-2.7 7.8-2.1" fill="none" stroke="#fff1a9" stroke-width="1.45" stroke-linecap="round" opacity=".9"/><path d="M36.3 10.2c.8 1.8.8 3.8.1 5.6" fill="none" stroke="#895216" stroke-width="1.15" stroke-linecap="round" opacity=".7"/></svg>`;
  }else if(name==='耐久力'){
    iconHtml=`<svg class="ability-name-svg durability-shield-icon" viewBox="0 0 32 36" aria-hidden="true" focusable="false"><path d="M16 2.5 28 7v9.2c0 8.2-5.2 14-12 17.3C9.2 30.2 4 24.4 4 16.2V7z" fill="#1f4f7a" stroke="#173852" stroke-width="2" stroke-linejoin="round"/><path d="M16 5.6 24.8 9v7c0 6.1-3.6 10.7-8.8 13.6-5.2-2.9-8.8-7.5-8.8-13.6V9z" fill="#dceaf4" stroke="#7fa9c7" stroke-width="1.4"/><path d="M16 5.6v24" stroke="#4d83aa" stroke-width="2"/><path d="M8.4 11.2 16 8.5l7.6 2.7" fill="none" stroke="#ffffff" stroke-width="1.3" opacity=".9"/></svg>`;
  }else{
    const icon=basicIconMap[name]||'';
    if(icon) iconHtml=`<span class="fixed-icon ability-name-icon" aria-hidden="true">${icon}</span>`;
  }
  return `<span class="ability-name-text"><span class="ability-name-label">${name}</span>${iconHtml}</span>`;
}

function renderBasic(){
  const wrap=document.getElementById('basicInputs');
  const lim=limits();
  const disabled=!hasAcademyJob();
  wrap.innerHTML=basicNames.map(n=>`
    <div class="ability-block">
      <div class="ability-row ${basicOwned[n]?'owned':''}" data-basic="${n}">
        <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}" ${disabled?'disabled aria-disabled="true"':''}>＋</button>
        <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}" ${disabled?'disabled aria-disabled="true"':''}>${basicNameHtml(n)}</button>
        <input class="ability-value" type="number" min="1" ${lim[n]?`max="${lim[n]}"`:''} id="basic_${n}" inputmode="numeric" autocomplete="off" ${disabled?'disabled aria-disabled="true"':''}>
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
  if(hintBtn){
    hintBtn.disabled=disabled;
    hintBtn.setAttribute('aria-disabled',disabled?'true':'false');
  }
  const btn=row.querySelector('.name-btn');
  if(btn){
    btn.disabled=disabled;
    btn.setAttribute('aria-disabled',disabled?'true':'false');
    btn.innerHTML=`${basicNameHtml(name)}${ownedLabel(!!basicOwned[name])}`;
  }
  const inp=document.getElementById('basic_'+name);
  if(inp){
    // アカデミーとジョブが揃うまでは、基本能力は完全に操作不可。
    // 両方選択後は従来どおり入力でき、取得済み能力のみ固定する。
    inp.disabled=disabled || !!basicOwned[name];
    inp.readOnly=false;
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
  if(!on){
    window.__PAWAADO_REMOVE_SUPERS_REQUIRING_SPECIAL__?.(String(D.special[i]?.[1]||''));
  }
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
  const expAction=t.dataset.expAction;
  if(expAction){
    syncExpSamplesFromDom();
    const index=Number(t.dataset.sampleIndex);
    if(expAction==='add' && expSamples.length<MAX_EXP_SAMPLES){
      const insertAt=Number.isInteger(index) && index>=0 ? index+1 : expSamples.length;
      expSamples.splice(insertAt,0,Object.fromEntries(expNames.map(n=>[n,''])));
    }else if(expAction==='duplicate' && expSamples.length<MAX_EXP_SAMPLES && expSamples[index]){
      expSamples.splice(index+1,0,{...expSamples[index]});
    }else if(expAction==='remove' && index>0 && expSamples[index]){
      expSamples.splice(index,1);
    }
    renderExp();
    validateAllInline();
    return;
  }
  const kind=t.dataset.kind;
  if(kind==='basic-hint'){if(!hasAcademyJob()) return; const name=t.dataset.name; basicHints[name]=cycleHint(basicHints[name]); applyBasicVisual(name); return;}
  if(kind==='basic-name'){
    const name=t.dataset.name;
    if(!hasAcademyJob()) return;
    // 「取得済」を解除した場合は、右側の能力値も必ず空欄へ戻す。
    setBasicOwnedState(name,!basicOwned[name],{clearValueOnRelease:true});
    return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});


function setInlineError(id,msg){const el=document.getElementById(id); if(el) el.textContent=msg||'';}

function validateExpField(sampleIndex,name){
  const inp=document.getElementById(`exp_${sampleIndex}_${safeId(name)}`); if(!inp) return '';
  const v=inp.value;
  let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    const max=expLimit(name);
    if(!Number.isFinite(num) || num<0) msg='経験点は0以上の値を入力してください';
    else if(num>max) msg=`経験点は${max}以下の値を入力してください`;
  }
  setInlineError(`err_exp_${sampleIndex}_${safeId(name)}`,msg);
  inp.classList.toggle('input-error',!!msg);
  return msg;
}
function validatePlannedExpField(name){
  const inp=document.getElementById(`planned_exp_${safeId(name)}`); if(!inp) return '';
  const v=inp.value; let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    if(!Number.isFinite(num) || num<0) msg='0以上で入力してください';
  }
  setInlineError(`err_planned_exp_${safeId(name)}`,msg);
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
function validateAllInline(){expSamples.forEach((_,i)=>expNames.forEach(n=>validateExpField(i,n))); if(expSamples.length>1)expNames.forEach(validatePlannedExpField); basicNames.forEach(validateBasicField);}

document.addEventListener('input',e=>{
  if(isCalculating) return;
  const inp=e.target;
  if(!inp || !inp.id) return;
  if(inp.dataset.expName!=null){
    const i=Number(inp.dataset.sampleIndex);
    expSamples[i][inp.dataset.expName]=inp.value;
    validateExpField(i,inp.dataset.expName);
    updateExpActionStates(i);
    return;
  }
  if(inp.dataset.plannedExpName!=null){
    plannedExp[inp.dataset.plannedExpName]=inp.value;
    validatePlannedExpField(inp.dataset.plannedExpName);
    calcResultCache.clear();
    return;
  }
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

// 査定の端数は全項目を合算した最後にだけ切り捨てる。
// 整数境界付近の二進浮動小数点誤差だけを補正する。
function finalizeScore(value){
  const score=Number(value||0);
  const nearest=Math.round(score);
  return Math.floor(Math.abs(score-nearest)<1e-9?nearest:score);
}
function jobScoreIndex(){if(['剣士','弓使い','重戦士','双剣士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士','双剣士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return fixed+hp*rate;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}



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


function addCost(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3],a[4]+b[4]];}

function key5(c0,c1,c2,c3,c4){
  if(c0>1500||c1>1500||c2>1500||c3>1500||c4>1500) return 'x:'+c0+','+c1+','+c2+','+c3+','+c4;
  return String(((((c0*1501+c1)*1501+c2)*1501+c3)*1501+c4));
}
function key(c){return key5(c[0],c[1],c[2],c[3],c[4]);}
function stateKey(st){
  if(st._stateKey!==undefined && st._stateKey!==null) return st._stateKey;
  const value=key(st.cost)+'|'+scopeKeyFor(st.life,st.bits??EMPTY_BITS);
  st._stateKey=value;
  return value;
}
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



















const specialItemCache=new Map();
const specialGroupCache=new Map();
const filteredSpecialGroupCache=new Map();
const orderedSpecialGroupCache=new Map();
const calcResultCache=new Map();

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
  const resistancePart=typeof window.__PAWAADO_RESISTANCE_SIGNATURE__==='function'
    ? window.__PAWAADO_RESISTANCE_SIGNATURE__()
    : '';
  const dualPart=typeof window.__PAWAADO_DUAL_ATTACK_SIGNATURE__==='function'
    ? window.__PAWAADO_DUAL_ATTACK_SIGNATURE__()
    : '';
  return [academy.value,job.value,currentCalcMode(),key(exp),basicPart,specialPart,'dualAttack:'+dualPart,'extraResistance:'+resistancePart].join('||');
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




function currentCalcMode(){return 'high';}

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
    if(activeCalcWorker){
      const reject=activeCalcWorkerReject;
      cleanupActiveWorker();
      if(reject) reject(new CalculationCancelledError());
    }
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


async 

// v11.8: Web Worker高速版。進捗表示を固定の「計算中」に戻す。
// 各状態から「基本能力の次の1」「基本能力の次節目」「取得可能な特殊能力」を
// 同じ査定効率で比較し、上位候補へ分岐する。
const MIXED_BRANCH_NORMAL=7;
const MIXED_MAX_STEPS=90;

// 混在探索高速化用。計算条件が変わるたびに初期化する。
let mixedBasicOptionCache=new Map();
let mixedHpDeltaCache=new Map();

















async 

function workerSpecialState(){
  const effective=new Map(
    [...specialState.entries()].map(([index,state])=>[
      String(index),
      {hint:Number(state?.hint||0),own:Number(state?.own||0)}
    ])
  );
  const resistanceRows=typeof window.__PAWAADO_GET_EXTRA_RESISTANCES__==='function'
    ? window.__PAWAADO_GET_EXTRA_RESISTANCES__()
    : [];
  const selectedSupers=new Set(resistanceRows.map(row=>String(row?.name||'')).filter(Boolean));
  for(const superName of selectedSupers){
    for(const name of D.superResistances?.[superName]?.includes||[]){
      const index=specialNameIndex.get(String(name));
      if(index===undefined) continue;
      const key=String(index);
      const state=effective.get(key)||{hint:0,own:0};
      effective.set(key,{...state,own:1});
    }
  }
  return [...effective.entries()];
}
function buildWorkerPayload(exp){
  const basicValues={};
  for(const name of basicNames){
    basicValues[name]=Number(document.getElementById('basic_'+name)?.value||1);
  }
  return {
    academy:String(academy.value||''),
    job:String(job.value||''),
    exp:exp.slice(),
    basicValues,
    basicOwned:{...basicOwned},
    basicHints:{...basicHints},
    specialState:workerSpecialState()
  };
}
function cleanupActiveWorker(){
  if(activeCalcWorker){
    activeCalcWorker.terminate();
    activeCalcWorker=null;
  }
  activeCalcWorkerReject=null;
}
function ensureActiveCalcWorker(){
  if(activeCalcWorker) return activeCalcWorker;
  if(typeof Worker==='undefined'){
    throw new Error('このブラウザではWeb Workerを利用できません。');
  }
  activeCalcWorker=new Worker('./pawaado_worker.js?v=20261002-script-audit-2');
  return activeCalcWorker;
}
async function optimizeAsync(exp){
  await yieldToBrowser();

  const payload=buildWorkerPayload(exp);

  return await new Promise((resolve,reject)=>{
    const worker=ensureActiveCalcWorker();
    activeCalcWorkerReject=reject;

    const finishRequest=()=>{
      if(activeCalcWorkerReject===reject) activeCalcWorkerReject=null;
      worker.onmessage=null;
      worker.onerror=null;
    };

    worker.onmessage=(event)=>{
      const data=event.data||{};

      if(data.type==='result'){
        finishRequest();
        const result=data.result||{};
        const items=Array.isArray(result.items)?result.items:[];
        resolve({
          cost:Array.isArray(result.cost)?result.cost:[0,0,0,0,0],
          score:Number(result.score||0),
          life:result.life??null,
          items,
          itemLen:Number(result.itemLen||items.length),
          bits:specialItemsBits(items),
          usedCost:Number(result.usedCost??costSum(result.cost||[0,0,0,0,0])),
          ownedHpDelta:Number(result.ownedHpDelta||0)
        });
      }else if(data.type==='error'){
        finishRequest();
        const err=new Error(data.message||'Worker内で計算エラーが発生しました。');
        err.name=data.name||'WorkerError';
        reject(err);
      }
    };

    worker.onerror=(event)=>{
      finishRequest();
      cleanupActiveWorker();
      reject(new Error(event.message||'Workerの読み込みまたは実行に失敗しました。'));
    };

    worker.postMessage({type:'calculate',payload});
  });
}

function mergeBasicResultItems(items){
  const sorted=items.slice().sort((a,b)=>{
    const idxDiff=(a.idx??0)-(b.idx??0);
    if(idxDiff!==0) return idxDiff;
    return Number(a.from??0)-Number(b.from??0);
  });

  const merged=[];
  for(const item of sorted){
    const current={
      ...item,
      from:Number(item.from),
      to:Number(item.to)
    };
    const prev=merged[merged.length-1];

    if(prev &&
       prev.name===current.name &&
       Number(prev.idx??0)===Number(current.idx??0) &&
       Number(prev.to)===Number(current.from)){
      prev.to=current.to;
    }else{
      merged.push(current);
    }
  }
  return merged;
}
function resultTable(items,kind){
  let filtered=items.filter(x=>x.type===kind);
  if(kind==='special'){
    let chosenBits=EMPTY_BITS;
    filtered.forEach(x=>{ if(Number.isFinite(Number(x.idx))) chosenBits|=specialBit(Number(x.idx)); });
    filtered=filtered.filter(x=>{const ui=upperIndex(x.idx); return !(ui>=0 && (chosenBits & specialBit(ui))!==EMPTY_BITS);});
  }else if(kind==='basic'){
    filtered=mergeBasicResultItems(filtered);
  }

  if(!filtered.length) return '<p class="result-empty"><strong>追加なし</strong></p>';

  const sorted=filtered.sort((a,b)=>(a.idx??0)-(b.idx??0));
  const rows=sorted.map(c=>`<tr><td>${kind==='basic'?`${c.name} ${c.from} → ${c.to}`:renderSkillName(c.name)}</td></tr>`).join('');
  const tableClass=kind==='basic'?'basic-result-table':'special-result-table';
  return `<table class="result-table ${tableClass}"><tbody>${rows}</tbody></table>`;
}
function validateInputs(){
  const errs=[];
  if(!academy.value) errs.push('アカデミー及びジョブを選択してください。');
  else if(!job.value) errs.push('ジョブを選択してください。');

  syncExpSamplesFromDom();
  const expErrs=[];

  expSamples.forEach((sample,index)=>{
    const rawValues=expNames.map(n=>sample[n]);
    const allBlank=rawValues.every(v=>v==='' || v==null);
    if(allBlank){
      expErrs.push(expSamples.length>1 ? `${sampleLabel(index)}の経験点を入力してください。` : '経験点を入力してください。');
      return;
    }

    expNames.forEach(n=>{
      const v=sample[n];
      if(v==='' || v==null){
        expErrs.push(`${sampleErrorPrefix(index)}${n}経験点を入力してください。`);
        return;
      }
      const num=Number(v);
      const max=expLimit(n);
      if(!Number.isFinite(num) || num<0) expErrs.push(`${sampleErrorPrefix(index)}${n}経験点は0以上の値を入力してください。`);
      if(num>max) expErrs.push(`${sampleErrorPrefix(index)}${n}経験点は${max}以下の値を入力してください。`);
    });
  });

  const validSampleValues=expSamples.map(sample=>{
    const rawValues=expNames.map(n=>sample[n]);
    if(rawValues.some(v=>v==='' || v==null)) return null;
    const values=rawValues.map(v=>Number(v));
    if(!values.every((v,i)=>Number.isFinite(v) && v>=0 && v<=expLimit(expNames[i]))) return null;
    return values;
  });

  for(let i=0;i<validSampleValues.length;i++){
    if(!validSampleValues[i]) continue;
    for(let j=i+1;j<validSampleValues.length;j++){
      if(!validSampleValues[j]) continue;
      const same=validSampleValues[i].every((value,k)=>value===validSampleValues[j][k]);
      if(same) expErrs.push(`${sampleLabelHtml(i)}と${sampleLabelHtml(j)}に同じ経験点が入力されています。`);
    }
  }

  if(expSamples.length>1){
    expNames.forEach(name=>{
      const v=plannedExp[name];
      if(v==='' || v==null) return;
      const num=Number(v);
      if(!Number.isFinite(num) || num<0) expErrs.push(`${name}の付与予定経験点は0以上の値を入力してください。`);
    });
  }

  errs.push(...expErrs);

  if(!hasAcademyJob()){
    // 基本能力はアカデミー・ジョブ両方の選択後に入力可能になるため、
    // 未選択時は個別項目ではなくまとめて未入力を案内する。
    errs.push('基本能力を入力してください。');
  }else{
    const lim=limits();
    const basicStates=basicNames.map(name=>{
      const value=document.getElementById('basic_'+name)?.value;
      return {name,value,owned:!!basicOwned[name]};
    });
    const requiredBasics=basicStates.filter(item=>!item.owned);
    const missingBasics=requiredBasics.filter(item=>item.value==='' || item.value==null);
    // 上限値への到達などで「取得済」扱いになった能力も、入力済みとして数える。
    const anyBasicValue=basicStates.some(item=>item.owned || (item.value!=='' && item.value!=null));

    if(requiredBasics.length && missingBasics.length===requiredBasics.length && !anyBasicValue){
      errs.push('基本能力を入力してください。');
    }else{
      requiredBasics.forEach(item=>{
        if(item.value==='' || item.value==null){
          errs.push(`${item.name}を入力してください。`);
          return;
        }
        const num=Number(item.value);
        if(!Number.isFinite(num) || num<1) errs.push(`${item.name}は1以上の値を入力してください。`);
        if(lim[item.name]!=null && num>lim[item.name]) errs.push(`${item.name}は入力上限を超えています。`);
      });
    }
  }

  return errs;
}
























function sampleResultHtml(entry,index,multiple=false){
  const finalItems=restoreItems(entry.candidate);
  const remain=entry.exp.map((v,i)=>v-(entry.candidate.cost?.[i]||0));
  const inputSummary=expNames.map((n,i)=>`${n}${entry.exp[i]}`).join('／');
  const headerHtml=multiple
    ? `<h3 class="sample-result-title">${sampleLabelHtml(index)}${entry.isBest?' <span class="best-badge">最高</span>':''}</h3><p class="sample-input-summary">${inputSummary}</p>`
    : '';
  const scoreText=`+${Math.abs(Number(entry.scoreGain||0))}`;
  const remainHtml=expNames.map((n,i)=>`<div class="remain-item"><span class="remain-name">${n}</span><span class="remain-value">${remain[i]}</span></div>`).join('');
  return `<div class="sample-result ${multiple&&entry.isBest?'best-sample-result':''} ${multiple?'':'single-sample-result'}">
    ${headerHtml}
    <div class="result-block"><h3>基本能力</h3>${resultTable(finalItems,'basic')}</div>
    <div class="result-block"><h3>${job.value==='双剣士'?'特殊能力等':'特殊能力'}</h3>${resultTable(finalItems,'special')}</div>
    <div class="result-block score-result-block"><h3>査定上昇量</h3><span class="score-gain">${scoreText}</span></div>
    <div class="result-block"><h3>残経験点</h3><div class="remain-grid">${remainHtml}</div></div>
  </div>`;
}
function rankedEntries(entries){
  return entries.slice().sort((a,b)=>b.scoreGain-a.scoreGain || a.index-b.index);
}
function comparisonHtml(entries){
  if(entries.length<2) return '';
  const ranked=rankedEntries(entries);
  return `<div class="comparison-block"><table class="result-table comparison-table"><tbody>${ranked.map((entry,rank)=>`<tr class="${rank===0?'best-row':''}"><td>${rank+1}位</td><td>${sampleLabelHtml(entry.index)}</td><td>+${Math.abs(Number(entry.scoreGain||0))}</td></tr>`).join('')}</tbody></table></div>`;
}

function plannedExpNeedsConfirmation(){
  return expSamples.length>1 && expNames.some(name=>plannedExp[name]==='' || plannedExp[name]==null);
}
function confirmMissingPlannedExp(){
  const modal=document.getElementById('plannedExpConfirmModal');
  const yes=document.getElementById('plannedExpConfirmYes');
  const no=document.getElementById('plannedExpConfirmNo');
  if(!modal || !yes || !no) return Promise.resolve(false);

  const previousFocus=document.activeElement;
  modal.hidden=false;
  document.body.classList.add('modal-open');

  return new Promise(resolve=>{
    let settled=false;
    const finish=value=>{
      if(settled) return;
      settled=true;
      modal.hidden=true;
      document.body.classList.remove('modal-open');
      yes.removeEventListener('click',onYes);
      no.removeEventListener('click',onNo);
      document.removeEventListener('keydown',onKeyDown,true);
      previousFocus?.focus?.();
      resolve(value);
    };
    const onYes=()=>finish(true);
    const onNo=()=>finish(false);
    const onKeyDown=event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        finish(false);
      }
    };
    yes.addEventListener('click',onYes);
    no.addEventListener('click',onNo);
    document.addEventListener('keydown',onKeyDown,true);
    no.focus();
  });
}

async function calc(){
  validateAllInline();

  const result=document.getElementById('result');
  const errs=validateInputs();
  if(errs.length){
    result.innerHTML=renderErrorBox(errs);
    return;
  }

  if(plannedExpNeedsConfirmation()){
    const proceed=await confirmMissingPlannedExp();
    if(!proceed) return;
  }

  const planned=expSamples.length>1?expNames.map(n=>Number(plannedExp[n]||0)):[0,0,0,0,0];
  const sampleExps=expSamples.map(sample=>expNames.map((n,i)=>Number(sample[n]||0)+planned[i]));
  const btn=document.getElementById('calcBtn');
  const cancelBtn=ensureCancelButton();

  const controls=[...document.querySelectorAll('button,input,select')];
  const disabledBeforeCalc=new Map(controls.map(el=>[el,!!el.disabled]));

  cancelRequested=false;
  isCalculating=true;
  document.body.classList.add('is-calculating');
  controls.forEach(el=>{
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
    const entries=[];
    for(let index=0;index<sampleExps.length;index++){
      throwIfCancelled();
      const exp=sampleExps[index];
      btn.textContent=sampleExps.length===1?'計算中':`${sampleLabel(index)} 計算中`;
      const cacheKey=calcCacheKey(exp);
      let candidate=getCachedResult(cacheKey);
      if(!candidate){
        candidate=await optimizeAsync(exp);
        setCachedResult(cacheKey,candidate);
      }
      entries.push({
        index,
        exp,
        candidate,
        scoreGain:finalizeScore(candidate.score),
        isBest:false
      });
      btn.textContent=`${index+1}/${sampleExps.length} 完了`;
      await yieldToBrowser();
    }

    const maxScore=Math.max(...entries.map(x=>x.scoreGain));
    entries.forEach(x=>{x.isBest=x.scoreGain===maxScore;});
    const multiple=entries.length>1;
    const displayEntries=multiple?rankedEntries(entries):entries;
    result.innerHTML=comparisonHtml(entries)+displayEntries.map((entry)=>sampleResultHtml(entry,entry.index,multiple)).join('');
    animateResultCard();
  }catch(err){
    if(err?.name==='CalculationCancelledError'){
      result.innerHTML=`<div class="result-block"><p>計算をキャンセルしました。</p><p>条件を変更して、もう一度「計算する」を押してください。</p></div>`;
    }else{
      const name=err?.name||'Error';
      const message=err?.message||'原因不明のエラーです';
      result.innerHTML=renderErrorBox(['計算中にエラーが発生しました。',name,message]);
      console.error(err);
    }
  }finally{
    cleanupActiveWorker();
    isCalculating=false;
    document.body.classList.remove('is-calculating');
    for(const [el,wasDisabled] of disabledBeforeCalc){
      if(el.isConnected) el.disabled=wasDisabled;
    }
    job.disabled=!academy.value;
    basicNames.forEach(n=>applyBasicVisual(n));
    D.special.forEach((_,i)=>applySkillVisual(i));
    renderExp();
    btn.disabled=false;
    btn.textContent='計算する';
    cancelBtn.disabled=false;
    cancelBtn.textContent='キャンセル';
    cancelBtn.style.display='none';
    cancelRequested=false;
  }
}


function setupUsageModal(){
  const modal=document.getElementById('usageModal');
  const openBtn=document.getElementById('usageBtn');
  const closeBtn=document.getElementById('usageCloseBtn');
  if(!modal || !openBtn || !closeBtn) return;

  let previousFocus=null;
  const openModal=()=>{
    previousFocus=document.activeElement;
    modal.hidden=false;
    document.body.classList.add('modal-open');
    closeBtn.focus();
  };
  const closeModal=()=>{
    if(modal.hidden) return;
    modal.hidden=true;
    document.body.classList.remove('modal-open');
    if(previousFocus && typeof previousFocus.focus==='function') previousFocus.focus();
  };

  openBtn.addEventListener('click',openModal);
  closeBtn.addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{
    if(e.target?.dataset?.modalClose==='true') closeModal();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !modal.hidden) closeModal();
  });
}

function resetAll(){
  expSamples=[Object.fromEntries(expNames.map(n=>[n,'']))];
  plannedExp=Object.fromEntries(expNames.map(n=>[n,'']));
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value='';});

  academy.value='';
  updateJobs();

  Object.keys(basicOwned).forEach(k=>basicOwned[k]=false);
  Object.keys(basicHints).forEach(k=>basicHints[k]=0);

  specialState.clear();
  calcResultCache.clear();

  renderExp();
  updateResultTitle();
  renderBasic();
  renderSpecials();
  applyCurrentJobTheme();

  document.getElementById('result').textContent='';
}


window.__PAWAADO_APPLY_SUPER_INCLUDED_SPECIALS__=superName=>{
  for(const name of D.superResistances?.[String(superName||'')]?.includes||[]){
    const index=specialNameIndex.get(String(name));
    if(index!==undefined) setSpecialOwned(index,true);
  }
};

window.__PAWAADO_IMPORT_TRAINING_PHOTOS__=patterns=>{
  if(isCalculating) throw new Error('計算が終わってから読み込んでください。');
  const rows=(patterns||[]).slice(0,MAX_EXP_SAMPLES).filter(p=>p&&p.exp);
  if(!rows.length) throw new Error('練習画像の経験点を読み取れませんでした。');
  expSamples=rows.map(p=>Object.fromEntries(expNames.map(n=>{
    const value=p.exp[n];
    return [n,value==null?'':String(Math.max(0,Math.round(Number(value))))];
  })));
  renderExp();
  validateAllInline();
  calcResultCache.clear();
  document.getElementById('result').textContent='';
  document.dispatchEvent(new Event('change',{bubbles:true}));
};

window.__PAWAADO_IMPORT_PHOTO__=data=>{
  if(isCalculating) throw new Error('計算が終わってから読み込んでください。');
  if(!jobsByAcademy[data.academy]?.includes(data.job)) throw new Error('アカデミーとジョブを確認してください。');
  if(!expNames.every(n=>Number.isInteger(data.exp[n])&&data.exp[n]>=0)) throw new Error('経験点を確認してください。');
  const row=D.academies.find(r=>r[0]===data.academy&&r[1]===data.job);
  if(!basicNames.every((n,i)=>Number.isInteger(data.basic[n])&&data.basic[n]>=1&&data.basic[n]<=row[i+2])) throw new Error('基本能力とアカデミー・ジョブの組み合わせを確認してください。');
  const max=data.academy==='ブートレインアカデミー'?BOOTRAIN_EXP_LIMITS:Object.fromEntries(expNames.map(n=>[n,1000]));
  if(!expNames.every(n=>data.exp[n]<=max[n])) throw new Error('経験点が保持上限を超えています。');
  academy.value=data.academy;
  academy.dispatchEvent(new Event('change',{bubbles:true}));
  job.value=data.job;
  job.dispatchEvent(new Event('change',{bubbles:true}));
  expSamples=[{...data.exp}]; renderExp();
  basicNames.forEach(n=>{
    basicHints[n]=0; basicOwned[n]=false;
    document.getElementById('basic_'+n).value=data.basic[n]; applyBasicVisual(n);
  });
  if(data.job==='双剣士'){
    // 双剣士専用「通常攻撃」は通常の特殊能力とは別枠で、画像から読んだLvをそのまま反映する。
    const dualLevel=Number(data.dualAttackLevel);
    window.__PAWAADO_SET_DUAL_ATTACK__?.(Number.isInteger(dualLevel)&&dualLevel>=1&&dualLevel<=6?dualLevel:1,0);
  }
  specialState.clear(); renderSpecials();
  const owned=new Set(data.specials);
  const explicitPairMarks=data.explicitPairMarks||{};

  // 通常特殊能力の○/◎は、画面に直接見えている記号を正本にする。
  // ただし対応する超特殊能力が認識されている場合は、その超特殊能力の取得条件（◎）が最優先。
  for(const [stem,mark] of Object.entries(explicitPairMarks)){
    owned.delete(stem+'○');
    owned.delete(stem+'◎');
    if(mark==='◎'){owned.add(stem+'○');owned.add(stem+'◎');}
    else if(mark==='○')owned.add(stem+'○');
  }

  // 上位の超特殊能力が確認できたら、対応する下位◎は必ず取得済み。
  // 例：平常心→通常攻撃◎、トリックスター→アクションスキル◎、ゴブリンキラー→対ゴブリン◎。
  // これは通常特殊能力側の○/◎表示よりゲーム仕様上強い条件として扱う。
  for(const entry of data.supers||[]){
    for(const name of D.superPrerequisites[entry.name]||D.superResistances[entry.name]?.includes||[]){
      owned.add(name);
    }
  }
  for(const name of owned){const i=specialNameIndex.get(name);if(i!==undefined) setSpecialOwned(i,true);}
  window.__PAWAADO_SET_SUPERS__?.((data.supers||[]).filter(entry=>D.superResistances[entry.name]));
  calcResultCache.clear();validateAllInline();
  document.getElementById('result').textContent='';
  document.dispatchEvent(new Event('change',{bubbles:true}));
};

document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
ensureCancelButton();
setupUsageModal();
removeTemporaryVersionDisplay();
initAcademies(); renderExp(); renderBasic(); renderSpecials(); validateAllInline();
})();
