'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(root,filename),'utf8');
function load(){
 const c={console,BigInt,Map,Set,WeakMap,Uint8Array,Number,String,Math,JSON,Array,Object,Promise};
 c.window=c;c.self=c;
 vm.createContext(c);
 for(const filename of ['data.js','skill_master.js'])vm.runInContext(read(filename),c,{filename});
 return c.PAWAADO_DATA;
}
const cases=[
 {name:'ロウリエバースト',category:'必殺技',costs:[[126,32,126,0,63],[194,49,194,0,97]],scores:[[2000,2000],[1600,3600]],totals:[347,534],sum:881},
 {name:'炎軌烈矢',category:'アクションスキル',costs:[[82,0,82,0,51],[99,0,99,0,61]],scores:[[1125,1125],[675,1800]],totals:[215,259],sum:474}
];
for(const expected of cases){
 test(expected.name+' is a fire-only bow-user unique skill with real observed Lv.1-2 appraisal and costs',()=>{
  const D=load(),skill=D.skillRankings.skills.find(s=>s.name===expected.name);
  assert(skill,'registered in canonical skill master');
  assert.equal(skill.category,expected.category);
  assert.equal(skill.kind,'固有');
  assert.equal(skill.attribute,'火');
  assert.deepEqual(Array.from(skill.jobs),['弓使い']);
  assert.equal(D.skillJobEligible(skill,'弓使い'),true);
  assert.equal(D.skillJobEligible(skill,'剣士'),false);
  assert.equal(skill.levels.length,2);
  for(let i=0;i<2;i++){
   const level=skill.levels[i];
   assert.equal(level.lv,i+1);
   assert.equal(level.tip,1);
   assert.equal(level.condition,'器用さ'+[40,60][i]+'以上');
   assert.deepEqual(Array.from(level.cost),expected.costs[i]);
   assert.deepEqual(Array.from(D.skillCandidateLevelCost(skill,level.lv,1)),expected.costs[i]);
   assert.deepEqual(Array.from(D.skillJobScore(skill,level,'弓使い')),expected.scores[i]);
   assert.equal(level.cost.reduce((sum,n)=>sum+n,0),expected.totals[i]);
   assert.equal(level.effect,undefined,'no need to store skill effects');
   assert.equal(level.description,undefined,'no need to store effect descriptions');
  }
  assert.equal(skill.levels.reduce((sum,l)=>sum+l.cost.reduce((x,y)=>x+y,0),0),expected.sum);
 });
}
test('bow-user fire skills use the same master and cache version on UI and worker',()=>{
 const main=read('index.html'),ranking=read('rankings.html'),worker=read('pawaado_worker.js');
 const url='skill_master.js?v=20261031-bow-fire-skills-1';
 assert(main.includes(url));
 assert(ranking.includes(url));
 assert(worker.includes(url));
 assert(main.includes('script.js?v=20261031-bow-fire-skills-1'));
 assert(worker.includes('data.js?v=20261031-bow-fire-skills-1'));
});
