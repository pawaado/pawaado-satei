'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function data(){
 const c={window:{}};
 vm.runInNewContext(read('data.js'),c);
 vm.runInNewContext(read('skill_master.js'),c);
 return c.window.PAWAADO_DATA;
}
test('all and only the four additive ordinary special skills have fixed resistance appraisal',()=>{
 const D=data(),additive=new Set(D.resistanceRules.additiveTypes);
 const fixed=Object.entries(D.resistanceRules.directEffects)
   .filter(([,effects])=>effects.every(([type])=>additive.has(type)))
   .map(([name])=>name).sort();
 assert.deepEqual(fixed,['ガッツ','免疫強化','意志','生命管理'].sort());
 for(const name of ['局所防衛','再生学','ヒーラー魂','見切り'])assert(!fixed.includes(name));
});
test('two additive-only supers are fixed-score but remain in skill and effect masters',()=>{
 const D=data(),additive=new Set(D.resistanceRules.additiveTypes);
 const fixed=Object.entries(D.superResistances)
   .filter(([,def])=>def.types.every(type=>additive.has(type)))
   .map(([name])=>name).sort();
 assert.deepEqual(fixed,['超免疫','超気合'].sort());
 for(const name of fixed){
  const skill=D.skillRankings.skills.find(skill=>skill.name===name);
  assert(skill,'skill must remain in master: '+name);
  assert.equal(skill.resistance,false,name+' must not show variable resistance marker');
  assert.equal(skill.levels.length,2);
  assert(skill.levels.every(level=>Number.isFinite(level.scores.剣士[0])));
  assert.equal(D.superResistances[name].includes.length,1,'lower ability remains attached');
 }
 for(const name of ['受技の心得','堅固の心得'])
   assert.equal(D.skillRankings.skills.find(skill=>skill.name===name)?.resistance,true,name);
});
test('variable-super selector and photo-import handling agree on additive-only exclusions',()=>{
 const ui=read('resistance_patch.js'),script=read('script.js');
 const match=ui.match(/const SUPER_ORDER=\[([\s\S]*?)\];/);
 assert(match);
 const names=vm.runInNewContext('['+match[1]+']');
 assert(!names.includes('超免疫')&&!names.includes('超気合'));
 for(const name of ['受技の心得','堅固の心得','タフネス'])assert(names.includes(name));
 assert(ui.includes('resistance.types?.some(type=>!additiveResistanceTypes.has(type))'));
 assert(ui.includes('filter(entry=>superDefinition(entry?.name))'));
 assert(script.includes('const variable=Boolean(D.superScoreRules?.[entry.name]||'));
 assert(script.includes('def.types?.some(type=>!additiveTypes.has(type))'));
});
