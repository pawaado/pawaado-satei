(function(){
  const D=window.PAWAADO_DATA;
  if(!D || window.__bootrainUiPatched) return;
  window.__bootrainUiPatched=true;

  const ACADEMY='ブートレインアカデミー';
  const INTERNAL_DUAL_JOB='弓使い';
  const DUAL_LABEL='双剣士';
  const DUAL_INDEX=Number(D.__dualAttackIndex);
  const DUAL_REQ={2:60,3:70,4:80,5:90,6:100};
  let dualLevel=1;
  let dualError='';
  let syncingInternalHint=false;

  // 双剣士：画像の衣装に合わせた濃紺＋青緑。魔法使いの青より暗く、緑側へずらす。
  const style=document.createElement('style');
  style.textContent=`
    body.theme-job-dual{--theme-accent:#174b63;--theme-accent-light:#55a7b7;--theme-accent-pale:#dceff1;--theme-accent-dark:#103746;--theme-line:rgba(16,55,70,.34);--theme-glow:rgba(23,75,99,.20)}
    .dual-attack-row{display:grid!important;grid-template-columns:48px minmax(0,1fr) 48px;align-items:stretch}
    .dual-attack-row .dual-level-btn{width:48px;min-width:48px;min-height:52px;padding:4px;border:0;border-radius:0;background:linear-gradient(180deg,#fff4d6,#ecd398);box-shadow:none;color:#4b2b17;font-size:22px;text-shadow:none}
    .dual-attack-row .dual-level-btn:first-child{border-right:2px solid #5b3418}
    .dual-attack-row .dual-level-btn:last-of-type{border-left:2px solid #5b3418}
    .dual-attack-row .dual-level-btn:disabled{opacity:.42}
    .dual-attack-row .name-btn{border-right:0!important;justify-content:flex-start!important}
    .dual-level-text{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .dual-level-badge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;padding:3px 7px;border:1px solid var(--theme-accent-dark);border-radius:999px;background:var(--theme-accent-pale);color:var(--theme-accent-dark);font-size:12px;font-weight:900}
    .dual-level-error{grid-column:1/-1;margin:0;padding:7px 10px 8px;border-top:1px solid rgba(178,71,60,.35);background:#fff0eb;color:#8a251f;font-size:13px;font-weight:800;line-height:1.45}
    .dual-level-error:empty{display:none}
    .dual-internal-hint{display:none!important}
  `;
  document.head.appendChild(style);

  function academyEl(){return document.getElementById('academy');}
  function jobEl(){return document.getElementById('job');}
  function isDual(){return academyEl()?.value===ACADEMY && jobEl()?.value===INTERNAL_DUAL_JOB;}
  function dexValue(){
    const raw=document.getElementById('basic_器用さ')?.value;
    const n=Number(raw);
    return Number.isFinite(n)?n:0;
  }
  function requiredDex(level){return Number(DUAL_REQ[level]||0);}
  function maxValidDualLevel(dex){
    let lv=1;
    for(let n=2;n<=6;n++) if(dex>=requiredDex(n)) lv=n;
    return lv;
  }
  function currentLevelIsValid(){return dualLevel<=maxValidDualLevel(dexValue());}

  function syncJobLabel(){
    const a=academyEl(),j=jobEl();
    if(!a||!j) return;
    if(a.value===ACADEMY){
      for(const option of j.options){
        if(option.value===INTERNAL_DUAL_JOB) option.textContent=DUAL_LABEL;
      }
    }
  }
  function syncTheme(){
    if(isDual()){
      document.body.classList.remove('theme-job-archer');
      document.body.classList.add('theme-job-dual');
    }else{
      document.body.classList.remove('theme-job-dual');
    }
  }
  function dualRow(){return document.querySelector(`.skill-row[data-index="${DUAL_INDEX}"]`);}

  function renderDualRow(){
    const row=dualRow();
    if(!row) return;
    if(!isDual()){
      row.style.display='none';
      return;
    }
    row.style.display='';
    row.classList.add('dual-attack-row');
    row.classList.toggle('owned',dualLevel>1);

    if(!row.querySelector('.dual-level-plus')){
      row.innerHTML=`
        <button type="button" class="dual-level-btn dual-level-minus" data-dual-action="minus" aria-label="通常攻撃レベルを1下げる">−</button>
        <button type="button" class="name-btn dual-level-label" data-dual-action="plus" aria-label="通常攻撃の次レベルを取得する"></button>
        <button type="button" class="dual-level-btn dual-level-plus" data-dual-action="plus" aria-label="通常攻撃の次レベルを取得する">＋</button>
        <button type="button" class="hint-btn dual-internal-hint" data-kind="special-hint" data-index="${DUAL_INDEX}" tabindex="-1" aria-hidden="true"></button>
        <div class="dual-level-error" role="alert" aria-live="polite"></div>`;
    }

    const label=row.querySelector('.dual-level-label');
    if(label) label.innerHTML=`<span class="dual-level-text"><span>通常攻撃(双剣士)</span><span class="dual-level-badge">Lv${dualLevel}</span></span>`;
    const minus=row.querySelector('.dual-level-minus');
    const plus=row.querySelector('.dual-level-plus');
    if(minus) minus.disabled=dualLevel<=1;
    if(plus) plus.disabled=dualLevel>=6;
    const error=row.querySelector('.dual-level-error');
    if(error) error.textContent=dualError;
  }

  function syncInternalHint(oldLevel,newLevel){
    const row=dualRow();
    const btn=row?.querySelector('.dual-internal-hint');
    if(!btn) return;
    const from=(oldLevel-1)%6;
    const to=(newLevel-1)%6;
    let clicks=(to-from+6)%6;
    syncingInternalHint=true;
    try{
      while(clicks-->0) btn.click();
    }finally{
      syncingInternalHint=false;
    }
  }

  function setDualLevel(next){
    next=Math.max(1,Math.min(6,Number(next)||1));
    const old=dualLevel;
    dualLevel=next;
    dualError='';
    syncInternalHint(old,next);
    renderDualRow();
  }
  function tryAcquireNext(){
    if(dualLevel>=6) return;
    const next=dualLevel+1;
    const req=requiredDex(next);
    const dex=dexValue();
    if(dex<req){
      dualError=`取得条件を満たしていません（器用さ${req}以上が必要です）。`;
      renderDualRow();
      return;
    }
    setDualLevel(next);
  }

  // メインスクリプトより前のcapture段階で双剣士専用操作を処理し、通常の特殊能力処理へ流さない。
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button) return;

    if(button.id==='resetBtn' || button.id==='topResetBtn'){
      dualLevel=1;
      dualError='';
      return;
    }

    const row=button.closest(`.skill-row[data-index="${DUAL_INDEX}"]`);
    if(row && !syncingInternalHint){
      event.preventDefault();
      event.stopImmediatePropagation();
      const action=button.dataset.dualAction;
      if(action==='minus') setDualLevel(dualLevel-1);
      else if(action==='plus') tryAcquireNext();
      return;
    }

    if(button.id==='calcBtn' && isDual() && !currentLevelIsValid()){
      event.preventDefault();
      event.stopImmediatePropagation();
      const req=requiredDex(dualLevel);
      dualError=`取得条件を満たしていません（通常攻撃Lv${dualLevel}には器用さ${req}以上が必要です）。`;
      renderDualRow();
      const result=document.getElementById('result');
      if(result) result.innerHTML=`<div class="error-box"><ul class="error-box-list"><li>${dualError}</li></ul></div>`;
    }
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.id==='basic_器用さ' && isDual()){
      // 取得済Lvは勝手に下げず、条件を外れた場合はその場で警告する。
      if(!currentLevelIsValid()){
        const req=requiredDex(dualLevel);
        dualError=`取得条件を満たしていません（通常攻撃Lv${dualLevel}には器用さ${req}以上が必要です）。`;
      }else{
        dualError='';
      }
      renderDualRow();
    }
  });

  function afterSelectionChange(){
    syncJobLabel();
    syncTheme();
    if(!isDual()){
      dualLevel=1;
      dualError='';
    }
    setTimeout(()=>{syncJobLabel();syncTheme();renderDualRow();},0);
  }
  academyEl()?.addEventListener('change',afterSelectionChange);
  jobEl()?.addEventListener('change',afterSelectionChange);

  // メイン側のrenderSpecials/applySkillVisualによる再描画後に専用行を復元する。
  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued) return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      syncJobLabel();
      syncTheme();
      renderDualRow();
    });
  });
  const specialList=document.getElementById('specialList');
  if(specialList) observer.observe(specialList,{childList:true,subtree:true});

  // 計算Workerだけ専用ラッパーへ差し替え、現在の通常攻撃Lvをpayloadへ追加する。
  const NativeWorker=window.Worker;
  if(typeof NativeWorker==='function'){
    function WrappedWorker(url,options){
      const raw=String(url||'');
      const rewritten=raw.includes('pawaado_worker.js')
        ? './bootrain_worker_loader.js?v=20260903-2'
        : url;
      const worker=new NativeWorker(rewritten,options);
      if(raw.includes('pawaado_worker.js')){
        const nativePost=worker.postMessage.bind(worker);
        worker.postMessage=function(message,transfer){
          if(message?.type==='calculate' && message.payload){
            message={...message,payload:{...message.payload,dualAttackLevel:dualLevel,isDualSwordsman:isDual()}};
          }
          return transfer===undefined?nativePost(message):nativePost(message,transfer);
        };
      }
      return worker;
    }
    WrappedWorker.prototype=NativeWorker.prototype;
    try{Object.setPrototypeOf(WrappedWorker,NativeWorker);}catch(_){/* noop */}
    window.Worker=WrappedWorker;
  }

  syncJobLabel();
  syncTheme();
  renderDualRow();
})();
