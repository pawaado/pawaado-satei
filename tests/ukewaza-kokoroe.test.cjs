'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),ctx={window:{}};
vm.runInNewContext(read('data.js'),ctx);vm.runInNewContext(read('skill_master.js'),ctx);
const D=ctx.window.PAWAADO_DATA,s=D.skillRankings.skills.find(x=>x.name==='受技の心得');
test('受技の心得 correct scores costs effect condition for Lv1-3',()=>{
 assert(s);assert.equal(s.category,'超特殊能力');assert.equal(s.kind,'サポートスキル');
 assert.equal(s.resistance,true);assert.equal(D.skillRankings.readings['受技の心得'],'うけわざのこころえ');
 const costs=[[0,78,78,0,39],[0,90,90,0,47],[0,125,125,0,63]],scores=[[252,252],[198,450],[198,648]],effects=[[14,14],[25,22],[36,30]];
 for(let i=0;i<3;i++){const l=s.levels[i];
  assert.equal(l.tip,1);assert.deepEqual(Array.from(l.cost),costs[i]);
  assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,i+1,1)),costs[i]);
  assert.equal(D.skillCandidateLevelCost(s,i+1,2),null);
  assert.equal(l.condition,'耐久力'+(40+i*10)+'・精神力'+(40+i*10)+'以上');
  assert.deepEqual([l.effect['アクションスキル耐性'],l.effect['会心ダメージ耐性']],effects[i]);
  assert(l.description.includes('会心ダメージ耐性'));
  for(const j of ['剣士','弓使い','重戦士','魔法使い','僧侶','魔闘士','双剣士','オーブストライカー']){
   assert(D.skillJobEligible(s,j),j);assert.deepEqual(Array.from(D.skillJobScore(s,l,j)),scores[i],j);
  }
 }
 const r=D.superResistances['受技の心得'];
 assert.deepEqual(Array.from(r.types),['アクションスキル耐性','会心ダメージ耐性']);
 assert.deepEqual(Array.from(r.levels),[14,25,36]);
 assert.deepEqual(Array.from(r.levelsByType['会心ダメージ耐性']),[14,22,30]);
 assert.equal(D.resistanceRules.scorePerPercent['アクションスキル耐性'],18);
 assert.equal(D.resistanceRules.scorePerPercent['会心ダメージ耐性'],0);
 assert.deepEqual([14*18+14*0,11*18+8*0,11*18+8*0],[252,198,198]);
});
test('受技の心得 is in variable-super selector and critical resistance has its own values',()=>{
 const ui=read('resistance_patch.js'),worker=read('pawaado_worker_resistance.js');
 const m=ui.match(/const SUPER_ORDER=\[([\s\S]*?)\];/);
 assert(m);const order=vm.runInNewContext('['+m[1]+']');
 assert(order.includes('受技の心得'));
 assert(order.indexOf('ウォータープロテクション')<order.indexOf('受技の心得'));
 assert(order.indexOf('受技の心得')<order.indexOf('大真面目'));
 assert(ui.includes('Array.from({length:maxLevel}'));
 assert(ui.includes('def.levelsByType?.[def.types[i]]?.[lv-1]'));
 assert(worker.includes('def?.levelsByType?.[type]?.[entry.level-1]'));
});
test('updated scripts, workers, ranking versions are in sync',()=>{
 const v=read('pawaado_worker.js').match(/data\.js\?v=([^']+)/)?.[1];
 assert(v&&/^20\d{6}-/.test(v),'current data asset needs dated version');
 for(const f of ['index.html','rankings.html','pawaado_worker.js']){
  assert(read(f).includes('data.js?v='+v));assert(read(f).includes('skill_master.js?v='+v));
 }
 assert(read('index.html').includes('script.js?v='+v));
 assert(read('index.html').includes('resistance_patch.js?v='+v));
 assert(read('script.js').includes('pawaado_worker.js?v='+v));
 assert(read('pawaado_worker_resistance.js').includes('pawaado_worker.js?v='+v));
 assert(read('resistance_patch.js').includes("const PATCH_VERSION='"+v+"'"));
});
