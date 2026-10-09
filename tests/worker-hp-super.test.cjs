'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

function loadWorker(){
  const c={console,BigInt,Map,Set,WeakMap,Uint8Array,Number,String,Math,JSON,Array,Object,Promise,setTimeout,clearTimeout};
  c.self=c;c.window=c;
  vm.createContext(c);
  c.importScripts=()=>vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),c,{filename:'data.js'});
  c.postMessage=()=>{};
  vm.runInContext(fs.readFileSync(path.join(root,'pawaado_worker.js'),'utf8'),c,{filename:'pawaado_worker.js'});
  return c;
}
function payloadFor(c,{specialState=[],selectedSupers=[]}={}){
  const row=c.PAWAADO_DATA.academies.find(r=>Number(r[2])>=91);
  assert(row);
  const names=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  return {
    academy:row[0],job:row[1],
    basicValues:Object.fromEntries(names.map((n,i)=>[n,i===0?90:1])),
    basicOwned:Object.fromEntries(names.map(n=>[n,false])),
    basicHints:Object.fromEntries(names.map(n=>[n,0])),
    specialState,selectedSupers
  };
}
function lifeGain(c,payload){
  c.__applyWorkerPayload(payload);
  return vm.runInContext(`(()=>{
    const st={cost:[0,0,0,0,0],levels:[90,1,1,1,1,1],bits:EMPTY_BITS,dualLevel:null};
    const base=mixedBasicOption('生命力',90,91).score;
    const action=mixedBasicActions(st,[9999,9999,9999,9999,9999]).find(x=>x.name==='生命力'&&x.to===91);
    return {base,gain:action.gain,hp0:currentHpForLife(90),hp1:currentHpForLife(91)};
  })()`,c);
}

test('existing owned HP-dependent special is included in life appraisal gain',()=>{
  const c=loadWorker();
  const idx=c.PAWAADO_DATA.special.findIndex(row=>row[1]==='癒やしの心');
  assert(idx>=0);
  const r=lifeGain(c,payloadFor(c,{specialState:[[String(idx),{hint:0,own:1}]]}));
  assert.equal(r.hp0,1925);assert.equal(r.hp1,1993);
  assert(Math.abs((r.gain-r.base)-0.68)<1e-9);
});

test('selected HP-dependent super abilities add their HP delta to life appraisal gain',()=>{
  const c=loadWorker();
  const r=lifeGain(c,payloadFor(c,{selectedSupers:[
    {name:'タフネス',level:2},{name:'そよかぜの加護',level:2},{name:'大真面目',level:2}
  ]}));
  assert.equal(r.hp1-r.hp0,68);
  assert(Math.abs((r.gain-r.base)-35.36)<1e-9);
});

test('HP-dependent super Lv1/Lv2 rates match master data',()=>{
  const c=loadWorker();
  const cases=[
    ['タフネス',1,6.8],['タフネス',2,13.6],
    ['そよかぜの加護',1,7.48],['そよかぜの加護',2,14.96],
    ['大真面目',1,4.08],['大真面目',2,6.8]
  ];
  for(const [name,level,expected] of cases){
    const r=lifeGain(c,payloadFor(c,{selectedSupers:[{name,level}]}));
    assert(Math.abs((r.gain-r.base)-expected)<1e-9,`${name} Lv${level}`);
  }
});

test('鉄壁の盾 HP rate applies only to 重戦士',()=>{
  const c=loadWorker();
  const names=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  const heavy=c.PAWAADO_DATA.academies.find(r=>r[1]==='重戦士'&&Number(r[2])>=91);
  assert(heavy);
  const heavyPayload={
    academy:heavy[0],job:'重戦士',
    basicValues:Object.fromEntries(names.map((n,i)=>[n,i===0?90:1])),
    basicOwned:Object.fromEntries(names.map(n=>[n,false])),
    basicHints:Object.fromEntries(names.map(n=>[n,0])),
    specialState:[],selectedSupers:[{name:'鉄壁の盾',level:2}]
  };
  const onJob=lifeGain(c,heavyPayload);
  assert(Math.abs((onJob.gain-onJob.base)-13.6)<1e-9);
  const offJob=lifeGain(c,payloadFor(c,{selectedSupers:[{name:'鉄壁の盾',level:2}]}));
  assert(Math.abs(offJob.gain-offJob.base)<1e-9);
});


