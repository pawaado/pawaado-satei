/*
 * パワアド：追加アカデミー共通ランタイム
 *
 * 数値データは data.js に一本化し、このファイルは追加アカデミー共通の表示・計算処理だけを担当する。
 * 今後、新アカデミーが増えてもアカデミー別JSは増やさない。
 */
(function(global){
  'use strict';

  // 数値データは data.js が唯一の正本。
  // Workerとして直接起動された場合だけ、先に本体Workerを読み込んでdata.jsを初期化する。
  const __academyWorkerBoot=(typeof document==='undefined' && typeof global.importScripts==='function');
  if(__academyWorkerBoot && !global.PAWAADO_DATA){
    global.window=global;
    global.importScripts('./pawaado_worker.js?v=20260904-range-compact-1');
  }
  const MASTER=global.PAWAADO_DATA?.academyMaster;
  if(!MASTER) return;
  global.PAWAADO_ACADEMY_MASTER=MASTER;

  const BOOTRAIN=MASTER.academies.find(a=>a.name==='ブートレインアカデミー');
  const DUAL=BOOTRAIN.dualAttack;
  const SPECIAL_DISCOUNT=[0,.5,.6,.7,.8,.9];
  const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];

  function upsertAcademy(D,academyName,job,limits){
    const row=[academyName,job].concat(basicNames.map(n=>Number(limits[n])));
    const idx=D.academies.findIndex(r=>r[0]===academyName && r[1]===job);
    if(idx>=0) D.academies[idx]=row;
    else D.academies.push(row);
  }

  function upsertRange(table,row){
    if(!Array.isArray(table)) return;
    const idx=table.findIndex(r=>String(r[0])===String(row[0]));
    if(idx>=0) table[idx]=row;
    else table.push(row);
  }

  function applyMasterData(D){
    if(!D || D.__academyRuntimeDataApplied) return;
    Object.defineProperty(D,'__academyRuntimeDataApplied',{value:true,writable:true,configurable:true,enumerable:false});

    // newest=true のアカデミーを選択肢の先頭へ。
    const newestNames=MASTER.academies.filter(a=>a.newest).map(a=>a.name);
    const newestRows=[];
    const otherRows=[];
    for(const row of D.academies){
      (newestNames.includes(row[0])?newestRows:otherRows).push(row);
    }
    D.academies.splice(0,D.academies.length,...newestRows,...otherRows);

    // 基本能力の査定・必要経験点・HPは data.js の通常テーブルをそのまま使用する。

    // 双剣士専用「通常攻撃」のUI用ダミー行。実計算はこのファイルのWorker部で行う。
    let dualIndex=D.special.findIndex(s=>String(s[1])===DUAL.skillName);
    if(dualIndex<0){
      D.special.push([999,DUAL.skillName,null,0,0,0,0,0,0,0,0,0,0,0,0,'双剣士専用。Lv1は初期取得済で、Lv2以降を順番に取得する。']);
      dualIndex=D.special.length-1;
    }
    Object.defineProperty(D,'__dualAttackIndex',{value:dualIndex,writable:true,configurable:true,enumerable:false});
    Object.defineProperty(D,'__bootrainAcademyName',{value:BOOTRAIN.name,writable:true,configurable:true,enumerable:false});
    Object.defineProperty(D,'__dualInternalJob',{value:DUAL.internalJob,writable:true,configurable:true,enumerable:false});
  }

  const isWorker=(typeof document==='undefined' && typeof global.importScripts==='function');

  // =========================
  // Worker側：追加アカデミー計算
  // =========================
  if(isWorker){
    global.window=global;
    if(!global.PAWAADO_DATA) global.importScripts('./pawaado_worker.js?v=20260904-range-compact-1');
    const baseHandler=global.onmessage;
    const nativePostMessage=global.postMessage.bind(global);
    const D=global.PAWAADO_DATA;
    applyMasterData(D);

    const INTERNAL_DUAL_JOB=DUAL.internalJob;

    function add5(a,b){return [0,1,2,3,4].map(i=>Number(a[i]||0)+Number(b[i]||0));}
    function leq5(a,b){return [0,1,2,3,4].every(i=>Number(a[i]||0)<=Number(b[i]||0));}
    function sum5(a){return a.reduce((s,v)=>s+Number(v||0),0);}
    function parseRange(text){const m=String(text).match(/(\d+)→(\d+)/);return m?{a:Number(m[1]),b:Number(m[2])}:null;}
    function rowForValue(table,value){
      for(const row of table||[]){const r=parseRange(row[0]);if(r&&value>=r.a&&value<r.b)return row;}
      return null;
    }
    function discountedBasicCost(value,hint){
      const rate=Math.max(0,Math.min(5,Number(hint||0)))*0.02;
      return Math.floor(Number(value||0)*(1-rate));
    }
    function discountedSpecialCost(value,hint){
      const lv=Math.max(0,Math.min(5,Number(hint||0)));
      return Math.floor(Number(value||0)*(1-Number(SPECIAL_DISCOUNT[lv]||0)));
    }
    function dexRaise(from,to,hint){
      let cost=[0,0,0,0,0];
      let score=0;
      for(let v=from;v<to;v++){
        const costRow=rowForValue(D.dexCost,v);
        const scoreRow=rowForValue(D.dexScore,v);
        if(!costRow||!scoreRow) return null;
        cost=add5(cost,[1,2,3,4,5].map(i=>discountedBasicCost(costRow[i],hint)));
        score+=Number(scoreRow[2]||0);
      }
      return {cost,score};
    }
    function dualUpgrade(fromLevel,toLevel,hint){
      let cost=[0,0,0,0,0];
      let score=0;
      for(let lv=fromLevel+1;lv<=toLevel;lv++){
        const def=DUAL.levels[lv];
        if(!def) continue;
        cost=add5(cost,def.cost.map(v=>discountedSpecialCost(v,hint)));
        score+=Number(def.score||0);
      }
      return {cost,score};
    }
    function maxValidLevel(dex){
      let level=DUAL.initialLevel;
      for(let lv=DUAL.initialLevel+1;lv<=DUAL.maxLevel;lv++){
        if(dex>=Number(DUAL.levels[lv]?.reqDex||0)) level=lv;
      }
      return level;
    }
    async function runBase(payload){
      let output=null;
      const previousPost=global.postMessage;
      global.postMessage=(message)=>{output=message;};
      try{await baseHandler({data:{type:'calculate',payload}});}
      finally{global.postMessage=previousPost;}
      if(!output) throw new Error('計算結果を取得できませんでした。');
      if(output.type==='result') return output.result;
      if(output.type==='cancelled'){
        const err=new Error('計算がキャンセルされました');
        err.name='CalculationCancelledError';
        throw err;
      }
      const err=new Error(output.message||'Worker内で計算エラーが発生しました。');
      err.name=output.name||'WorkerError';
      throw err;
    }

    global.onmessage=async(event)=>{
      const data=event.data||{};
      if(data.type==='cancel') return baseHandler(event);
      if(data.type!=='calculate') return baseHandler(event);

      const payload=data.payload||{};
      const isDual=!!payload.isDualSwordsman || (String(payload.academy||'')===BOOTRAIN.name && String(payload.job||'')===INTERNAL_DUAL_JOB);
      if(!isDual) return baseHandler(event);

      try{
        const originalExp=Array.isArray(payload.exp)?payload.exp.map(v=>Number(v||0)):[0,0,0,0,0];
        const currentDex=Number(payload.basicValues?.['器用さ']||1);
        const currentLevel=Math.max(DUAL.initialLevel,Math.min(DUAL.maxLevel,Number(payload.dualAttackLevel||DUAL.initialLevel)));
        const dualHint=Math.max(0,Math.min(5,Number(payload.dualAttackHint||0)));

        if(currentLevel>maxValidLevel(currentDex)){
          const req=Number(DUAL.levels[currentLevel]?.reqDex||0);
          throw new Error(`取得条件を満たしていません（通常攻撃Lv${currentLevel}には器用さ${req}以上が必要です）。`);
        }

        let best=null;
        const dexHint=Number(payload.basicHints?.['器用さ']||0);

        for(let target=currentLevel;target<=DUAL.maxLevel;target++){
          const req=target===currentLevel?0:Number(DUAL.levels[target]?.reqDex||0);
          const forcedDex=Math.max(currentDex,req);
          const dexPart=dexRaise(currentDex,forcedDex,dexHint);
          if(!dexPart) continue;
          const dualPart=dualUpgrade(currentLevel,target,dualHint);
          const mandatoryCost=add5(dexPart.cost,dualPart.cost);
          if(!leq5(mandatoryCost,originalExp)) continue;

          const remainingExp=originalExp.map((v,i)=>v-mandatoryCost[i]);
          const modifiedPayload={...payload,exp:remainingExp,basicValues:{...payload.basicValues,['器用さ']:forcedDex}};
          const base=await runBase(modifiedPayload);
          const finalCost=add5(mandatoryCost,base.cost||[0,0,0,0,0]);
          if(!leq5(finalCost,originalExp)) continue;

          const items=[];
          if(forcedDex>currentDex) items.push({type:'basic',name:'器用さ',from:currentDex,to:forcedDex,idx:3});
          items.push(...(Array.isArray(base.items)?base.items.map(x=>({...x})):[]));
          if(target>currentLevel){
            const firstAcquired=currentLevel+1;
            const levelText=target===firstAcquired?`Lv${target}`:`Lv${firstAcquired}→Lv${target}`;
            items.push({type:'special',idx:Number(D.__dualAttackIndex),name:`${DUAL.skillName} ${levelText}`});
          }

          const score=Number(base.score||0)+Number(dexPart.score||0)+Number(dualPart.score||0);
          const candidate={
            cost:finalCost,
            score,
            life:base.life??null,
            items,
            itemLen:items.length,
            usedCost:sum5(finalCost),
            ownedHpDelta:Number(base.ownedHpDelta||0),
            dualTargetLevel:target
          };
          if(!best || candidate.score>best.score || (candidate.score===best.score && candidate.usedCost<best.usedCost)) best=candidate;
        }

        if(!best) best=await runBase(payload);
        nativePostMessage({type:'result',result:best});
      }catch(error){
        if(error?.name==='CalculationCancelledError') nativePostMessage({type:'cancelled'});
        else nativePostMessage({type:'error',name:error?.name||'Error',message:error?.message||'Worker内で原因不明のエラーが発生しました。'});
      }
    };
    return;
  }

  // =========================
  // ブラウザ側：データ反映＋追加UI
  // =========================
  const D=global.PAWAADO_DATA;
  applyMasterData(D);

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
    function isDual(){return academyEl()?.value===ACADEMY && jobEl()?.value===INTERNAL_DUAL_JOB;}
    function dexValue(){const n=Number(document.getElementById('basic_器用さ')?.value);return Number.isFinite(n)?n:0;}
    function requiredDex(level){return Number(DUAL.levels[level]?.reqDex||0);}
    function maxValidDualLevel(dex){
      let lv=DUAL.initialLevel;
      for(let n=DUAL.initialLevel+1;n<=DUAL.maxLevel;n++) if(dex>=requiredDex(n)) lv=n;
      return lv;
    }
    function currentLevelIsValid(){return dualLevel<=maxValidDualLevel(dexValue());}
    function nextDualLevel(){return dualLevel>=DUAL.maxLevel?DUAL.maxLevel:dualLevel+1;}
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
    function dualRow(){return document.querySelector(`.skill-row[data-index="${DUAL_INDEX}"]`);}

    function renderDualRow(){
      const row=dualRow();
      if(!row) return;
      if(!isDual()){
        if(row.style.display!=='none') row.style.display='none';
        return;
      }
      if(row.style.display==='none') row.style.display='';
      row.classList.add('dual-attack-row');
      if(!row.querySelector('.dual-hint-btn')){
        row.innerHTML=`
          <button type="button" class="hint-btn dual-hint-btn" data-dual-action="hint" aria-label="通常攻撃のコツレベルを設定する">＋</button>
          <button type="button" class="name-btn dual-level-label" data-dual-action="acquire" aria-label="通常攻撃の次レベルを取得する"></button>
          <div class="dual-level-error" role="alert" aria-live="polite"></div>`;
      }
      const maxed=dualLevel>=DUAL.maxLevel;
      const shownLevel=nextDualLevel();
      row.classList.toggle('owned',maxed);
      const hint=row.querySelector('.dual-hint-btn');
      if(hint){hint.textContent=dualHint>0?`Lv${dualHint}`:'＋';hint.classList.toggle('has-hint',dualHint>0);}
      const label=row.querySelector('.dual-level-label');
      if(label){
        label.dataset.dualLevel=String(shownLevel);
        label.setAttribute('aria-disabled',maxed?'true':'false');
        const labelHtml=`<span class="dual-level-text"><span>${DUAL.skillName}</span><span class="dual-level-badge">Lv${shownLevel}</span></span>${maxed?'<span class="owned-label">✓取得済</span>':''}`;
        if(label.innerHTML!==labelHtml) label.innerHTML=labelHtml;
      }
      const error=row.querySelector('.dual-level-error');
      if(error&&error.textContent!==dualError) error.textContent=dualError;
    }

    function setDualLevel(next){dualLevel=Math.max(DUAL.initialLevel,Math.min(DUAL.maxLevel,Number(next)||DUAL.initialLevel));dualError='';renderDualRow();}
    function tryAcquireNext(){
      if(dualLevel>=DUAL.maxLevel) return;
      const next=dualLevel+1;
      const req=requiredDex(next);
      const dex=dexValue();
      if(dex<req){dualError=`取得条件を満たしていません（器用さ${req}以上が必要です）。`;renderDualRow();return;}
      setDualLevel(next);
    }

    document.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button) return;
      if(button.id==='resetBtn'||button.id==='topResetBtn'){
        dualLevel=DUAL.initialLevel;dualHint=0;dualError='';return;
      }
      const row=button.closest(`.skill-row[data-index="${DUAL_INDEX}"]`);
      if(row){
        event.preventDefault();event.stopImmediatePropagation();
        const action=button.dataset.dualAction;
        if(action==='hint'){cycleDualHint();dualError='';renderDualRow();}
        else if(action==='acquire') tryAcquireNext();
        return;
      }
      if(button.id==='calcBtn'&&isDual()&&!currentLevelIsValid()){
        event.preventDefault();event.stopImmediatePropagation();
        const req=requiredDex(dualLevel);
        dualError=`取得条件を満たしていません（通常攻撃Lv${dualLevel}には器用さ${req}以上が必要です）。`;
        renderDualRow();
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
        renderDualRow();
      }
    });

    function afterSelectionChange(){
      syncJobLabel();syncTheme();
      if(!isDual()){dualLevel=DUAL.initialLevel;dualHint=0;dualError='';}
      setTimeout(()=>{syncJobLabel();syncTheme();renderDualRow();},0);
    }
    academyEl()?.addEventListener('change',afterSelectionChange);
    jobEl()?.addEventListener('change',afterSelectionChange);

    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      queueMicrotask(()=>{queued=false;syncJobLabel();syncTheme();renderDualRow();});
    });
    const specialList=document.getElementById('specialList');
    // specialList直下の再描画だけを監視する。subtree監視は双剣士行自身の更新を拾って無限ループになるため使わない。
    if(specialList) observer.observe(specialList,{childList:true});

    // 通常の計算Workerを、この同じ academy_runtime.js のWorkerモードへ差し替える。
    const NativeWorker=global.Worker;
    if(typeof NativeWorker==='function'){
      function WrappedWorker(url,options){
        const raw=String(url||'');
        const rewritten=raw.includes('pawaado_worker.js')?'./academy_runtime.js?v=20260904-dual-freeze-1':url;
        const worker=new NativeWorker(rewritten,options);
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

    syncJobLabel();syncTheme();renderDualRow();
  }

  // data反映はscript.jsより前に済ませ、UIフックだけページ読込完了後に開始する。
  if(document.readyState==='complete') setTimeout(initBrowserUi,0);
  else global.addEventListener('load',initBrowserUi,{once:true});
})(typeof self!=='undefined'?self:window);
