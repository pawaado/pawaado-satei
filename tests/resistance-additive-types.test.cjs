'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function setup(){
  const c={console,BigInt,Map,Set,WeakMap,Uint8Array,Number,String,Math,JSON,Array,Object,Promise};
  c.self=c;c.window=c;c.postMessage=()=>{};
  vm.createContext(c);
  c.importScripts=(...urls)=>urls.forEach(url=>{
    const file=url.replace(/^\.\//,'').split('?')[0];
    vm.runInContext(read(file),c,{filename:file});
  });
  vm.runInContext(read('pawaado_worker.js'),c,{filename:'pawaado_worker.js'});
  const source=read('pawaado_worker_resistance.js'),quote=String.fromCharCode(96);
  const marker='const resistanceEngine='+quote;
  const pos=source.indexOf(marker);
  assert(pos>=0,'resistance engine source must exist');
  const start=pos+marker.length;
  const end=source.indexOf(quote+';\n\n    source=replaceOnce(',start);
  assert(end>start,'resistance engine source must remain extractable');
  vm.runInContext(source.slice(start,end),c,{filename:'resistance-engine.js'});
  vm.runInContext("job.value='剣士'",c);
  return c;
}
test('six game-help additive types are centralized, including unregistered special status resistance',()=>{
  const c=setup(),rules=c.PAWAADO_DATA.resistanceRules;
  const expected=['会心耐性率','会心ダメージ耐性','ダメージ状態異常耐性','弱体化状態異常耐性','行動不能状態異常耐性','特殊状態異常耐性'];
  assert.deepEqual(Array.from(rules.additiveTypes),expected);
  assert.equal(Object.hasOwn(rules.scorePerPercent,'特殊状態異常耐性'),false,'unverified appraisal must remain unknown');
  for(const type of expected){
    c.__testType=type;
    assert.equal(vm.runInContext('aggregateResistancePercent(__testType,new Map([[0,14],[1,22]]))',c),36,type+' must add 14%+22%');
  }
});
test('ordinary resistance still uses multiplicative compaction and tenth-percent ceiling',()=>{
  const c=setup();
  const raw=vm.runInContext("aggregateResistancePercent('物理攻撃耐性',new Map([[0,20],[1,20]]))",c);
  assert(Math.abs(raw-36)<1e-9,'ordinary resistance 20%+20% must compress to 36%');
  assert.equal(vm.runInContext("ceilResistanceTenth(aggregateResistancePercent('物理攻撃耐性',new Map([[0,2],[1,2],[2,2]])))",c),5.9);
});
test('three real damage-status effects combine at 6%, not compressed 5.9%',()=>{
  const c=setup();
  const program=[
    '(()=>{',
    "workerExtraResistances=[{name:'追加状態異常',type:'ダメージ状態異常耐性',value:2}];",
    'resistanceScoreCache.clear();',
    "const first=specialNameIndex.get('生命管理');",
    "const second=specialNameIndex.get('免疫強化');",
    "if(first===undefined||second===undefined)throw new Error('missing special effect');",
    'const bits=specialBit(first)|specialBit(second);',
    "const sources=resistanceSourcesForBits(bits).get('ダメージ状態異常耐性');",
    'return {sources:[...sources.values()],score:resistanceScoreForBits(bits)};',
    '})()'
  ].join('\n');
  const result=vm.runInContext(program,c);
  assert.deepEqual(Array.from(result.sources),[2,2,2]);
  assert.equal(result.score,120,'2+2+2 must be 6.0% rather than compressed 5.9%');
});
