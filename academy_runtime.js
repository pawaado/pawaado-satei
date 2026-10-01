/*
 * パワアド：アカデミー固有UIランタイム
 *
 * 数値データは data.js を唯一の正本とし、このファイルは表示・入力状態と
 * 計算Workerへの双剣士専用「通常攻撃」状態の受け渡しだけを担当する。
 */
(function(global){
  'use strict';

  const D=global.PAWAADO_DATA;
  const MASTER=D?.academyMaster;
  if(!D || !MASTER) return;

  const BOOTRAIN=MASTER.academies?.find(a=>a.name==='ブートレインアカデミー');
  const DUAL=BOOTRAIN?.dualAttack;
  if(!BOOTRAIN || !DUAL){
    console.error('academyMasterにブートレインアカデミーの双剣士設定がありません。');
    return;
  }

  function applyMasterData(){
    if(D.__academyRuntimeDataApplied) return true;
    if(!Array.isArray(D.academies) || !Array.isArray(D.special)){
      console.error('data.jsのアカデミーまたは特殊能力データが不正です。');
      return false;
    }

    // newest=true のアカデミーを選択肢の先頭へ。数値そのものは変更しない。
    const newestNames=new Set((MASTER.academies||[]).filter(a=>a.newest).map(a=>a.name));
    if(newestNames.size){
      const newestRows=[];
      const otherRows=[];
      for(const row of D.academies){
        (newestNames.has(row[0])?newestRows:otherRows).push(row);
      }
      D.academies.splice(0,D.academies.length,...newestRows,...otherRows);
    }

    // 双剣士専用「通常攻撃」はdata.jsに必須。ここでダミーデータは生成しない。
    const dualIndex=D.special.findIndex(s=>String(s[1])===String(DUAL.skillName));
    if(dualIndex<0){
      console.error(`data.jsに「${DUAL.skillName}」がありません。`);
      return false;
    }

    Object.defineProperty(D,'__academyRuntimeDataApplied',{value:true,writable:true,configurable:true,enumerable:false});
    Object.defineProperty(D,'__dualAttackIndex',{value:dualIndex,writable:true,configurable:true,enumerable:false});
    return true;
  }

  if(!applyMasterData()) return;

  // =========================
  // ブラウザ側：データ反映＋追加UI
  // =========================
  function initBrowserUi(){
    if(!D || global.__academyRuntimeUiPatched) return;
    global.__academyRuntimeUiPatched=true;

    const ACADEMY=BOOTRAIN.name;
    const INTERNAL_DUAL_JOB=DUAL.internalJob;
    const DUAL_LABEL=DUAL.displayJob||'双剣士';
    const DUAL_INDEX=Number(D.__dualAttackIndex);
    let dualLevel=DUAL.initialLevel;
    let dualHint=0;
    let dualError='';

    const style=document.createElement('style');
    style.textContent=`
      body.theme-job-dual{--theme-accent:#174b63;--theme-accent-light:#55a7b7;--theme-accent-pale:#dceff1;--theme-accent-dark:#103746;--theme-line:rgba(16,55,70,.34);--theme-glow:rgba(23,75,99,.20)}
      .dual-attack-row .name-btn{justify-content:flex-start!important}
      .dual-level-text{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .dual-level-badge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;padding:3px 7px;border:1px solid var(--theme-accent-dark);border-radius:999px;background:var(--theme-accent-pale);color:var(--theme-accent-dark);font-size:12px;font-weight:900}
      .dual-level-error{grid-column:1/-1;margin:0;padding:7px 10px 8px;border-top:1px solid rgba(178,71,60,.35);background:#fff0eb;color:#8a251f;font-size:13px;font-weight:800;line-height:1.45}
      .dual-level-error:empty{display:none}
    `;
    document.head.appendChild(style);

    function academyEl(){return document.getElementById('academy');}
    function jobEl(){return document.getElementById('job');}
    function noWrapAcademyLabel(text){const plain=String(text||'').replace(/\u2060/g,'');return plain==='タテレスキュアアカデミー'?'タテレスキュア アカデミー':plain;}
    function syncAcademyOptionLabels(){
      const a=academyEl();
      if(!a) return;
      for(const option of a.options){
        if(!option.value) continue;
        const label=noWrapAcademyLabel(option.value);
        if(option.textContent!==label) option.textContent=label;
      }
    }
    function isDual(){return academyEl()?.value===ACADEMY && jobEl()?.value===INTERNAL_DUAL_JOB;}
    function dexValue(){const n=Number(document.getElementById('basic_器用さ')?.value);return Number.isFinite(n)?n:0;}
    function requiredDex(level){return Number(DUAL.levels[level]?.reqDex||0);}
    function maxValidDualLevel(dex){
      let lv=DUAL.initialLevel;
      for(let n=DUAL.initialLevel+1;n<=DUAL.maxLevel;n++) if(dex>=requiredDex(n)) lv=n;
      return lv;
    }
    function currentLevelIsValid(){return dualLevel<=maxValidDualLevel(dexValue());}
    function cycleDualHint(){dualHint=dualHint>=5?0:dualHint+1;}

    function syncJobLabel(){
      const a=academyEl(),j=jobEl();
      if(!a||!j) return;
      if(a.value===ACADEMY){
        for(const option of j.options){if(option.value===INTERNAL_DUAL_JOB && option.textContent!==DUAL_LABEL) option.textContent=DUAL_LABEL;}
      }
    }
    function syncTheme(){
      if(isDual()){
        document.body.classList.remove('theme-job-archer');
        document.body.classList.add('theme-job-dual');
      }else document.body.classList.remove('theme-job-dual');
    }
    function dualBaseRow(){return document.querySelector(`.skill-row[data-index="${DUAL_INDEX}"]`);}
    function clearDualLevelRows(){document.querySelectorAll('.dual-attack-row[data-dual-level]').forEach(row=>row.remove());}

    function renderDualRows(){
      const base=dualBaseRow();
      if(!base) return;
      clearDualLevelRows();
      // data.js上のダミー行は計算用識別子としてだけ残し、画面では専用Lv行に置き換える。
      base.style.display='none';
      if(!isDual()) return;

      const maxShown=Math.min(DUAL.maxLevel,dualLevel>=DUAL.maxLevel?DUAL.maxLevel:dualLevel+1);
      let anchor=base;
      for(let level=DUAL.initialLevel+1;level<=maxShown;level++){
        const owned=level<=dualLevel;
        const row=document.createElement('div');
        row.className=`skill-row dual-attack-row${owned?' owned':''}`;
        row.dataset.dualLevel=String(level);
        row.innerHTML=`
          <button type="button" class="hint-btn dual-hint-btn" data-dual-action="hint" aria-label="通常攻撃のコツレベルを設定する">${dualHint>0?`Lv${dualHint}`:'＋'}</button>
          <button type="button" class="name-btn dual-level-label" data-dual-action="acquire" aria-label="通常攻撃Lv${level}${owned?'の取得済みを解除する':'を取得する'}">
            <span class="dual-level-text"><span>${DUAL.skillName}</span><span class="dual-level-badge">Lv${level}</span></span>${owned?'<span class="owned-label">✓取得済</span>':''}
          </button>
          <div class="dual-level-error" role="alert" aria-live="polite">${(!owned && level===dualLevel+1)?dualError:''}</div>`;
        anchor.insertAdjacentElement('afterend',row);
        anchor=row;
      }
    }

    function setDualLevel(next){
      dualLevel=Math.max(DUAL.initialLevel,Math.min(DUAL.maxLevel,Number(next)||DUAL.initialLevel));
      dualError='';
      renderDualRows();
    }
    global.__PAWAADO_SET_DUAL_ATTACK__=(level,hint=0)=>{
      dualHint=Math.max(0,Math.min(5,Number(hint)||0));
      setDualLevel(level);
    };
    function tryAcquireLevel(level){
      const target=Number(level);
      if(target<=dualLevel){
        // 下位Lvを解除したら、その上位Lvもまとめて解除する。
        setDualLevel(target-1);
        return;
      }
      if(target!==dualLevel+1 || target>DUAL.maxLevel) return;
      const req=requiredDex(target);
      const dex=dexValue();
      if(dex<req){
        dualError=`取得条件を満たしていません（器用さ${req}以上が必要です）。`;
        renderDualRows();
        return;
      }
      setDualLevel(target);
    }

    document.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button) return;
      if(button.id==='resetBtn'||button.id==='topResetBtn'){
        dualLevel=DUAL.initialLevel;dualHint=0;dualError='';return;
      }
      const row=button.closest('.dual-attack-row[data-dual-level]');
      if(row){
        event.preventDefault();event.stopImmediatePropagation();
        const action=button.dataset.dualAction;
        const level=Number(row.dataset.dualLevel||0);
        if(action==='hint'){
          cycleDualHint();dualError='';renderDualRows();
        }else if(action==='acquire'){
          tryAcquireLevel(level);
        }
        return;
      }
      if(button.id==='calcBtn'&&isDual()&&!currentLevelIsValid()){
        event.preventDefault();event.stopImmediatePropagation();
        const req=requiredDex(dualLevel);
        dualError=`取得条件を満たしていません（通常攻撃Lv${dualLevel}には器用さ${req}以上が必要です）。`;
        renderDualRows();
        const result=document.getElementById('result');
        if(result) result.innerHTML=`<div class="error-box"><ul class="error-box-list"><li>${dualError}</li></ul></div>`;
      }
    },true);

    document.addEventListener('input',event=>{
      if(event.target?.id==='basic_器用さ'&&isDual()){
        if(!currentLevelIsValid()){
          const req=requiredDex(dualLevel);
          dualError=`取得条件を満たしていません（通常攻撃Lv${dualLevel}には器用さ${req}以上が必要です）。`;
        }else dualError='';
        renderDualRows();
      }
    });

    function afterSelectionChange(){
      syncAcademyOptionLabels();syncJobLabel();syncTheme();
      if(!isDual()){dualLevel=DUAL.initialLevel;dualHint=0;dualError='';}
      setTimeout(()=>{syncAcademyOptionLabels();syncJobLabel();syncTheme();renderDualRows();},0);
    }
    academyEl()?.addEventListener('change',afterSelectionChange);
    jobEl()?.addEventListener('change',afterSelectionChange);

    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      queueMicrotask(()=>{
        queued=false;
        observer.disconnect();
        syncJobLabel();syncTheme();renderDualRows();
        if(specialList) observer.observe(specialList,{childList:true});
      });
    });
    const specialList=document.getElementById('specialList');
    // 通常の特殊能力一覧が再描画された時だけ拾い、専用Lv行の再構築中は監視を止める。
    if(specialList) observer.observe(specialList,{childList:true});

    // 双剣士の専用Lv/コツはUI状態なので、計算開始時だけWorker payloadへ付加する。
    // Worker本体のURLは書き換えず、script.jsが指定した最新版をそのまま使う。
    const NativeWorker=global.Worker;
    if(typeof NativeWorker==='function'){
      function WrappedWorker(url,options){
        const raw=String(url||'');
        const worker=new NativeWorker(url,options);
        if(raw.includes('pawaado_worker.js')){
          const nativePost=worker.postMessage.bind(worker);
          worker.postMessage=function(message,transfer){
            if(message?.type==='calculate'&&message.payload){
              message={...message,payload:{...message.payload,dualAttackLevel:dualLevel,dualAttackHint:dualHint,isDualSwordsman:isDual()}};
            }
            return transfer===undefined?nativePost(message):nativePost(message,transfer);
          };
        }
        return worker;
      }
      WrappedWorker.prototype=NativeWorker.prototype;
      try{Object.setPrototypeOf(WrappedWorker,NativeWorker);}catch(_){/* noop */}
      global.Worker=WrappedWorker;
    }

    syncAcademyOptionLabels();syncJobLabel();syncTheme();renderDualRows();
  }

  // script.js / photo_import.js の初期化完了後すぐ使えるよう、window.loadまでは待たない。
  if(document.readyState==='loading') global.addEventListener('DOMContentLoaded',initBrowserUi,{once:true});
  else setTimeout(initBrowserUi,0);
})(typeof self!=='undefined'?self:window);
