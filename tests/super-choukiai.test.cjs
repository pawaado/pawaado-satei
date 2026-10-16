'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const context={window:{}};
vm.runInNewContext(read('data.js'),context,{filename:'data.js'});
const D=context.window.PAWAADO_DATA;

test('超気合 applies total weakening resistance (including 意志) for every job',()=>{
  const def=D.superResistances['超気合'];
  assert(def,'超気合 must be registered as variable-score super');
  assert.deepEqual(Array.from(def.types),['弱体化状態異常耐性']);
  assert.deepEqual(Array.from(def.levels),[28,50]);
  assert.deepEqual(Array.from(def.includes),['意志']);
  assert.equal(def.job,undefined,'超気合 must be available for all jobs');
  assert.deepEqual(Array.from(D.resistanceRules.directEffects['意志'][0]),['弱体化状態異常耐性',2]);
  assert.equal(D.resistanceRules.scorePerPercent['弱体化状態異常耐性'],20);
  assert.equal((def.levels[0]-2)*20,520,'Lv1 appraisal must exclude lower ability');
  assert.equal((def.levels[1]-2)*20,960,'Lv2 cumulative appraisal must exclude lower ability');
  assert.equal((def.levels[1]-def.levels[0])*20,440,'Lv2 upgrade appraisal');
});

test('超気合 is between タフネス and 超免疫 in the fixed kana-sorted selector',()=>{
  const ui=read('resistance_patch.js');
  const names=ui.match(/const SUPER_ORDER=\[([\s\S]*?)\];/);
  assert(names,'missing super order');
  const order=vm.runInNewContext('['+names[1]+']');
  const before=order.indexOf('タフネス');
  const current=order.indexOf('超気合');
  const after=order.indexOf('超免疫');
  assert.equal(current,before+1);
  assert.equal(after,current+1);
  assert(!/["']超気合["']\s*:\s*\{[^}]*?job\s*:/.test(read('data.js')),'should not be job limited');
});

test('all worker and UI asset URLs use the current cache version',()=>{
  const patch=read('resistance_patch.js');
  const v=patch.match(/const PATCH_VERSION='([^']+)'/)?.[1];
  assert(v,'resistance patch version missing');
  const dataVersion=read('pawaado_worker.js').match(/importScripts\('\.\/data\.js\?v=([^']+)'\)/)?.[1];
  assert(dataVersion,'worker data version missing');
  assert(read('index.html').includes('data.js?v='+dataVersion));
  assert(read('index.html').includes('resistance_patch.js?v='+v));
  assert(read('pawaado_worker_resistance.js').includes('pawaado_worker.js?v='+v));
  assert(read('script.js').includes('pawaado_worker.js?v='+v));
  assert(read('script.js').includes('D.superResistances?.[superName]?.includes'));
  assert(read('pawaado_worker_resistance.js').includes('if(included.has(name)) continue;'));
});
