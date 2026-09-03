self.window=self;
importScripts('./pawaado_worker.js?v=20260903-bootrain-base');
const __baseHandler=self.onmessage;
const __nativePostMessage=self.postMessage.bind(self);

// pawaado_worker.jsが読み込んだPAWAADO_DATAを同じオブジェクトのまま拡張する。
// 計算関数内のconst Dもこのオブジェクトを参照しているため、以降の計算に反映される。
importScripts('./bootrain_data_patch.js?v=20260903-2');

const D=self.PAWAADO_DATA;
const ACADEMY='ブートレインアカデミー';
const INTERNAL_DUAL_JOB='弓使い';
const DUAL_REQ={2:60,3:70,4:80,5:90,6:100};
const DUAL_UPGRADES={
  2:{cost:[500,300,500,0,0],score:1000},
  3:{cost:[0,400,600,0,0],score:400},
  4:{cost:[0,500,700,0,0],score:400},
  5:{cost:[800,600,800,0,0],score:900},
  6:{cost:[0,700,900,0,0],score:800}
};

function add5(a,b){return [0,1,2,3,4].map(i=>Number(a[i]||0)+Number(b[i]||0));}
function leq5(a,b){return [0,1,2,3,4].every(i=>Number(a[i]||0)<=Number(b[i]||0));}
function sum5(a){return a.reduce((s,v)=>s+Number(v||0),0);}
function parseRange(text){const m=String(text).match(/(\d+)→(\d+)/);return m?{a:Number(m[1]),b:Number(m[2])}:null;}
function rowForValue(table,value){
  for(const row of table||[]){
    const r=parseRange(row[0]);
    if(r && value>=r.a && value<r.b) return row;
  }
  return null;
}
function discountedBasicCost(value,hint){
  const rate=Math.max(0,Math.min(5,Number(hint||0)))*0.02;
  return Math.floor(Number(value||0)*(1-rate));
}
function dexRaise(from,to,hint){
  let cost=[0,0,0,0,0];
  let score=0;
  for(let v=from;v<to;v++){
    const costRow=rowForValue(D.dexCost,v);
    const scoreRow=rowForValue(D.dexScore,v);
    if(!costRow||!scoreRow) return null;
    const step=[1,2,3,4,5].map(i=>discountedBasicCost(costRow[i],hint));
    cost=add5(cost,step);
    score+=Number(scoreRow[2]||0);
  }
  return {cost,score};
}
function dualUpgrade(fromLevel,toLevel){
  let cost=[0,0,0,0,0];
  let score=0;
  for(let lv=fromLevel+1;lv<=toLevel;lv++){
    const def=DUAL_UPGRADES[lv];
    if(!def) continue;
    cost=add5(cost,def.cost);
    score+=Number(def.score||0);
  }
  return {cost,score};
}
function maxValidLevel(dex){
  let level=1;
  for(let lv=2;lv<=6;lv++) if(dex>=DUAL_REQ[lv]) level=lv;
  return level;
}

async function runBase(payload){
  let output=null;
  const previousPost=self.postMessage;
  self.postMessage=(message)=>{output=message;};
  try{
    await __baseHandler({data:{type:'calculate',payload}});
  }finally{
    self.postMessage=previousPost;
  }
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

self.onmessage=async(event)=>{
  const data=event.data||{};
  if(data.type==='cancel'){
    return __baseHandler(event);
  }
  if(data.type!=='calculate') return __baseHandler(event);

  const payload=data.payload||{};
  const isDual=!!payload.isDualSwordsman || (String(payload.academy||'')===ACADEMY && String(payload.job||'')===INTERNAL_DUAL_JOB);
  if(!isDual){
    return __baseHandler(event);
  }

  try{
    const originalExp=Array.isArray(payload.exp)?payload.exp.map(v=>Number(v||0)):[0,0,0,0,0];
    const currentDex=Number(payload.basicValues?.['器用さ']||1);
    const currentLevel=Math.max(1,Math.min(6,Number(payload.dualAttackLevel||1)));

    if(currentLevel>maxValidLevel(currentDex)){
      const req=Number(DUAL_REQ[currentLevel]||0);
      throw new Error(`取得条件を満たしていません（通常攻撃Lv${currentLevel}には器用さ${req}以上が必要です）。`);
    }

    let best=null;
    const dexHint=Number(payload.basicHints?.['器用さ']||0);

    for(let target=currentLevel;target<=6;target++){
      const req=target===currentLevel?0:Number(DUAL_REQ[target]||0);
      const forcedDex=Math.max(currentDex,req);
      const dexPart=dexRaise(currentDex,forcedDex,dexHint);
      if(!dexPart) continue;
      const dualPart=dualUpgrade(currentLevel,target);
      const mandatoryCost=add5(dexPart.cost,dualPart.cost);
      if(!leq5(mandatoryCost,originalExp)) continue;

      const remainingExp=originalExp.map((v,i)=>v-mandatoryCost[i]);
      const modifiedPayload={
        ...payload,
        exp:remainingExp,
        basicValues:{...payload.basicValues,['器用さ']:forcedDex}
      };

      const base=await runBase(modifiedPayload);
      const finalCost=add5(mandatoryCost,base.cost||[0,0,0,0,0]);
      if(!leq5(finalCost,originalExp)) continue;

      const items=[];
      if(forcedDex>currentDex){
        items.push({type:'basic',name:'器用さ',from:currentDex,to:forcedDex,idx:3});
      }
      items.push(...(Array.isArray(base.items)?base.items.map(x=>({...x})):[]));
      if(target>currentLevel){
        items.push({
          type:'special',
          idx:Number(D.__dualAttackIndex),
          name:`通常攻撃(双剣士) Lv${currentLevel}→Lv${target}`
        });
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

      if(!best || candidate.score>best.score || (candidate.score===best.score && candidate.usedCost<best.usedCost)){
        best=candidate;
      }
    }

    if(!best){
      best=await runBase(payload);
    }

    __nativePostMessage({type:'result',result:best});
  }catch(error){
    if(error?.name==='CalculationCancelledError'){
      __nativePostMessage({type:'cancelled'});
    }else{
      __nativePostMessage({
        type:'error',
        name:error?.name||'Error',
        message:error?.message||'Worker内で原因不明のエラーが発生しました。'
      });
    }
  }
};
