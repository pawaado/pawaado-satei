(() => {
  'use strict';

  const resistanceTypes = [
    '物理攻撃耐性','魔法攻撃耐性','必殺技耐性','全体攻撃耐性','単体攻撃耐性',
    '火属性耐性','風属性耐性','水属性耐性','無属性耐性','列攻撃耐性',
    'アクションスキル耐性','ダメージ状態異常耐性','弱体化状態異常耐性','行動不能状態異常耐性'
  ];
  const resistanceImpactSkills = new Set([
    '物理防御○','物理防御◎','魔法防御○','魔法防御◎','体幹','魔力制御','柔軟な体','無心の構え',
    '火耐性','風耐性','水耐性','無耐性','がむしゃら','ケガしにくさ○','ケガしにくさ◎','防御態勢',
    '備え','広い視野','見切り','危機察知','力学の理解','魔法の理解','免疫強化','意志','ガッツ',
    'ヒーラー魂','バランス感覚','立て直し','冷静沈着','戦況分析'
  ]);

  window.PAWAADO_EFFECT_RULES = Object.freeze({
    resistanceScorePerPercent: Object.freeze({
      '物理攻撃耐性':70,'魔法攻撃耐性':70,'必殺技耐性':33,'全体攻撃耐性':50,'単体攻撃耐性':70,
      '火属性耐性':70,'風属性耐性':70,'水属性耐性':70,'無属性耐性':70,'列攻撃耐性':50,
      'アクションスキル耐性':18,'ダメージ状態異常耐性':20,'弱体化状態異常耐性':20,'行動不能状態異常耐性':20
    }),
    multiplierScorePerPercent: Object.freeze({
      physical:Object.freeze({physicalAttack:45,magicAttack:0,hpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),
      magic:Object.freeze({physicalAttack:0,magicAttack:45,hpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),
      priest:Object.freeze({physicalAttack:0,magicAttack:4.5,hpRecovery:45,normalAttackHpRecovery:13,actionRecovery:12,rowHpRecovery:33,finisherHpRecovery:22})
    })
  });

  // script.js 内の最終結果キャッシュだけを、追加耐性の変更時に安全に破棄するため Map を追跡する。
  const NativeMap = window.Map;
  const trackedMaps = [];
  class TrackedMap extends NativeMap {
    constructor(...args){
      super(...args);
      trackedMaps.push(this);
    }
  }
  Object.setPrototypeOf(TrackedMap, NativeMap);
  window.Map = TrackedMap;

  function clearDetectedResultCaches(){
    for(const map of trackedMaps){
      if(!map || map.size===0) continue;
      let checked=0;
      let isResultCache=false;
      for(const [key,value] of map){
        if(typeof key==='string' && key.includes('||') && value && typeof value==='object' &&
           Array.isArray(value.cost) && Array.isArray(value.items) && 'score' in value && 'usedCost' in value){
          isResultCache=true;
          break;
        }
        if(++checked>=4) break;
      }
      if(isResultCache) map.clear();
    }
  }

  function getExtraResistances(){
    const rows=[...document.querySelectorAll('.extra-resistance-row')];
    const out=[];
    rows.forEach((row,index)=>{
      const name=(row.querySelector('.extra-resistance-source')?.value||'').trim();
      const type=row.querySelector('.extra-resistance-type')?.value||'';
      const raw=row.querySelector('.extra-resistance-value')?.value;
      if(raw==='' || raw==null || !resistanceTypes.includes(type)) return;
      const value=Number(raw);
      if(!Number.isFinite(value) || value===0) return;
      out.push({name:name||`追加耐性${index+1}`,type,value});
    });
    return out;
  }
  window.__PAWAADO_GET_EXTRA_RESISTANCES__ = getExtraResistances;

  // 計算Workerだけを耐性対応版へ差し替え、計算時点の追加耐性をpayloadへ付与する。
  const NativeWorker = window.Worker;
  if(typeof NativeWorker==='function'){
    class ResistanceWorker extends NativeWorker {
      constructor(url,options){
        const text=String(url||'');
        const next=/pawaado_worker\.js(?:\?|$)/.test(text)
          ? './pawaado_worker_resistance.js?v=20260916-resistance-1'
          : url;
        super(next,options);
      }
      postMessage(message,transfer){
        let nextMessage=message;
        if(message && message.type==='calculate'){
          nextMessage={
            ...message,
            payload:{...(message.payload||{}),extraResistances:getExtraResistances()}
          };
        }
        if(arguments.length>=2) return super.postMessage(nextMessage,transfer);
        return super.postMessage(nextMessage);
      }
    }
    window.Worker=ResistanceWorker;
  }

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .extra-resistance-help{margin:0 0 12px;color:#6a5545;font-size:13px;line-height:1.6}
      .extra-resistance-list{display:grid;gap:10px}
      .extra-resistance-row{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1.35fr) 92px 42px;gap:7px;align-items:center}
      .extra-resistance-row input,.extra-resistance-row select{width:100%;min-width:0;min-height:44px;border:2px solid #b58a52;border-radius:9px;background:#fffdf7;color:var(--ink);padding:7px 8px;font:inherit}
      .extra-resistance-row .extra-resistance-value{text-align:right;font-variant-numeric:tabular-nums}
      .extra-resistance-remove{min-width:42px;min-height:42px;padding:4px;border-radius:9px;font-size:20px;line-height:1}
      .extra-resistance-actions{margin-top:12px}
      .extra-resistance-add{width:100%}
      .resistance-impact-marker{display:inline-block;margin-left:.45em;color:#98651d;font-size:11px;font-weight:800;white-space:nowrap;vertical-align:middle}
      @media(max-width:620px){
        .extra-resistance-row{grid-template-columns:1fr 1fr 74px 38px;gap:5px}
        .extra-resistance-row input,.extra-resistance-row select{font-size:13px;padding:6px}
        .extra-resistance-remove{min-width:38px;min-height:40px}
      }
    `;
    document.head.appendChild(style);
  }

  function resistanceRowHtml(){
    const options=resistanceTypes.map(type=>`<option value="${type}">${type}</option>`).join('');
    return `<div class="extra-resistance-row">
      <input class="extra-resistance-source" type="text" maxlength="40" placeholder="超特殊能力名" autocomplete="off" aria-label="超特殊能力名">
      <select class="extra-resistance-type" aria-label="耐性の種類">${options}</select>
      <input class="extra-resistance-value" type="number" step="0.1" inputmode="decimal" placeholder="0.0" aria-label="耐性の数値（パーセント）">
      <button type="button" class="secondary extra-resistance-remove" aria-label="この耐性を削除">×</button>
    </div>`;
  }

  function resetResistanceRows(){
    const list=document.getElementById('extraResistanceList');
    if(!list) return;
    list.innerHTML=resistanceRowHtml();
    clearDetectedResultCaches();
  }

  function injectResistanceUi(){
    if(document.getElementById('extraResistanceCard')) return;
    const specialList=document.getElementById('specialList');
    const specialCard=specialList?.closest('section.card');
    if(!specialCard) return;
    const section=document.createElement('section');
    section.id='extraResistanceCard';
    section.className='card';
    section.setAttribute('aria-labelledby','extraResistanceTitle');
    section.innerHTML=`
      <div class="section-heading"><h2 id="extraResistanceTitle">耐性</h2></div>
      <p class="extra-resistance-help">超特殊能力など、ツールで直接入力しない能力によって既に持っている耐性を入力してください。</p>
      <div id="extraResistanceList" class="extra-resistance-list">${resistanceRowHtml()}</div>
      <div class="extra-resistance-actions"><button id="addExtraResistanceBtn" type="button" class="secondary extra-resistance-add">＋耐性を追加</button></div>`;
    specialCard.insertAdjacentElement('afterend',section);

    section.addEventListener('input',()=>clearDetectedResultCaches());
    section.addEventListener('change',()=>clearDetectedResultCaches());
    section.addEventListener('click',event=>{
      const add=event.target.closest('#addExtraResistanceBtn');
      if(add){
        document.getElementById('extraResistanceList')?.insertAdjacentHTML('beforeend',resistanceRowHtml());
        clearDetectedResultCaches();
        return;
      }
      const remove=event.target.closest('.extra-resistance-remove');
      if(remove){
        const list=document.getElementById('extraResistanceList');
        remove.closest('.extra-resistance-row')?.remove();
        if(list && !list.children.length) list.innerHTML=resistanceRowHtml();
        clearDetectedResultCaches();
      }
    });
  }

  function updateUsageNote(){
    const first=document.querySelector('.usage-note-list li');
    if(first){
      first.textContent='基本能力の小数点以下の査定が不明であることなどから、本ツールの結果が適切でない場合があります。必殺技、アクションスキル、超特殊能力の査定は割愛しています。あらかじめご了承ください。';
    }
  }

  function markResistanceSkills(){
    const D=window.PAWAADO_DATA;
    const list=document.getElementById('specialList');
    if(!D||!list) return;
    list.querySelectorAll('.skill-row[data-index]').forEach(row=>{
      const index=Number(row.dataset.index);
      const name=String(D.special?.[index]?.[1]||'');
      const button=row.querySelector('.name-btn');
      if(!button) return;
      const old=button.querySelector('.resistance-impact-marker');
      if(!resistanceImpactSkills.has(name)){
        old?.remove();
        return;
      }
      if(!old){
        const marker=document.createElement('span');
        marker.className='resistance-impact-marker';
        marker.textContent='※耐性影響';
        button.appendChild(marker);
      }
    });
  }

  addStyles();
  injectResistanceUi();
  updateUsageNote();

  const specialList=document.getElementById('specialList');
  if(specialList){
    new MutationObserver(()=>queueMicrotask(markResistanceSkills)).observe(specialList,{childList:true,subtree:true});
    queueMicrotask(markResistanceSkills);
  }

  for(const id of ['resetBtn','topResetBtn']){
    document.getElementById(id)?.addEventListener('click',()=>queueMicrotask(resetResistanceRows));
  }
})();
