// Run with: node tests/scoring.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

async function main(){
  const messages=[];
  const context=vm.createContext({console,setTimeout,clearTimeout,performance,postMessage:m=>messages.push(m)});
  context.self=context;
  context.importScripts=url=>vm.runInContext(read(url.split('?')[0]),context);
  context.fetch=async url=>({ok:true,text:async()=>read(url.split('?')[0])});
  // Exercise the shipped loader's exact string replacements and actual scoring code.
  context.eval=source=>{
    const end=source.lastIndexOf('})();');
    assert.ok(end>0);
    const expose=`self.testApi={D,job,skillScore,costAfter,ceilResistanceTenth,resistanceScoreForBits,dynamicSpecialGainForBits,specialBit,specialNameIndex,__applyWorkerPayload,mixedHpDeltaForBits,ownedHpDependentBreakdown,mixedApplyAction};`;
    vm.runInContext(source.slice(0,end)+expose+source.slice(end),context);
  };
  vm.runInContext(read('pawaado_worker_resistance_v2.js'),context);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(messages,[],'worker loader must initialize without errors');
  const a=context.testApi;
  assert.ok(a,'patched worker initialized');
  const scoreSource=read('script.js').match(/function finalizeScore\(value\)\{[\s\S]*?\n\}/)[0];
  const finalize=vm.runInNewContext('('+scoreSource+')');
  const row=name=>a.D.special.find(s=>s[1]===name);
  const idx=name=>a.specialNameIndex.get(name);
  const basics=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  const academy=a.D.academies.find(r=>r[1]==='僧侶');
  const payload={academy:academy[0],job:'僧侶',basicValues:Object.fromEntries(basics.map((n,i)=>[n,academy[i+2]])),basicOwned:Object.fromEntries(basics.map(n=>[n,true])),extraResistances:[{name:'test',type:'必殺技耐性',value:87.5}]};
  a.__applyWorkerPayload(payload);
  close(a.skillScore(row('魔法攻撃○'),351),13.5);
  close(a.skillScore(row('魔法攻撃◎'),351),9);
  close(a.skillScore(row('闘争本能'),351),13.5);
  close(a.skillScore(row('がむしゃら'),351),-248.5);
  close(a.skillScore(row('忍耐'),351),10.53);
  close(a.skillScore(row('癒やしの心'),351),93.51);
  close(a.mixedHpDeltaForBits(a.specialBit(idx('忍耐')),350,351),0.03);
  // Existing resistance 87.5% plus crisis awareness 4% -> 88.0%.
  // Keep both the baseline's .5 and the 16.5 incremental rating.
  const bit=a.specialBit(idx('危機察知'));
  close(a.resistanceScoreForBits(0n),87.5*33);
  close(a.resistanceScoreForBits(bit),88*33);
  const resistance=a.dynamicSpecialGainForBits(0n,bit,[{type:'special',idx:idx('危機察知')}],132);
  close(resistance,16.5);
  assert.equal(finalize(resistance+a.skillScore(row('魔法攻撃○'),351)),30);
  assert.equal(finalize(10.8+4.5),15);
  assert.equal(finalize(16.5+4.5),21);
  assert.equal(finalize(20.999999999999996),21);
  assert.equal(finalize(20.999),20);
  assert.equal(a.costAfter(95,5),9);
  assert.equal(a.costAfter(75,5),7);
  assert.equal(a.costAfter(285,3),85);
  assert.equal(a.costAfter(101,1,true),98);
  close(a.ceilResistanceTenth(5.95),6);
  close(a.ceilResistanceTenth(-0.98),-0.9);
  // Negative resistance retains the existing composition rules.
  a.__applyWorkerPayload({...payload,extraResistances:[]});
  const injury=a.specialBit(idx('ケガしにくさ○'));
  const reckless=a.specialBit(idx('がむしゃら'));
  close(a.resistanceScoreForBits(injury|reckless),-126);
  close(a.dynamicSpecialGainForBits(injury,reckless,[{type:'special',idx:idx('がむしゃら')}],-248.5),-234.5);
  // End-to-end request verifies loader, payload, optimizer, and result serialization.
  await context.onmessage({data:{type:'calculate',payload:{...payload,extraResistances:[],exp:[0,0,30,170,70]}}});
  const result=messages.findLast(m=>m.type==='result');
  assert.ok(result,JSON.stringify(messages));
  close(result.result.score,13.5);
  assert.equal(finalize(result.result.score),13);
  assert.ok(result.result.items.some(it=>it.name==='魔法攻撃○'));
  console.log('PASS: decimal HP, priest, resistance gains, final flooring, cost discounts, resistance rounding, and worker integration');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
