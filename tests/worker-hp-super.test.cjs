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
