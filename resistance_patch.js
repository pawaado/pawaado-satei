(() => {
  'use strict';

  const resistanceTypes = [
    '物理攻撃耐性','魔法攻撃耐性','必殺技耐性','全体攻撃耐性','単体攻撃耐性',
    '火属性耐性','風属性耐性','水属性耐性','無属性耐性','列攻撃耐性',
    'アクションスキル耐性','ダメージ状態異常耐性','弱体化状態異常耐性','行動不能状態異常耐性'
  ];

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

  function abilityLetter(index){
    let n=Math.max(0,Number(index)||0)+1;
    let out='';
    while(n>0){
      n--;
      out=String.fromCharCode(65+(n%26))+out;
      n=Math.floor(n/26);
    }
    return out;
  }

  function groupSourceName(group){
    const index=Number(group?.dataset?.groupIndex||0);
    return `超特殊能力${abilityLetter(index)}`;
  }

  function getExtraResistances(){
    const out=[];
    document.querySelectorAll('.extra-resistance-group').forEach(group=>{
      const name=groupSourceName(group);
      group.querySelectorAll('.extra-resistance-row').forEach(row=>{
        const type=row.querySelector('.extra-resistance-type')?.value||'';
        const raw=row.querySelector('.extra-resistance-value')?.value;
        if(raw==='' || raw==null || !resistanceTypes.includes(type)) return;
        const value=Number(raw);
        if(!Number.isFinite(value) || value===0) return;
        out.push({name,type,value});
      });
    });
    return out;
  }
  window.__PAWAADO_GET_EXTRA_RESISTANCES__ = getExtraResistances;

  const NativeWorker = window.Worker;
  if(typeof NativeWorker==='function'){
    class ResistanceWorker extends NativeWorker {
      constructor(url,options){
        const text=String(url||'');
        const next=/pawaado_worker\.js(?:\?|$)/.test(text)
          ? './pawaado_worker_resistance.js?v=20260916-resistance-2'
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
      .extra-resistance-list{display:grid;gap:12px}
      .extra-resistance-group{padding:11px;border:2px solid #c39a63;border-radius:12px;background:rgba(255,250,238,.68)}
      .extra-resistance-group-title{margin:0 0 9px;color:#5a371d;font-size:14px;font-weight:800}
      .extra-resistance-group-rows{display:grid;gap:8px}
      .extra-resistance-row{display:grid;grid-template-columns:minmax(0,1fr) 116px 42px;gap:7px;align-items:center}
      .extra-resistance-row select,.extra-resistance-value-wrap{width:100%;min-width:0;min-height:44px;border:2px solid #b58a52;border-radius:9px;background:#fffdf7;color:var(--ink);font:inherit}
      .extra-resistance-row select{padding:7px 8px}
      .extra-resistance-value-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;overflow:hidden}
      .extra-resistance-value{width:100%;min-width:0;height:40px;border:0!important;outline:0;background:transparent!important;color:var(--ink);padding:7px 4px 7px 8px!important;text-align:right;font:inherit;font-variant-numeric:tabular-nums;box-shadow:none!important}
      .extra-resistance-unit{padding:0 9px 0 4px;color:#6a4a2d;font-weight:800;line-height:1}
      .extra-resistance-remove{min-width:42px;min-height:42px;padding:4px;border-radius:9px;font-size:20px;line-height:1}
      .extra-resistance-group-actions{margin-top:9px}
      .extra-resistance-same-add{width:100%;min-height:40px;font-size:13px}
      .extra-resistance-actions{margin-top:12px}
      .extra-resistance-add{width:100%}
      @media(max-width:620px){
        .extra-resistance-group{padding:9px}
        .extra-resistance-row{grid-template-columns:minmax(0,1fr) 104px 38px;gap:5px}
        .extra-resistance-row select{font-size:13px;padding:6px}
        .extra-resistance-value{font-size:14px}
        .extra-resistance-remove{min-width:38px;min-height:40px}
      }
    `;
    document.head.appendChild(style);
  }

  function resistanceRowHtml(){
    const options=resistanceTypes.map(type=>`<option value="${type}">${type}</option>`).join('');
    return `<div class="extra-resistance-row">
      <select class="extra-resistance-type" aria-label="耐性の種類">${options}</select>
      <label class="extra-resistance-value-wrap">
        <input class="extra-resistance-value" type="number" step="0.1" inputmode="decimal" aria-label="耐性の数値（パーセント）">
        <span class="extra-resistance-unit" aria-hidden="true">%</span>
      </label>
      <button type="button" class="secondary extra-resistance-remove" aria-label="この耐性を削除">×</button>
    </div>`;
  }

  function resistanceGroupHtml(index){
    const letter=abilityLetter(index);
    return `<div class="extra-resistance-group" data-group-index="${index}">
      <div class="extra-resistance-group-title">超特殊能力${letter}</div>
      <div class="extra-resistance-group-rows">${resistanceRowHtml()}</div>
      <div class="extra-resistance-group-actions">
        <button type="button" class="secondary extra-resistance-same-add">＋超特殊能力${letter}の耐性を追加</button>
      </div>
    </div>`;
  }

  function renumberResistanceGroups(){
    document.querySelectorAll('.extra-resistance-group').forEach((group,index)=>{
      group.dataset.groupIndex=String(index);
      const letter=abilityLetter(index);
      const title=group.querySelector('.extra-resistance-group-title');
      const add=group.querySelector('.extra-resistance-same-add');
      if(title) title.textContent=`超特殊能力${letter}`;
      if(add) add.textContent=`＋超特殊能力${letter}の耐性を追加`;
    });
  }

  function resetResistanceRows(){
    const list=document.getElementById('extraResistanceList');
    if(!list) return;
    list.innerHTML=resistanceGroupHtml(0);
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
      <div class="section-heading"><h2 id="extraResistanceTitle">超特殊能力の耐性</h2></div>
      <p class="extra-resistance-help">超特殊能力により所持している耐性を入力してください。</p>
      <div id="extraResistanceList" class="extra-resistance-list">${resistanceGroupHtml(0)}</div>
      <div class="extra-resistance-actions"><button id="addExtraResistanceBtn" type="button" class="secondary extra-resistance-add">＋超特殊能力を追加</button></div>`;
    specialCard.insertAdjacentElement('afterend',section);

    section.addEventListener('input',()=>clearDetectedResultCaches());
    section.addEventListener('change',()=>clearDetectedResultCaches());
    section.addEventListener('click',event=>{
      const addAbility=event.target.closest('#addExtraResistanceBtn');
      if(addAbility){
        const list=document.getElementById('extraResistanceList');
        const index=list?.querySelectorAll('.extra-resistance-group').length||0;
        list?.insertAdjacentHTML('beforeend',resistanceGroupHtml(index));
        clearDetectedResultCaches();
        return;
      }

      const addSame=event.target.closest('.extra-resistance-same-add');
      if(addSame){
        addSame.closest('.extra-resistance-group')?.querySelector('.extra-resistance-group-rows')?.insertAdjacentHTML('beforeend',resistanceRowHtml());
        clearDetectedResultCaches();
        return;
      }

      const remove=event.target.closest('.extra-resistance-remove');
      if(remove){
        const list=document.getElementById('extraResistanceList');
        const row=remove.closest('.extra-resistance-row');
        const group=remove.closest('.extra-resistance-group');
        const rows=group?.querySelectorAll('.extra-resistance-row')||[];
        const groups=list?.querySelectorAll('.extra-resistance-group')||[];
        if(rows.length>1){
          row?.remove();
        }else if(groups.length>1){
          group?.remove();
          renumberResistanceGroups();
        }else{
          const type=row?.querySelector('.extra-resistance-type');
          const value=row?.querySelector('.extra-resistance-value');
          if(type) type.selectedIndex=0;
          if(value) value.value='';
        }
        clearDetectedResultCaches();
      }
    });
  }

  function updateUsageText(){
    const usageItems=[...document.querySelectorAll('.usage-list li')];
    if(usageItems[1]){
      usageItems[1].textContent='経験点、現在の基本能力、取得済の特殊能力、超特殊能力の耐性を入力します。';
    }
    const firstNote=document.querySelector('.usage-note-list li');
    if(firstNote){
      firstNote.textContent='基本能力の小数点以下の査定が不明であることなどから、本ツールの結果が適切でない場合があります。必殺技、アクションスキル、超特殊能力の査定は割愛しています。あらかじめご了承ください。';
    }
  }

  addStyles();
  injectResistanceUi();
  updateUsageText();

  for(const id of ['resetBtn','topResetBtn']){
    document.getElementById(id)?.addEventListener('click',()=>queueMicrotask(resetResistanceRows));
  }
})();
