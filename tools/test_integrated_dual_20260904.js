const fs=require('fs'),vm=require('vm');
const academySrc=fs.readFileSync('academy_runtime.js','utf8');
function makeCtx(){
  const ctx={console,setTimeout,clearTimeout,Promise,Map,Set,BigInt,Math,Number,String,Array,Object,JSON,Date,Error,RegExp,Uint32Array,Float64Array};
  ctx.self=ctx;ctx.globalThis=ctx;ctx.window=ctx;ctx.performance={now:()=>Date.now()};ctx._posts=[];ctx.postMessage=m=>ctx._posts.push(m);
  vm.createContext(ctx);
  ctx.importScripts=(...urls)=>{for(const u of urls){const f=String(u).split('?')[0].replace(/^\.\//,'');vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});}};
  vm.runInContext(academySrc,ctx,{filename:'academy_runtime.js'});
  return ctx;
}
async function run(payload,label){
  const ctx=makeCtx();
  const t=Date.now();
  await ctx.onmessage({data:{type:'calculate',payload}});
  const ms=Date.now()-t;
  const msg=ctx._posts.at(-1);
  if(!msg||msg.type!=='result') throw new Error(label+' '+JSON.stringify(msg));
  console.log(label,'ms=',ms,'score=',msg.result.score,'cost=',msg.result.cost.join(','),'remain=',payload.exp.map((v,i)=>v-msg.result.cost[i]).join(','));
  console.log(label,'items=',msg.result.items.map(x=>x.type==='basic'?`${x.name} ${x.from}->${x.to}`:x.name).join(' / '));
  return msg.result;
}
(async()=>{
  const hints={生命力:0,パワー:0,魔力:0,器用さ:0,耐久力:0,精神力:0};
  const r1=await run({academy:'ブートレインアカデミー',job:'双剣士',exp:[500,300,500,0,0],basicValues:{生命力:110,パワー:115,魔力:60,器用さ:70,耐久力:100,精神力:95},basicOwned:{生命力:true,パワー:true,魔力:true,器用さ:true,耐久力:true,精神力:true},basicHints:hints,specialState:[],dualAttackLevel:1,dualAttackHint:0,isDualSwordsman:true},'SMALL');
  if(Number(r1.score)!==1000||!r1.items.some(x=>String(x.name).includes('通常攻撃(双剣士) Lv2'))) throw new Error('small regression failed');
  const bigPayload={academy:'ブートレインアカデミー',job:'双剣士',exp:[1300,1200,1400,1300,1200],basicValues:{生命力:110,パワー:115,魔力:60,器用さ:80,耐久力:100,精神力:95},basicOwned:{生命力:true,パワー:true,魔力:true,器用さ:false,耐久力:true,精神力:true},basicHints:hints,specialState:[],dualAttackLevel:1,dualAttackHint:0,isDualSwordsman:true};
  const r2=await run(bigPayload,'BIG');
  if(Number(r2.score)<3877) throw new Error('big score regressed '+r2.score);
  if(!r2.items.some(x=>String(x.name).includes('通常攻撃(双剣士) Lv2'))) throw new Error('big dual Lv2 missing');
})().catch(e=>{console.error(e);process.exit(1)});
