'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function load(){
 const c={console,BigInt,Map,Set,WeakMap,Uint8Array,Number,String,Math,JSON,Array,Object,Promise};
 c.self=c;c.window=c;vm.createContext(c);
 vm.runInContext(read('data.js'),c,{filename:'data.js'});
 vm.runInContext(read('skill_master.js'),c,{filename:'skill_master.js'});
 return c;
}
test('Orb Striker in Kaji Knight academy has magic-class caps and inherited job family',()=>{
 const D=load().PAWAADO_DATA,job='オーブストライカー';
 const a=D.academies.find(r=>r[0]==='カジナイトアカデミー'&&r[1]===job);
 assert(a);assert.deepEqual(Array.from(a.slice(2)),[95,70,115,130,80,80]);
 assert.equal(D.jobFamilyByJob[job],'魔闘士系統');
 assert.equal(D.baseJobByJob[job],'魔闘士');
 assert(D.skillJobEligible({jobs:['魔闘士']},job));
 assert(D.skillJobEligible({jobs:['魔闘士'],jobFamily:'魔闘士系統'},job));
 assert(!D.skillJobEligible({jobs:['魔法使い']},job));
 const baseSkill=D.skillRankings.skills.find(s=>s.jobs.includes('魔闘士')&&s.levels[0]?.scores?.['魔闘士']);
 assert(baseSkill);
 assert.deepEqual(Array.from(D.skillJobScore(baseSkill,baseSkill.levels[0],job)),Array.from(baseSkill.levels[0].scores['魔闘士']));
});
test('Prominence Tackle exactly matches user-observed level costs, score, job, attribute and prerequisites',()=>{
 const D=load().PAWAADO_DATA,skill=D.skillRankings.skills.find(s=>s.name==='プロミネンスタックル');
 assert(skill);
 assert.equal(skill.category,'必殺技');assert.equal(skill.kind,'固有');assert.equal(skill.attribute,'火');
 assert.deepEqual(Array.from(skill.jobs),['オーブストライカー']);
 const costs=[[0,63,126,95,63],[0,97,194,145,97],[0,292,583,437,292]];
 const scores=[[2000,2000],[1600,3600],[1600,5200]];
 const required=[[20,20],[50,50],[70,70]];
 for(const [i,level] of skill.levels.entries()){
   assert.equal(level.lv,i+1);assert.equal(level.tip,1);
   assert.deepEqual(Array.from(level.cost),costs[i]);
   assert.deepEqual(Array.from(D.skillJobScore(skill,level,'オーブストライカー')),scores[i]);
   assert(level.condition.includes('魔力'+required[i][0]));
   assert(level.condition.includes('器用さ'+required[i][1]));
   assert.equal(level.effect,undefined,'必殺技の効果説明は登録しない');
   assert.equal(level.description,undefined,'必殺技の威力説明は登録しない');
   assert(!D.skillJobEligible(skill,'魔闘士'));
 }
 assert.equal(costs.flat().reduce((sum,n)=>sum+n,0),2484);
});
test('Worker treats Orb Striker as magic job for normal specials and magic base ability',()=>{
 const c=load();
 c.importScripts=(...urls)=>urls.forEach(url=>{const file=url.replace(/^\.\//,'').split('?')[0];vm.runInContext(read(file),c,{filename:file});});
 c.postMessage=()=>{};
 vm.runInContext(read('pawaado_worker.js'),c,{filename:'pawaado_worker.js'});
 c.__applyWorkerPayload({academy:'カジナイトアカデミー',job:'オーブストライカー',attribute:'火属性',
  basicValues:{生命力:28,パワー:12,魔力:30,器用さ:22,耐久力:12,精神力:5},
  basicOwned:{},basicHints:{},specialState:[],selectedSupers:[],candidateSkills:[],customConditions:{}});
 assert.equal(vm.runInContext('jobScoreIndex()',c),9);
 assert.equal(vm.runInContext('fixedAddIndex()',c),13);
 assert.equal(vm.runInContext("tableFor('魔力').score === D.magicMagicScore",c),true);
});
test('real screenshot-derived job icon and header reference masks are embedded for photo reading',()=>{
 const source=read('photo_import.js');
 const match=[...source.matchAll(/'オーブストライカー':'([^']+)'/g)].map(m=>m[1]);
 assert.equal(match.length,2);
 assert.equal(Buffer.from(match[0],'base64').length,256,'16x16 grayscale icon');
 assert.equal(Buffer.from(match[1],'base64').length,192,'96x16 packed 1-bit header mask');
});

test('both Orb Striker neutral generic finishers use observed no-tip costs and appraisal',()=>{
 const D=load().PAWAADO_DATA;
 const expected=[
  {name:'パワーコンバージョン',cost:[[0,62,139,0,91],[0,84,191,0,124]],conditions:['条件なし','器用さ40以上']},
  {name:'ヴォルテックスオーブ',cost:[[0,40,110,142,0],[0,54,151,194,0]],conditions:['条件なし','魔力40以上']}
 ];
 for(const item of expected){
  const skill=D.skillRankings.skills.find(s=>s.name===item.name);
  assert(skill,item.name);assert.equal(skill.category,'必殺技');
  assert.equal(skill.kind,'汎用');assert.equal(skill.attribute,null);
  assert.deepEqual(Array.from(skill.jobs),['オーブストライカー']);
  assert(!D.skillJobEligible(skill,'魔闘士'));
  assert.deepEqual(Array.from(skill.levels.map(l=>Array.from(l.cost))),item.cost);
  assert.deepEqual(Array.from(skill.levels.map(l=>Array.from(D.skillJobScore(skill,l,'オーブストライカー')))),[[1000,1000],[575,1575]]);
  assert.deepEqual(Array.from(skill.levels.map(l=>l.condition)),item.conditions);
  assert.equal(skill.levels.reduce((n,l)=>n+l.cost.reduce((a,b)=>a+b,0),0),691);
  for(const l of skill.levels){assert.equal(l.tip,0);assert.equal(l.effect,undefined);assert.equal(l.description,undefined);}
 }
});
test('generic finishers with Lv.2 keep both choices in UI and optimizer',()=>{
 const script=read('script.js'),worker=read('pawaado_worker.js');
 assert(script.includes("return skill.kind!=='汎用'||skill.levels.length>1"));
 assert(worker.includes("const max=def.levels.length"));
 assert(!worker.includes("def.kind==='汎用'&&!def.jobs.includes('双剣士')?1"));
 const D=load().PAWAADO_DATA;
 for(const name of ['パワーコンバージョン','ヴォルテックスオーブ']){
  const skill=D.skillRankings.skills.find(s=>s.name===name);
  assert.equal(skill.kind,'汎用');
  assert.deepEqual(Array.from(skill.levels.map(l=>D.skillCandidateLevelCost(skill,l.lv,0))).map(x=>Array.from(x)),Array.from(skill.levels.map(l=>Array.from(l.cost))));
 }
});

test('Quad Ignition is Orb Striker-exclusive fire action skill with verified Lv.1-3 incremental costs and appraisal',()=>{
 const D=load().PAWAADO_DATA;
 const skill=D.skillRankings.skills.find(x=>x.name==='クアッドイグニッション');
 assert(skill,'action skill must be registered');
 assert.equal(skill.category,'アクションスキル');
 assert.equal(skill.kind,'固有');
 assert.equal(skill.attribute,'火');
 assert.deepEqual(Array.from(skill.jobs),['オーブストライカー']);
 assert.equal(D.skillJobEligible(skill,'オーブストライカー'),true);
 assert.equal(D.skillJobEligible(skill,'魔闘士'),false);
 const costs=[[0,0,77,128,64],[0,0,99,165,82],[0,0,341,568,284]];
 const scores=[[1500,1500],[900,2400],[900,3300]];
 for(let i=0;i<3;i++){
   const level=skill.levels[i];
   assert.equal(level.lv,i+1);
   assert.equal(level.tip,1);
   assert.equal(level.condition,'器用さ'+[40,60,80][i]+'以上');
   assert.deepEqual(Array.from(level.cost),costs[i]);
   assert.deepEqual(Array.from(D.skillJobScore(skill,level,'オーブストライカー')),scores[i]);
   assert.deepEqual(Array.from(D.skillCandidateLevelCost(skill,i+1,1)),costs[i]);
   assert.equal(level.effect,undefined);
   assert.equal(level.description,undefined);
 }
 assert.equal(skill.levels.reduce((a,l)=>a+l.cost.reduce((x,y)=>x+y,0),0),1808);
});
test('No separate screenshot-to-skill fixtures remain',()=>{
 assert.equal(fs.existsSync(path.join(root,'tests/fixtures/orb-striker-20261031.json')),false);
 assert.equal(fs.existsSync(path.join(root,'tests/fixtures/orb-striker-finishers-20261031.json')),false);
});
