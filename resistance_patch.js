(() => {
  'use strict';

  const PATCH_VERSION='20260921-total-score-floor-1';
  const resistanceTypes=[
    '物理攻撃耐性','魔法攻撃耐性','必殺技耐性','全体攻撃耐性','単体攻撃耐性',
    '火属性耐性','風属性耐性','水属性耐性','無属性耐性','列攻撃耐性',
    'アクションスキル耐性','ダメージ状態異常耐性','弱体化状態異常耐性','行動不能状態異常耐性'
  ];

  window.__PAWAADO_RESISTANCE_PATCH_VERSION__=PATCH_VERSION;
  window.PAWAADO_EFFECT_RULES=Object.freeze({
    resistanceScorePerPercent:Object.freeze({
      '物理攻撃耐性':70,'魔法攻撃耐性':70,'必殺技耐性':33,'全体攻撃耐性':50,'単体攻撃耐性':70,
      '火属性耐性':70,'風属性耐性':70,'水属性耐性':70,'無属性耐性':70,'列攻撃耐性':50,
      'アクションスキル耐性':18,'ダメージ状態異常耐性':20,'弱体化状態異常耐性':20,'行動不能状態異常耐性':20
    }),
    multiplierScorePerPercent:Object.freeze({
      physical:Object.freeze({physicalAttack:45,magicAttack:0,hpRecovery:0,singleHpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),
      magic:Object.freeze({physicalAttack:0,magicAttack:45,hpRecovery:0,singleHpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),
      priest:Object.freeze({physicalAttack:0,magicAttack:4.5,hpRecovery:45,singleHpRecovery:45,normalAttackHpRecovery:13,actionRecovery:12,rowHpRecovery:33,finisherHpRecovery:22})
    })
  });

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
    return `超特殊能力${abilityLetter(Number(group?.dataset?.groupIndex||0))}`;
  }

  function getExtraResistances(){
    const out=[];
    document.querySelectorAll('.extra-resistance-group').forEach(group=>{
      const name=groupSourceName(group);
      group.querySelectorAll('.extra-resistance-row').forEach(row=>{
        const type=row.querySelector('.extra-resistance-type')?.value||'';
        const raw=row.querySelector('.extra-resistance-value')?.value;
        // 未入力は0扱い。
        if(raw===''||raw==null||!resistanceTypes.includes(type)) return;
        const value=Number(raw);
        if(!Number.isFinite(value)||value<=0) return;
        out.push({name,type,value});
      });
    });
    return out;
  }
  window.__PAWAADO_GET_EXTRA_RESISTANCES__=getExtraResistances;

  function resistanceSignature(){
    return getExtraResistances()
      .map(row=>`${row.name}:${row.type}:${Number(row.value)}`)
      .join('|');
  }

  // script.jsの結果キャッシュに耐性入力も含める。
  const NativeMap=window.Map;
  const trackedMaps=[];
  function cacheKeyWithResistance(key){
    return typeof key==='string'&&key.includes('||')
      ? `${key}||extraResistance:${resistanceSignature()}`
      : key;
  }
  class TrackedMap extends NativeMap{
    constructor(iterable){
      super();
      trackedMaps.push(this);
      if(iterable) for(const [key,value] of iterable) this.set(key,value);
    }
    get(key){return super.get(cacheKeyWithResistance(key));}
    set(key,value){return super.set(cacheKeyWithResistance(key),value);}
    has(key){return super.has(cacheKeyWithResistance(key));}
    delete(key){return super.delete(cacheKeyWithResistance(key));}
  }
  Object.setPrototypeOf(TrackedMap,NativeMap);
  window.Map=TrackedMap;

  function clearDetectedResultCaches(){
    for(const map of trackedMaps){
      if(!map||map.size===0) continue;
      for(const key of map.keys()){
        if(typeof key==='string'&&key.includes('||extraResistance:')){
          map.clear();
          break;
        }
      }
    }
  }

  function validateResistanceValue(row,showMessage=true){
    const input=row?.querySelector('.extra-resistance-value');
    const error=row?.querySelector('.extra-resistance-error');
    if(!input) return true;
    const raw=input.value;
    if(raw===''||raw==null){
      row.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      if(error) error.hidden=true;
      return true;
    }
    const type=row?.querySelector('.extra-resistance-type')?.value||'';
    const value=Number(raw);
    const typeValid=resistanceTypes.includes(type);
    const valueValid=Number.isFinite(value)&&value>0;
    const valid=typeValid&&valueValid;
    row.classList.toggle('is-invalid',!valid);
    if(valid){
      input.removeAttribute('aria-invalid');
      if(error) error.hidden=true;
    }else{
      input.setAttribute('aria-invalid','true');
      if(error){
        error.textContent=!typeValid?'耐性を選択してください。':'耐性値は0より大きい数値で入力してください。';
        error.hidden=!showMessage;
      }
    }
    return valid;
  }

  function validateAllResistanceValues(){
    const invalid=[...document.querySelectorAll('.extra-resistance-row')]
      .filter(row=>!validateResistanceValue(row,true));
    if(!invalid.length) return true;
    invalid[0].scrollIntoView({behavior:'smooth',block:'center'});
    invalid[0].querySelector('.extra-resistance-value')?.focus({preventScroll:true});
    return false;
  }

  // script.jsはWorkerを1個保持するため、外側はProxy Workerとして保持し、
  // calculateごとに耐性対応Workerを新規作成する。これでSafariの古いWorker/キャッシュを跨がない。
  const NativeWorker=window.Worker;
  if(typeof NativeWorker==='function'){
    function ResistanceWorkerProxy(_url,options){
      let inner=null;
      let terminated=false;
      const proxy={
        onmessage:null,
        onerror:null,
        postMessage(message,transfer){
          if(terminated) return;
          if(message?.type==='cancel'){
            if(inner){
              if(arguments.length>=2) inner.postMessage(message,transfer);
              else inner.postMessage(message);
            }
            return;
          }
          if(message?.type!=='calculate'){
            if(inner){
              if(arguments.length>=2) inner.postMessage(message,transfer);
              else inner.postMessage(message);
            }
            return;
          }

          if(inner) inner.terminate();
          const signature=encodeURIComponent(resistanceSignature()||'none');
          inner=new NativeWorker(`./pawaado_worker_resistance_v2.js?v=${PATCH_VERSION}&r=${signature}`,options);
          inner.onmessage=event=>proxy.onmessage?.call(proxy,event);
          inner.onerror=event=>proxy.onerror?.call(proxy,event);

          const nextMessage={
            ...message,
            payload:{
              ...(message.payload||{}),
              extraResistances:getExtraResistances(),
              resistancePatchVersion:PATCH_VERSION
            }
          };
          if(arguments.length>=2) inner.postMessage(nextMessage,transfer);
          else inner.postMessage(nextMessage);
        },
        terminate(){
          terminated=true;
          if(inner) inner.terminate();
          inner=null;
        },
        addEventListener(type,listener,opts){
          if(type==='message'){
            const prev=proxy.onmessage;
            proxy.onmessage=function(event){prev?.call(proxy,event);listener.call(proxy,event);};
          }else if(type==='error'){
            const prev=proxy.onerror;
            proxy.onerror=function(event){prev?.call(proxy,event);listener.call(proxy,event);};
          }
        },
        removeEventListener(){},
        dispatchEvent(){return false;}
      };
      return proxy;
    }
    ResistanceWorkerProxy.prototype=NativeWorker.prototype;
    try{Object.setPrototypeOf(ResistanceWorkerProxy,NativeWorker);}catch(_){ }
    try{
      Object.defineProperty(window,'Worker',{
        configurable:true,
        writable:true,
        value:ResistanceWorkerProxy
      });
    }catch(_){
      window.Worker=ResistanceWorkerProxy;
    }
  }

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .extra-resistance-list{display:grid;gap:12px}
      .extra-resistance-group{padding:11px;border:2px solid #c39a63;border-radius:12px;background:rgba(255,250,238,.68)}
      .extra-resistance-group-title{margin:0 0 9px;color:#5a371d;font-size:14px;font-weight:800}
      .extra-resistance-group-rows{display:grid;gap:8px}
      .extra-resistance-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 42px;gap:7px;align-items:center}
      .extra-resistance-type-control{position:relative;min-width:0;z-index:20}
      .extra-resistance-type-control.is-open{z-index:4000}
      .extra-resistance-type-button{height:52px;min-height:52px;padding:8px 42px 8px 10px;font-size:14px;font-weight:600}
      .extra-resistance-type-control .custom-select-menu{
        left:0;right:auto;
        width:min(240px,calc(100vw - 48px));
        min-width:min(230px,calc(100vw - 48px));
        max-width:calc(100vw - 32px);
        font-size:14px;
      }
      .extra-resistance-type-control .custom-select-option{font-size:14px;min-height:44px;white-space:nowrap}
      .extra-resistance-value-wrap{width:100%;min-width:0;height:52px;min-height:52px;border:2px solid #b58a52;border-radius:10px;background:linear-gradient(180deg,#fffdf4,#fff2ce);color:var(--ink);box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;overflow:hidden;box-shadow:inset 0 2px 4px rgba(86,49,15,.11),0 1px 0 rgba(255,255,255,.7)}
      .extra-resistance-value{width:100%;min-width:0;height:48px;border:0!important;outline:0!important;background:transparent!important;color:var(--ink);padding:7px 4px 7px 8px!important;text-align:right;font:inherit;font-variant-numeric:tabular-nums;box-shadow:none!important;-webkit-appearance:none;appearance:textfield;caret-color:#5a371d}
      .extra-resistance-value:focus,.extra-resistance-value:focus-visible{outline:0!important;box-shadow:none!important}
      .extra-resistance-value-wrap:focus-within{outline:0!important;border-color:#b58a52!important;box-shadow:inset 0 2px 4px rgba(86,49,15,.11),0 1px 0 rgba(255,255,255,.7)!important}
      .extra-resistance-unit{padding:0 10px 0 4px;color:#6a4a2d;font-weight:800;line-height:1}
      .extra-resistance-remove,.extra-resistance-remove-placeholder{width:42px;height:52px;min-width:42px;min-height:52px}
      .extra-resistance-remove{padding:4px;border-radius:9px;font-size:20px;line-height:1}
      .extra-resistance-remove-placeholder{display:block}
      .extra-resistance-error{grid-column:1/-1;margin:-2px 0 1px;color:#a52f2f;font-size:12px;font-weight:700;line-height:1.45}
      .extra-resistance-row.is-invalid .extra-resistance-value-wrap{border-color:#a52f2f!important;box-shadow:0 0 0 1px rgba(165,47,47,.12)!important}
      .extra-resistance-group-actions{margin-top:9px}
      .extra-resistance-actions{margin-top:12px}
      .extra-resistance-same-add,.extra-resistance-add{width:100%;min-height:52px;font-size:14px}
      @media(max-width:620px){
        .extra-resistance-group{padding:9px}
        .extra-resistance-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 38px;gap:5px}
        .extra-resistance-type-button{font-size:13px;padding-left:8px;padding-right:36px}
        .extra-resistance-type-control .custom-select-menu{width:min(240px,calc(100vw - 36px));min-width:min(230px,calc(100vw - 36px))}
        .extra-resistance-type-control .custom-select-option{font-size:14px}
        .extra-resistance-value{font-size:14px}
        .extra-resistance-remove,.extra-resistance-remove-placeholder{width:38px;min-width:38px}
      }
    `;
    document.head.appendChild(style);
  }

  function resistanceRowHtml(removable=false){
    const options='<option value="">耐性を選択</option>'+resistanceTypes.map(type=>`<option value="${type}">${type}</option>`).join('');
    const removeControl=removable
      ? '<button type="button" class="secondary extra-resistance-remove" aria-label="この耐性を削除">×</button>'
      : '<span class="extra-resistance-remove-placeholder" aria-hidden="true"></span>';
    return `<div class="extra-resistance-row">
      <div class="extra-resistance-type-control custom-select-control">
        <select class="extra-resistance-type custom-native-select" tabindex="-1" aria-hidden="true">${options}</select>
        <button type="button" class="custom-select-button extra-resistance-type-button" aria-haspopup="listbox" aria-expanded="false">
          <span class="extra-resistance-type-text">耐性を選択</span>
        </button>
        <span class="select-game-arrow" aria-hidden="true"></span>
        <div class="custom-select-menu extra-resistance-type-menu" role="listbox" hidden></div>
      </div>
      <label class="extra-resistance-value-wrap">
        <input class="extra-resistance-value" type="number" min="0.1" step="0.1" inputmode="decimal" aria-label="耐性の数値（パーセント）">
        <span class="extra-resistance-unit" aria-hidden="true">%</span>
      </label>
      ${removeControl}
      <p class="extra-resistance-error" hidden>耐性値は0より大きい数値で入力してください。</p>
    </div>`;
  }

  function closeResistanceMenus(except=null){
    document.querySelectorAll('.extra-resistance-type-control.is-open').forEach(control=>{
      if(control===except) return;
      control.classList.remove('is-open');
      const button=control.querySelector('.extra-resistance-type-button');
      const menu=control.querySelector('.extra-resistance-type-menu');
      if(button) button.setAttribute('aria-expanded','false');
      if(menu) menu.hidden=true;
    });
  }

  function initResistanceSelects(root=document){
    root.querySelectorAll('.extra-resistance-type-control').forEach(control=>{
      if(control.dataset.ready==='1') return;
      control.dataset.ready='1';
      const select=control.querySelector('.extra-resistance-type');
      const button=control.querySelector('.extra-resistance-type-button');
      const text=control.querySelector('.extra-resistance-type-text');
      const menu=control.querySelector('.extra-resistance-type-menu');
      if(!select||!button||!text||!menu) return;

      const close=()=>{
        control.classList.remove('is-open');
        button.setAttribute('aria-expanded','false');
        menu.hidden=true;
      };
      const rebuild=()=>{
        menu.innerHTML='';
        for(const option of select.options){
          const item=document.createElement('button');
          item.type='button';
          item.className='custom-select-option'+(option.value===select.value?' is-selected':'');
          item.textContent=option.textContent;
          item.addEventListener('click',event=>{
            event.stopPropagation();
            select.value=option.value;
            text.textContent=option.textContent;
            select.dispatchEvent(new Event('change',{bubbles:true}));
            close();
          });
          menu.appendChild(item);
        }
      };
      const sync=()=>{
        const selected=select.options[select.selectedIndex];
        text.textContent=selected?.textContent||'耐性を選択';
        rebuild();
      };
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const opening=menu.hidden;
        closeResistanceMenus(opening?control:null);
        if(opening){
          rebuild();
          menu.hidden=false;
          control.classList.add('is-open');
          button.setAttribute('aria-expanded','true');
        }else close();
      });
      select.addEventListener('change',sync);
      sync();
    });
  }

  function resistanceGroupHtml(index){
    const letter=abilityLetter(index);
    return `<div class="extra-resistance-group" data-group-index="${index}">
      <div class="extra-resistance-group-title">超特殊能力${letter}</div>
      <div class="extra-resistance-group-rows">${resistanceRowHtml(index>0)}</div>
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
    initResistanceSelects(list);
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
      <div id="extraResistanceList" class="extra-resistance-list">${resistanceGroupHtml(0)}</div>
      <div class="extra-resistance-actions"><button id="addExtraResistanceBtn" type="button" class="secondary extra-resistance-add">＋超特殊能力を追加</button></div>`;
    specialCard.insertAdjacentElement('afterend',section);
    initResistanceSelects(section);

    section.addEventListener('input',event=>{
      const row=event.target.closest('.extra-resistance-row');
      if(event.target.matches('.extra-resistance-value')) validateResistanceValue(row,true);
      clearDetectedResultCaches();
    });
    section.addEventListener('change',event=>{
      const row=event.target.closest('.extra-resistance-row');
      if(event.target.matches('.extra-resistance-value')) validateResistanceValue(row,true);
      clearDetectedResultCaches();
    });
    section.addEventListener('click',event=>{
      const addAbility=event.target.closest('#addExtraResistanceBtn');
      if(addAbility){
        const list=document.getElementById('extraResistanceList');
        const index=list?.querySelectorAll('.extra-resistance-group').length||0;
        list?.insertAdjacentHTML('beforeend',resistanceGroupHtml(index));
        const group=list?.lastElementChild;
        if(group) initResistanceSelects(group);
        clearDetectedResultCaches();
        return;
      }

      const addSame=event.target.closest('.extra-resistance-same-add');
      if(addSame){
        const rows=addSame.closest('.extra-resistance-group')?.querySelector('.extra-resistance-group-rows');
        rows?.insertAdjacentHTML('beforeend',resistanceRowHtml(true));
        if(rows?.lastElementChild) initResistanceSelects(rows.lastElementChild);
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
        if(rows.length>1) row?.remove();
        else if(groups.length>1){
          group?.remove();
          renumberResistanceGroups();
        }
        clearDetectedResultCaches();
      }
    });
  }

  function updateUsageText(){
    const usageItems=[...document.querySelectorAll('.usage-list li')];
    if(usageItems[1]){
      usageItems[1].textContent='経験点、現在の基本能力、取得済の特殊能力、超特殊能力の耐性（通常攻撃耐性、被ダメージ耐性を除く）を入力します。';
    }
    const firstNote=document.querySelector('.usage-note-list li');
    if(firstNote){
      firstNote.textContent='基本能力の小数点以下の査定が不明であることなどから、本ツールの結果が適切でない場合があります。必殺技、アクションスキル、超特殊能力の査定は割愛しています。あらかじめご了承ください。';
    }
  }

  addStyles();
  injectResistanceUi();
  updateUsageText();

  document.addEventListener('click',()=>closeResistanceMenus());
  document.getElementById('calcBtn')?.addEventListener('click',event=>{
    if(validateAllResistanceValues()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  for(const id of ['resetBtn','topResetBtn']){
    document.getElementById(id)?.addEventListener('click',()=>queueMicrotask(resetResistanceRows));
  }
})();

