'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
function worker(){
 const c={console,BigInt,Map,Set,WeakMap,Uint8Array,Number,String,Math,JSON,Array,Object,Promise};
 c.self=c;c.window=c;
 vm.createContext(c);
 c.importScripts=()=>vm.runInContext(read('data.js'),c,{filename:'data.js'});
 c.postMessage=()=>{};
 vm.runInContext(read('pawaado_worker.js'),c,{filename:'pawaado_worker.js'});
 return c;
}
function payload(c,job,attribute,candidateSkills=[],customConditions={}){
 const academyRow=c.PAWAADO_DATA.academies.find(r=>r[1]===job&&Number(r[3])>=50&&Number(r[5])>=50)||c.PAWAADO_DATA.academies.find(r=>r[1]===job);
 assert(academyRow,'academy for '+job);
 const names=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
 return {
  academy:academyRow[0],job,attribute,
  basicValues:Object.fromEntries(names.map((x,i)=>[x,i===0?90:1])),
  basicOwned:Object.fromEntries(names.map(x=>[x,false])),
  basicHints:Object.fromEntries(names.map(x=>[x,0])),
  specialState:[],selectedSupers:[],candidateSkills,customConditions
 };
}
const exp=[9999,9999,9999,9999,9999];
function actions(c,p){
 c.__applyWorkerPayload(p);
 c.__skillCandidateExp=exp;
 return vm.runInContext(`(()=>{
  const st=constrainedInitialState(__skillCandidateExp);
  return workerCandidateActions(st,__skillCandidateExp).map(op=>({
   name:op.name,cost:op.cost,score:op.gain,items:op.items,requiredLevels:op.requiredLevels,
   next:mixedApplyAction(st,op).candidateBits.toString(36)
  }));
 })()`,c);
}
test('unacquired skills UI is directly above the custom constraints section',()=>{
 const html=read('index.html');
 const idx=html.indexOf('id="skillCandidatesCard"');
 const custom=html.indexOf('id="customCalcCard"');
 assert(idx>0&&custom>idx);
 for(const id of ['skillCandidateName','skillCandidateNameSelectButton','skillCandidateNameCustomMenu',
  'skillCandidateHint','skillCandidateHintSelectButton','skillCandidateHintCustomMenu','skillCandidateAdd',
  'skillCandidateList','customSkillName','customSkillMode','custom-skill-list'])
  assert(html.includes('id="'+id+'"'),id);
 assert(!html.includes('class="skill-candidate-note"'),'no explanation paragraph under heading');
 assert(!html.includes('id="skillCandidateLevel"'),'ability level is part of the name selection');
 assert(html.includes('必殺技等を選択'));
 assert(html.includes('const addOption=option=>'));
 assert(html.includes("child.tagName==='OPTGROUP'"));
 const css=read('style.css');
 assert(css.includes('.skill-candidate-name-control .custom-select-button'));
 assert(css.includes('.custom-select-group-heading'));
 const script=read('script.js');
 assert(script.includes('initSkillCandidates(); initCustomConditions()'));
 assert(script.includes('candidateSkills:candidateChoiceList()'));
 assert(script.includes("const candidateCategoryOrder=['必殺技','アクションスキル','超特殊能力']"));
 assert(script.includes("candidateKanaCollator.compare(ka,kb)"));
 assert(script.includes("new Option(skill.name+' Lv.'+lv.lv,index+':'+lv.lv)"));
 assert(script.includes("const defaultHint=skill?.kind==='汎用'?'0':'1'"));
 assert(script.includes('requiredSkillNames:'));
 assert(script.includes('forbiddenSkillNames:'));
 assert(script.includes("kind==='candidate'?escapeCustomText"));
});
test('verified hint costs distinguish ability Lv from hint Lv and do not reverse estimate',()=>{
 const c=worker(),master=c.PAWAADO_DATA.skillRankings.skills;
 const mental=master.find(x=>x.name==='精神統一');
 assert(mental);
 const cost=c.workerCandidateCost;
 const a=cost(mental,1,1),b=cost(mental,2,1),d=cost(mental,1,2),e=cost(mental,2,2);
 assert.deepEqual(Array.from(a),[0,44,0,88,88]);
 assert.deepEqual(Array.from(b),[0,100,0,201,201]);
 assert.deepEqual(Array.from(d),[0,35,0,70,70]);
 assert.deepEqual(Array.from(e),[0,80,0,160,160]);
 assert.equal(cost(mental,1,3),null,'unverified hint level must not be estimated');
 const gale=master.find(x=>x.name==='ゲイルシュート');
 assert.equal(cost(gale,1,0),null,'unverified generic no-hint cost for unique skill');
 assert(Array.isArray(cost(gale,1,1)));
});
test('generic skills offer verified raw cost and tip levels 1–5 with per-stat floor',()=>{
 const c=worker(),master=c.PAWAADO_DATA.skillRankings.skills;
 const generic=master.find(x=>x.name==='水斬撃');
 assert(generic&&generic.kind==='汎用');
 const cost=c.workerCandidateCost;
 assert.deepEqual(Array.from(cost(generic,1,0)),[221,79,125,0,0]);
 assert.deepEqual(Array.from(cost(generic,1,1)),[110,39,62,0,0]);
 assert.deepEqual(Array.from(cost(generic,1,2)),[88,31,50,0,0]);
 assert.deepEqual(Array.from(cost(generic,1,3)),[66,23,37,0,0]);
 assert.deepEqual(Array.from(cost(generic,1,4)),[44,15,25,0,0]);
 assert.deepEqual(Array.from(cost(generic,1,5)),[22,7,12,0,0]);
 // 同一の正本をUIとWorker双方で参照する。
 assert.equal(read('script.js').includes('D.skillCandidateLevelCost?.(skill,lv.lv,hint)'),true);
 assert.equal(read('pawaado_worker.js').includes('D.skillCandidateLevelCost?.(def,row.lv,hint)'),true);
});
test('Toughness and Protection use only recovered per-hint point vectors',()=>{
 const c=worker();
 const find=n=>c.PAWAADO_DATA.skillRankings.skills.find(x=>x.name===n);
 const tough=find('タフネス');
 const protect=find('加護');
 assert.deepEqual(Array.from(c.workerCandidateCost(tough,2,2)),[150,0,0,0,110]);
 assert.deepEqual(Array.from(c.workerCandidateCost(tough,2,3)),[112,0,0,0,82]);
 assert.deepEqual(Array.from(c.workerCandidateCost(tough,2,4)),[75,0,0,0,55]);
 assert.deepEqual(Array.from(c.workerCandidateCost(tough,2,5)),[37,0,0,0,27]);
 assert.deepEqual(Array.from(c.workerCandidateCost(protect,1,2)),[0,83,0,36,36]);
 assert.equal(c.workerCandidateCost(find('不朽の意志'),1,2),null,
   'unverified Will tip2 must remain unavailable');
 assert.equal(c.workerCandidateCost(find('不朽の意志'),1,5),null,
   'unverified Will tip5 must remain unavailable');
});
test('job and attribute restrict candidates; selected level reserves both upgrade costs and required basics',()=>{
 const c=worker(),candidate={name:'ゲイルシュート',level:2,hint:1};
 const a=actions(c,payload(c,'弓使い','風属性',[candidate]));
 assert.equal(a.length,1);
 assert.equal(a[0].name,'ゲイルシュート');
 assert.equal(a[0].score>0,true);
 assert(a[0].items.some(x=>x.type==='candidate'&&x.level===2));
 assert(a[0].items.some(x=>x.type==='basic'&&x.name==='パワー'));
 assert(a[0].items.some(x=>x.type==='basic'&&x.name==='器用さ'));
 assert.equal(a[0].next,'1');
 assert.deepEqual(Array.from(actions(c,payload(c,'弓使い','水属性',[candidate]))),[]);
 assert.deepEqual(Array.from(actions(c,payload(c,'剣士','風属性',[candidate]))),[]);
});
test('candidate required and forbidden custom conditions change constrained optimization',()=>{
 const c=worker(),entry={name:'水斬撃',level:1,hint:0};
 const p=payload(c,'剣士','水属性',[entry],{requiredSkillNames:['水斬撃']});
 c.__applyWorkerPayload(p);
 const required=vm.runInContext('constrainedInitialState([9999,9999,9999,9999,9999])',c);
 const chosen=vm.runInContext('restoreItems(__requiredState)',Object.assign(c,{__requiredState:required}));
 assert(chosen.some(x=>x.type==='candidate'&&x.name==='水斬撃'));
 assert(required.cost.some(x=>x>0));
 assert.throws(()=>vm.runInContext('constrainedInitialState([0,0,0,0,0])',c),/こだわり計算.*経験点/);
 const blocked=payload(c,'剣士','水属性',[entry],{forbiddenSkillNames:['水斬撃']});
 assert.deepEqual(Array.from(actions(c,blocked)),[]);
 assert.notEqual(c.__workerPayloadConfigKey(p),c.__workerPayloadConfigKey(blocked));
});
test('life-dependent candidate score responds to life level changes',()=>{
 const c=worker(),p=payload(c,'重戦士','風属性',[{name:'タフネス',level:1,hint:1}]);
 c.__applyWorkerPayload(p);
 c.__exp=exp;
 const result=vm.runInContext(`(()=>{
 const st=constrainedInitialState(__exp);
 const op=workerCandidateActions(st,__exp).find(x=>x.name==='タフネス');
 if(!op)return null;
 const after=mixedApplyAction(st,op);
 const before=after.levels[0],next=before+1;
 return {op,delta:workerCandidateHpDelta(after.candidateBits,currentHpForLife(before),currentHpForLife(next)),
 rate:selectedSuperHpRate({name:'タフネス',level:1})};
 })()`,c);
 assert(result,'Toughness must be a calculable candidate');
 assert(result.delta>0);
 assert(Math.abs(result.rate-0.07)<1e-9);
 assert(Math.abs(result.delta-4.76)<1e-9,'HP 68 increase should add 7% to Toughness owned appraisal');
});
