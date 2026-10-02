(() => {
  'use strict';

  const PATCH_VERSION='20261002-script-audit-3';
  const D=window.PAWAADO_DATA;
  const resistanceTypes=Object.keys(D?.resistanceRules?.scorePerPercent||{});

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
    return group?.querySelector('.super-name')?.value || `超特殊能力${abilityLetter(Number(group?.dataset?.groupIndex||0))}`;
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
        if(!Number.isFinite(value)||value===0) return;
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

  window.__PAWAADO_RESISTANCE_SIGNATURE__=resistanceSignature;

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
    const valueValid=Number.isFinite(value)&&value!==0&&value<100;
    const valid=typeValid&&valueValid;
    row.classList.toggle('is-invalid',!valid);
    if(valid){
      input.removeAttribute('aria-invalid');
      if(error) error.hidden=true;
    }else{
      input.setAttribute('aria-invalid','true');
      if(error){
        error.textContent=!typeValid?'耐性を選択してください。':'耐性値は0以外・100未満の数値で入力してください。';
        error.hidden=!showMessage;
      }
    }
    return valid;
  }

  function showResistanceCalcError(message){
    const result=document.getElementById('result');
    if(!result)return;
    const safe=String(message).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    const formatted=safe==='耐性に影響する超特殊能力のLvを選択してください。'
      ? '<span class="error-no-break">耐性に影響する超特殊能力のLvを</span><wbr><span class="error-no-break">選択してください。</span>'
      : safe;
    result.innerHTML='<div class="error-box"><ul class="error-box-list"><li>'+formatted+'</li></ul></div>';
    result.closest('.result-card')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function validateAllResistanceValues(){
    const groups=[...document.querySelectorAll('.extra-resistance-group')];
    const names=new Set();
    for(const group of groups){
      const name=group.querySelector('.super-name')?.value;
      if(!name) continue;
      const def=D?.superResistances?.[name];
      const level=group.querySelector('.super-level')?.value;
      if(!def){
        group.querySelector('.super-note').textContent='';
        showResistanceCalcError('超特殊能力を確認してください。');
        return false;
      }
      if(!level || names.has(name) || (def.job&&def.job!==document.getElementById('job').value)){
        group.querySelector('.super-note').textContent='';
        showResistanceCalcError(!level?'耐性に影響する超特殊能力のLvを選択してください。':names.has(name)?'同じ超特殊能力が重複しています。':def.job+'専用の超特殊能力です。');
        return false;
      }
      names.add(name);
    }
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
      if(!String(_url).includes('pawaado_worker')) return new NativeWorker(_url,options);
      let inner=null;
      let terminated=false;
      const proxy={
        onmessage:null,
        onerror:null,
        postMessage(message,transfer){
          if(terminated) return;
          if(message?.type!=='calculate'){
            if(inner){
              if(arguments.length>=2) inner.postMessage(message,transfer);
              else inner.postMessage(message);
            }
            return;
          }

          if(inner) inner.terminate();
          const signature=encodeURIComponent(resistanceSignature()||'none');
          inner=new NativeWorker(`./pawaado_worker_resistance.js?v=${PATCH_VERSION}&r=${signature}`,options);
          inner.onmessage=event=>proxy.onmessage?.call(proxy,event);
          inner.onerror=event=>proxy.onerror?.call(proxy,event);

          const nextMessage={
            ...message,
            payload:{
              ...(message.payload||{}),
              extraResistances:getExtraResistances(),
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
      .extra-resistance-list{display:grid;gap:4px}
      /* 耐性の内訳は内部計算にだけ使い、画面には表示しない */
      .extra-resistance-group-rows{display:none!important}
      .extra-resistance-group{padding:6px 7px;border:2px solid #c39a63;border-radius:12px;background:rgba(255,250,238,.68)}
      .extra-resistance-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(105px,.72fr);gap:10px;align-items:center}
      .extra-resistance-type-label{min-width:0;padding:6px 2px;color:#5a371d;font-weight:800;line-height:1.35}
      .super-control-row{display:block;height:52px;min-height:52px;margin:0!important;padding:0!important}
      .super-controls{display:grid!important;grid-template-columns:minmax(0,1fr) 70px 38px!important;gap:4px!important;align-items:center;height:52px;min-height:52px;margin:0!important;padding:0!important}
      .super-controls .super-field{min-width:0}
      .super-level-field{display:grid;grid-template-columns:17px minmax(0,1fr);gap:2px;align-items:center}
      .super-level-label{font-size:13px;line-height:1;text-align:right;white-space:nowrap}
      .super-custom-select{position:relative;min-width:0}
      .super-custom-select .custom-select-button{height:52px;min-height:52px;font-size:16px;padding:8px 38px 8px 10px}
      .super-name-control .custom-select-button{font-size:clamp(13px,3.55vw,14px);letter-spacing:-.055em;padding-left:9px;padding-right:26px}
      .super-name-text{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:clip}
      .super-level-control .custom-select-button{padding-left:5px;padding-right:22px}
      .super-name-control .custom-select-menu{width:min(360px,calc(100vw - 28px));min-width:min(360px,calc(100vw - 28px));max-width:calc(100vw - 28px);left:0;right:auto}
      .super-level-control .custom-select-menu{width:100%;min-width:100%;left:0;right:auto}
      .super-name-control .custom-select-option{white-space:nowrap;overflow:visible;line-height:1.35}
      .super-level-control .custom-select-option{white-space:nowrap;padding:8px 4px!important;text-align:center!important;color:#fff!important;overflow:visible;font-size:16px}
      .super-level-control .custom-select-option::before{display:none!important;content:none!important;width:0!important;margin:0!important}
      .extra-resistance-group-remove{display:block;margin:0;width:38px;min-width:38px;height:48px;min-height:48px;padding:3px;border-radius:9px;font-size:18px;line-height:1}
      .extra-resistance-group:not(.has-super-name) .extra-resistance-group-remove{visibility:hidden;pointer-events:none}
      .super-note{margin:4px 0 0;font-size:12px;line-height:1.35}.super-note:empty{display:none}
      .extra-resistance-value-wrap{width:100%;min-width:0;height:52px;min-height:52px;border:2px solid #b58a52;border-radius:10px;background:linear-gradient(180deg,#fffdf4,#fff2ce);color:var(--ink);box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;overflow:hidden;box-shadow:inset 0 2px 4px rgba(86,49,15,.11),0 1px 0 rgba(255,255,255,.7)}
      .extra-resistance-value{width:100%;min-width:0;height:48px;border:0!important;outline:0!important;background:transparent!important;color:var(--ink);padding:7px 4px 7px 8px!important;text-align:right;font:inherit;font-variant-numeric:tabular-nums;box-shadow:none!important;-webkit-appearance:none;appearance:textfield;caret-color:#5a371d}
      .extra-resistance-value:focus,.extra-resistance-value:focus-visible{outline:0!important;box-shadow:none!important}
      .extra-resistance-value-wrap:focus-within{outline:0!important;border-color:#b58a52!important;box-shadow:inset 0 2px 4px rgba(86,49,15,.11),0 1px 0 rgba(255,255,255,.7)!important}
      .extra-resistance-unit{padding:0 10px 0 4px;color:#6a4a2d;font-weight:800;line-height:1}
      .extra-resistance-error{grid-column:1/-1;margin:-2px 0 1px;color:#a52f2f;font-size:12px;font-weight:700;line-height:1.45}
      .extra-resistance-row.is-invalid .extra-resistance-value-wrap{border-color:#a52f2f!important;box-shadow:0 0 0 1px rgba(165,47,47,.12)!important}
      @media(max-width:620px){
        .extra-resistance-group{padding:6px 6px}
        .extra-resistance-row{grid-template-columns:minmax(0,1fr) minmax(100px,.72fr);gap:8px}
        .extra-resistance-value{font-size:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function resistanceRowHtml(){
    return `<div class="extra-resistance-row">
      <div class="extra-resistance-type-label"></div>
      <input class="extra-resistance-type" type="hidden">
      <label class="extra-resistance-value-wrap">
        <input class="extra-resistance-value" type="number" max="99.9" step="0.1" inputmode="decimal" aria-label="耐性の数値（パーセント）" readonly>
        <span class="extra-resistance-unit" aria-hidden="true">%</span>
      </label>
      <p class="extra-resistance-error" hidden>耐性値は0以外・100未満の数値で入力してください。</p>
    </div>`;
  }

  function superSelectControlHtml(kind,optionsHtml,placeholder,disabled=false){
    const isLevel=kind==='level';
    return `<div class="custom-select-control super-custom-select ${isLevel?'super-level-control':'super-name-control'}">
      <select class="${isLevel?'super-level':'super-name'} custom-native-select" tabindex="-1" aria-hidden="true" ${isLevel||disabled?'disabled':''}>${optionsHtml}</select>
      <button type="button" class="custom-select-button ${isLevel?'super-level-button':'super-name-button'}" aria-haspopup="listbox" aria-expanded="false" ${isLevel||disabled?'disabled':''}>
        <span class="${isLevel?'super-level-text':'super-name-text'}">${placeholder}</span>
      </button>
      <div class="custom-select-menu ${isLevel?'super-level-menu':'super-name-menu'}" role="listbox" hidden></div>
    </div>`;
  }

  // 超特殊能力の表示順は端末ごとのlocaleCompare差を避けるため固定する。
  // ユーザーが確認した五十音順をそのまま使用。
  const SUPER_ORDER=[
    '安全運転',
    'ウィンドプロテクション',
    'ウォータープロテクション',
    '加護',
    '火事場の馬鹿力',
    'カチカチボディ',
    '救援者',
    '慈愛の祈り',
    '対魔の盾',
    '戦い抜く覚悟',
    '超免疫',
    '鉄人',
    '百戦の生存術',
    'ファイアプロテクション',
    '不朽の意志',
    '不屈の精神',
    '不滅',
    '無頼漢の教え',
    '魔力耐性'
  ];
  const SUPER_ORDER_INDEX=new Map(SUPER_ORDER.map((name,index)=>[name,index]));

  function currentJob(){return document.getElementById('job')?.value||'';}
  function allAvailableSuperNames(job=currentJob()){
    if(!job)return [];
    return Object.keys(D.superResistances)
      .filter(name=>{
        const def=D.superResistances[name];
        return !def.job||def.job===job;
      })
      .sort((a,b)=>(SUPER_ORDER_INDEX.get(a)??999)-(SUPER_ORDER_INDEX.get(b)??999));
  }
  function selectedSuperNames(exceptGroup=null){
    const selected=new Set();
    document.querySelectorAll('.extra-resistance-group').forEach(group=>{
      if(group===exceptGroup)return;
      const name=group.querySelector('.super-name')?.value;
      if(name)selected.add(name);
    });
    return selected;
  }
  function availableSuperNames(job=currentJob(),exceptGroup=null){
    const selected=selectedSuperNames(exceptGroup);
    return allAvailableSuperNames(job).filter(name=>!selected.has(name));
  }
  function rebuildSuperNameOptions(group){
    const select=group.querySelector('.super-name');
    if(!select)return;
    const job=currentJob();
    const old=select.value;
    const names=availableSuperNames(job,group);
    select.innerHTML='<option value="">超特殊能力を選択</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
    const valid=old&&names.includes(old);
    select.value=valid?old:'';
    select.disabled=!job;
    const button=group.querySelector('.super-name-button');
    if(button)button.disabled=!job;
    if(!valid){
      const level=group.querySelector('.super-level');
      if(level){level.value='';level.disabled=true;}
      const levelButton=group.querySelector('.super-level-button');
      if(levelButton)levelButton.disabled=true;
    }
    syncSuperSelects(group);
  }
  function refreshSuperControlsForJob(ensureEmpty=true){
    const job=currentJob();
    const list=document.getElementById('extraResistanceList');
    if(!list)return;
    [...list.querySelectorAll('.extra-resistance-group')].forEach(group=>{
      rebuildSuperNameOptions(group);
      fillSuperGroup(group);
    });
    if(ensureEmpty)syncEmptySuperGroup();
  }

  // Keep a single empty selector after the selected abilities.
  function syncEmptySuperGroup(){
    const list=document.getElementById('extraResistanceList');
    if(!list)return;
    const empty=[...list.querySelectorAll('.extra-resistance-group')]
      .filter(group=>!group.querySelector('.super-name')?.value);
    const needsEmpty=!currentJob()||availableSuperNames().length>0;
    const keep=needsEmpty?empty.shift():null;
    empty.forEach(group=>group.remove());
    if(keep){
      list.appendChild(keep);
      rebuildSuperNameOptions(keep);
      fillSuperGroup(keep);
    }else if(needsEmpty){
      list.insertAdjacentHTML('beforeend',resistanceGroupHtml(list.children.length));
      initSuperSelects(list.lastElementChild);
    }
    renumberResistanceGroups();
  }

  function resistanceGroupHtml(index,includeAll=false){
    const job=currentJob();
    const names=includeAll?allAvailableSuperNames(job):availableSuperNames(job);
    const nameOptions='<option value="">超特殊能力を選択</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
    const levelOptions='<option value=""></option><option value="1">1</option><option value="2">2</option>';
    return `<div class="extra-resistance-group" data-group-index="${index}">
      <div class="super-control-row">
        <div class="super-controls">
          <div class="super-field super-name-field">${superSelectControlHtml('name',nameOptions,'超特殊能力を選択',!job)}</div>
          <div class="super-field super-level-field"><span class="super-level-label">Lv</span>${superSelectControlHtml('level',levelOptions,'')}</div>
          <button type="button" class="secondary extra-resistance-group-remove" aria-label="この超特殊能力を削除">×</button>
        </div>
      </div>
      <p class="super-note"></p>
      <div class="extra-resistance-group-rows"></div>
    </div>`;
  }

  function initSuperSelects(root=document){
    root.querySelectorAll('.super-custom-select').forEach(control=>{
      if(control.dataset.ready==='1')return;
      control.dataset.ready='1';
      const select=control.querySelector('select');
      const button=control.querySelector('.custom-select-button');
      const textEl=control.querySelector('.super-name-text,.super-level-text');
      const menu=control.querySelector('.custom-select-menu');
      if(!select||!button||!textEl||!menu)return;

      const placeholder=control.classList.contains('super-level-control')?'':'超特殊能力を選択';
      const close=()=>{
        control.classList.remove('is-open');
        button.setAttribute('aria-expanded','false');
        menu.hidden=true;
      };
      const sync=()=>{
        const selected=select.options[select.selectedIndex];
        textEl.textContent=select.value?(selected?.textContent||select.value):placeholder;
        button.disabled=!!select.disabled;
        menu.innerHTML='';
        for(const option of select.options){
          const item=document.createElement('button');
          item.type='button';
          item.className='custom-select-option'+(option.value===select.value?' is-selected':'');
          item.textContent=option.value?option.textContent:option.textContent;
          item.addEventListener('click',event=>{
            event.stopPropagation();
            select.value=option.value;
            select.dispatchEvent(new Event('change',{bubbles:true}));
            sync();
            close();
          });
          menu.appendChild(item);
        }
      };
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const opening=menu.hidden;
        document.querySelectorAll('.super-custom-select.is-open').forEach(other=>{
          if(other===control)return;
          other.classList.remove('is-open');
          other.querySelector('.custom-select-button')?.setAttribute('aria-expanded','false');
          const otherMenu=other.querySelector('.custom-select-menu');if(otherMenu)otherMenu.hidden=true;
        });
        if(opening){
          sync();menu.hidden=false;control.classList.add('is-open');button.setAttribute('aria-expanded','true');
        }else close();
      });
      select.addEventListener('change',sync);
      sync();
    });
  }

  function syncSuperSelects(root=document){
    root.querySelectorAll('.super-custom-select').forEach(control=>{
      const select=control.querySelector('select');
      const textEl=control.querySelector('.super-name-text,.super-level-text');
      if(!select||!textEl)return;
      const selected=select.options[select.selectedIndex];
      textEl.textContent=select.value?(selected?.textContent||select.value):(control.classList.contains('super-level-control')?'':'超特殊能力を選択');
    });
  }

  function syncSuperRemoveButton(group){
    const hasName=!!group?.querySelector('.super-name')?.value;
    group?.classList.toggle('has-super-name',hasName);
  }

  function renumberResistanceGroups(){
    document.querySelectorAll('.extra-resistance-group').forEach((group,index)=>{
      group.dataset.groupIndex=String(index);
      const remove=group.querySelector('.extra-resistance-group-remove');
      if(!remove){
        group.querySelector('.super-controls')?.insertAdjacentHTML('beforeend','<button type="button" class="secondary extra-resistance-group-remove" aria-label="この超特殊能力を削除">×</button>');
      }
      syncSuperRemoveButton(group);
    });
  }

  function resetResistanceRows(){
    const list=document.getElementById('extraResistanceList');
    if(!list) return;
    list.innerHTML=resistanceGroupHtml(0);
    initSuperSelects(list);
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
      <div class="section-heading no-heading-diamond"><h2 id="extraResistanceTitle">耐性に影響する超特殊能力</h2></div>
      <div id="extraResistanceList" class="extra-resistance-list">${resistanceGroupHtml(0)}</div>`;
    specialCard.insertAdjacentElement('afterend',section);
    initSuperSelects(section);

    section.addEventListener('input',event=>{
      const row=event.target.closest('.extra-resistance-row');
      if(event.target.matches('.extra-resistance-value')) validateResistanceValue(row,true);
    });
    section.addEventListener('change',event=>{
      if(event.target.matches('.super-name,.super-level')){
        const group=event.target.closest('.extra-resistance-group');
        if(event.target.matches('.super-name')){
          // 手入力ではLv2を既定値にし、必要ならユーザーがLv1へ変更する。
          group.querySelector('.super-level').value=event.target.value?'2':'';
        }
        fillSuperGroup(group);
        if(event.target.matches('.super-name')){
          section.querySelectorAll('.extra-resistance-group').forEach(other=>rebuildSuperNameOptions(other));
          syncEmptySuperGroup();
        }
      }
      const row=event.target.closest('.extra-resistance-row');
      if(event.target.matches('.extra-resistance-value')) validateResistanceValue(row,true);
    });
    section.addEventListener('click',event=>{
      const removeGroup=event.target.closest('.extra-resistance-group-remove');
      if(removeGroup){
        removeGroup.closest('.extra-resistance-group')?.remove();
        renumberResistanceGroups();
        section.querySelectorAll('.extra-resistance-group').forEach(other=>rebuildSuperNameOptions(other));
        syncEmptySuperGroup();
      }
    });
  }

  function fillSuperGroup(group){
    const name=group.querySelector('.super-name').value;
    syncSuperRemoveButton(group);
    const def=D.superResistances[name];
    const levelSelect=group.querySelector('.super-level');
    const levelButton=group.querySelector('.super-level-button');
    if(!name){
      levelSelect.value='';
      levelSelect.disabled=true;
      levelButton.disabled=true;
    }else{
      levelSelect.disabled=false;
      levelButton.disabled=false;
    }
    syncSuperSelects(group);
    const lv=Number(levelSelect.value);
    const rows=group.querySelector('.extra-resistance-group-rows');

    rows.innerHTML=def?def.types.map(()=>resistanceRowHtml()).join(''):'';
    if(def) [...rows.children].forEach((row,i)=>{
      row.querySelector('.extra-resistance-type').value=def.types[i];
      row.querySelector('.extra-resistance-type-label').textContent=def.types[i];
      row.querySelector('.extra-resistance-value').value=lv?def.levels[lv-1]:'';
    });
    if(def&&lv) window.__PAWAADO_APPLY_SUPER_INCLUDED_SPECIALS__?.(name);
    group.querySelector('.super-note').textContent=
      !def?.job&&def?.includes&&lv?'下位能力込みの合計値です。':'';
  }

  function removeSupersRequiringSpecial(specialName){
    const target=String(specialName||'');
    if(!target) return false;
    const list=document.getElementById('extraResistanceList');
    if(!list) return false;
    let changed=false;
    [...list.querySelectorAll('.extra-resistance-group')].forEach(group=>{
      const superName=group.querySelector('.super-name')?.value||'';
      if(!superName) return;
      const includes=D.superResistances?.[superName]?.includes||[];
      if(!includes.includes(target)) return;
      group.remove();
      changed=true;
    });
    if(changed){
      renumberResistanceGroups();
      [...list.querySelectorAll('.extra-resistance-group')].forEach(group=>rebuildSuperNameOptions(group));
      syncEmptySuperGroup();
    }
    return changed;
  }
  window.__PAWAADO_REMOVE_SUPERS_REQUIRING_SPECIAL__=removeSupersRequiringSpecial;

  window.__PAWAADO_SET_SUPERS__=entries=>{
    const list=document.getElementById('extraResistanceList');
    list.innerHTML=(entries.length?entries:[{}]).map((_,i)=>resistanceGroupHtml(i,true)).join('');
    initSuperSelects(list);
    renumberResistanceGroups();
    refreshSuperControlsForJob(false);
    entries.forEach((entry,i)=>{
      const group=list.children[i];
      group.querySelector('.super-name').value=entry.name;
      group.querySelector('.super-level').value=entry.level||'';
      syncSuperSelects(group);
      fillSuperGroup(group);
    });
    refreshSuperControlsForJob();
  };
  addStyles();
  injectResistanceUi();
  refreshSuperControlsForJob();

  document.getElementById('job')?.addEventListener('change',()=>queueMicrotask(refreshSuperControlsForJob));

  document.addEventListener('click',()=>{
    document.querySelectorAll('.super-custom-select.is-open').forEach(control=>{
      control.classList.remove('is-open');
      control.querySelector('.custom-select-button')?.setAttribute('aria-expanded','false');
      const menu=control.querySelector('.custom-select-menu');if(menu)menu.hidden=true;
    });
  });
  document.getElementById('calcBtn')?.addEventListener('click',event=>{
    if(validateAllResistanceValues()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  for(const id of ['resetBtn','topResetBtn']){
    document.getElementById(id)?.addEventListener('click',()=>queueMicrotask(resetResistanceRows));
  }
})();