function specialActions(c,payload){
  c.__applyWorkerPayload(payload);
  return vm.runInContext(`(()=>{
    const st={cost:[0,0,0,0,0],levels:[90,1,1,1,1,1],bits:EMPTY_BITS,dualLevel:null};
    return mixedSpecialActionsAtHp(st,[9999,9999,9999,9999,9999],currentHpForLife(90))
      .map(op=>({names:op.items.map(x=>x.name),indices:op.items.filter(x=>x.type==='special').map(x=>Number(x.idx))}));
  })()`,c);
}


function constrainedStart(c,payload,exp=[9999,9999,9999,9999,9999]){
  c.__applyWorkerPayload(payload);
  c.__customTestExp=exp;
  return vm.runInContext(`(()=>{
    const state=constrainedInitialState(__customTestExp);
    return {cost:state.cost,score:state.score,levels:state.levels,items:restoreItems(state),bits:bitsKey(state.bits)};
  })()`,c);
}
test('requiring ◎ pays for unowned ○ and ◎ and respects separate upper and lower',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const lower=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル○');
 const upper=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert(lower>=0&&upper>=0);
 const both=constrainedStart(c,{...base,customConditions:{requiredSpecialIndices:[upper]}});
 assert(both.items.some(it=>it.idx===lower));
 assert(both.items.some(it=>it.idx===upper));
 const onlyLower=constrainedStart(c,{...base,customConditions:{requiredSpecialIndices:[lower],forbiddenSpecialIndices:[upper]}});
 assert(onlyLower.items.some(it=>it.idx===lower));
 assert(!onlyLower.items.some(it=>it.idx===upper));
});
test('already acquired prerequisite is never charged twice',()=>{
 const c=loadWorker(),i=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル◎'),lower=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル○');
 const p=payloadFor(c,{specialState:[[String(lower),{hint:0,own:1}]]});
 const st=constrainedStart(c,{...p,customConditions:{requiredSpecialIndices:[i]}});
 assert(st.items.some(it=>it.idx===i));
 assert(!st.items.some(it=>it.idx===lower));
});
test('basic thresholds are prepaid exactly and do not constrain unrelated abilities',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const st=constrainedStart(c,{...base,customConditions:{basicRules:{生命力:{value:93,mode:"above"},器用さ:{value:12,mode:"above"}}}});
 assert.equal(st.levels[0],93);
 assert.equal(st.levels[3],12);
 assert(st.items.some(i=>i.type==='basic'&&i.name==='生命力'&&i.to===93));
 assert(st.items.some(i=>i.type==='basic'&&i.name==='器用さ'&&i.to===12));
 assert(st.cost.some(v=>v>0));
});
test('insufficient experience fails instead of returning a forbidden alternative',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const i=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert.throws(()=>constrainedStart(c,{...base,customConditions:{requiredSpecialIndices:[i]}},[0,0,0,0,0]),/経験点/);
});
test('contradictory required/forbidden selection is rejected',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const i=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル○');
 assert.throws(()=>c.__applyWorkerPayload({...base,customConditions:{requiredSpecialIndices:[i],forbiddenSpecialIndices:[i]}}),/両方/);
});
test('requiring upper with forbidden prerequisite is rejected',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const upper=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル◎');
 const lower=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル○');
 assert.throws(()=>constrainedStart(c,{...base,customConditions:{requiredSpecialIndices:[upper],forbiddenSpecialIndices:[lower]}}),/前提/);
});
test('mutually exclusive required skills are rejected',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const names=['生存本能','闘争本能'].map(n=>c.PAWAADO_DATA.special.findIndex(s=>s[1]===n));
 assert(names.every(i=>i>=0));
 assert.throws(()=>constrainedStart(c,{...base,customConditions:{requiredSpecialIndices:names}}),/両立/);
});
test('conditions participate in cache identity; clearing restores normal actions',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const i=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル◎');
 const variants=[
  {...base,customConditions:{requiredSpecialIndices:[i]}},
  {...base,customConditions:{forbiddenSpecialIndices:[i]}},
  {...base,customConditions:{basicRules:{生命力:{value:94,mode:"above"}}}}
 ];
 assert.equal(new Set([c.__workerPayloadConfigKey(base),...variants.map(v=>c.__workerPayloadConfigKey(v))]).size,4);
 const blocked=specialActions(c,variants[1]);
 assert(!blocked.some(op=>op.indices.includes(i)));
 const restored=specialActions(c,base);
 assert(restored.some(op=>op.indices.includes(i)));
});
test('acquired abilities cannot be forbidden by constraints',()=>{
 const c=loadWorker(),i=c.PAWAADO_DATA.special.findIndex(s=>s[1]==='アクションスキル○');
 const base=payloadFor(c,{specialState:[[String(i),{hint:0,own:1}]]});
 assert.throws(()=>c.__applyWorkerPayload({...base,customConditions:{forbiddenSpecialIndices:[i]}}),/取得済み/);
});

