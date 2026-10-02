(function(){
// Browser UI, validation, result caching, and Worker orchestration.
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const MAX_EXP_SAMPLES=6;
let expSamples=[Object.fromEntries(expNames.map(n=>[n,'']))];
let plannedExp=Object.fromEntries(expNames.map(n=>[n,'']));
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
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
  return `<span class="ability-name-text"><span class="ability-name-label">${name}</span></span>`;
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
function key5(c0,c1,c2,c3,c4){
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


function yieldToBrowser(){
  return new Promise(r=>setTimeout(r,0)).then(()=>{
    throwIfCancelled();
  });
}
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
  activeCalcWorker=new Worker('./pawaado_worker.js?v=20261002-no-attribute-2');
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
  const hasCharacterExp=expNames.every(n=>Number.isInteger(data.exp?.[n])&&data.exp[n]>=0);
  const hasTrainingPatterns=Array.isArray(data.trainingPatterns)&&data.trainingPatterns.length>0;
  if(!hasCharacterExp&&!hasTrainingPatterns) throw new Error('経験点を確認してください。');
  const row=D.academies.find(r=>r[0]===data.academy&&r[1]===data.job);
  if(!basicNames.every((n,i)=>Number.isInteger(data.basic[n])&&data.basic[n]>=1&&data.basic[n]<=row[i+2])) throw new Error('基本能力とアカデミー・ジョブの組み合わせを確認してください。');
  const max=data.academy==='ブートレインアカデミー'?BOOTRAIN_EXP_LIMITS:Object.fromEntries(expNames.map(n=>[n,1000]));
  if(hasCharacterExp&&!expNames.every(n=>data.exp[n]<=max[n])) throw new Error('経験点が保持上限を超えています。');
  academy.value=data.academy;
  academy.dispatchEvent(new Event('change',{bubbles:true}));
  job.value=data.job;
  job.dispatchEvent(new Event('change',{bubbles:true}));
  if(hasCharacterExp){expSamples=[{...data.exp}]; renderExp();}
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

  // 画像からの超特殊能力は、名前とLvの両方を確定できたものだけ入力に使う。
  const confirmedSupers=(data.supers||[]).filter(entry=>
    entry.confirmed===true&&(entry.level===1||entry.level===2)
  );
  // 確定した上位超特だけ、対応する下位能力を取得済みに補完する。
  for(const entry of confirmedSupers){
    for(const name of D.superPrerequisites[entry.name]||D.superResistances[entry.name]?.includes||[]){
      owned.add(name);
    }
  }
  for(const name of owned){const i=specialNameIndex.get(name);if(i!==undefined) setSpecialOwned(i,true);}
  window.__PAWAADO_SET_SUPERS__?.(confirmedSupers.filter(entry=>D.superResistances[entry.name]));
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