test('fixed basic level stays exact and below restricts ability exploration',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const fixed={...base,customConditions:{basicRules:{生命力:{value:93,mode:'exact'},器用さ:{value:15,mode:'below'}}}};
 const state=constrainedStart(c,fixed);
 assert.equal(state.levels[0],93);
 assert.equal(state.levels[3],1);
 assert.equal(vm.runInContext("mixedLimits()['生命力']",c),93);
 assert.equal(vm.runInContext("mixedLimits()['器用さ']",c),15);
 const next=vm.runInContext(`mixedBasicActions({levels:[93,1,1,15,1,1],cost:[0,0,0,0,0],bits:EMPTY_BITS},[9999,9999,9999,9999,9999]).map(a=>({name:a.name,to:a.to}))`,c);
 assert(!next.some(a=>a.name==='生命力'));
 assert(!next.some(a=>a.name==='器用さ'));
 assert(next.some(a=>a.name==='耐久力'||a.name==='精神力'));
});
test('below never lowers an existing ability and exact cannot be lower than current',()=>{
 const c=loadWorker(),base=payloadFor(c);
 for(const mode of ['exact','below']){
   assert.throws(()=>constrainedStart(c,{...base,customConditions:{basicRules:{生命力:{value:89,mode}}}}),/現在値/);
 }
});
test('dual attack cannot silently raise dexterity above a fixed or below rule',()=>{
 const c=loadWorker();
 const dual=c.PAWAADO_DATA.academies.find(r=>r[1]==='双剣士');
 assert(dual);
 const base=payloadFor(c);
 const p={...base,academy:dual[0],job:'双剣士',customConditions:{basicRules:{器用さ:{value:1,mode:'exact'}}}};
 c.__applyWorkerPayload(p);
 const possible=vm.runInContext(`(()=>{
   const st={cost:[0,0,0,0,0],levels:[90,1,1,1,1,1],bits:EMPTY_BITS,dualLevel:1};
   return mixedDualAction(st,[9999,9999,9999,9999,9999]);
 })()`,c);
 assert.equal(possible,null);
});
test('cache key differs for above exact and below on the same target',()=>{
 const c=loadWorker(),base=payloadFor(c);
 const variants=['above','exact','below'].map(mode=>
   ({...base,customConditions:{basicRules:{生命力:{value:94,mode}}}}));
 assert.equal(new Set(variants.map(v=>c.__workerPayloadConfigKey(v))).size,3);
});
