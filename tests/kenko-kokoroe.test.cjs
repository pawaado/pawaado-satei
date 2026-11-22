'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function dataset(){
  const c={window:{}};
  vm.runInNewContext(read('data.js'),c,{filename:'data.js'});
  vm.runInNewContext(read('skill_master.js'),c,{filename:'skill_master.js'});
  return c.window.PAWAADO_DATA;
}
test('堅固の心得: observed Lv.1-Lv.3 costs, conditions, resistance and appraisal',()=>{
  const D=dataset(),matches=D.skillRankings.skills.filter(x=>x.name==='堅固の心得');
  assert.equal(matches.length,1);
  const skill=matches[0];
  assert.equal(skill.category,'超特殊能力');
  assert.equal(skill.kind,'サポートスキル');
  assert.equal(skill.attribute,null);
  assert.equal(skill.hp,false);
  assert.equal(skill.resistance,true);
  assert.equal(skill.levels.length,3);
  assert.deepEqual(Array.from(D.superResistances[skill.name].levels),[6,10,14]);
  assert.deepEqual(Array.from(D.superResistances[skill.name].types),['単体攻撃耐性','会心耐性率']);
  assert.deepEqual(Array.from(D.superResistances[skill.name].levelsByType['会心耐性率']),[5,9,13]);
  assert.equal(D.resistanceRules.scorePerPercent['会心耐性率'],0);
  const observed=[
    [1,[78,78,0,0,39],[420,420],6,5,40,195],
    [2,[90,90,0,0,47],[280,700],10,9,50,227],
    [3,[125,125,0,0,63],[280,980],14,13,60,313]
  ];
  const jobs=['剣士','弓使い','重戦士','魔法使い','僧侶','魔闘士','双剣士','オーブストライカー'];
  for(const [i,expectedCost,expectedScore,single,critical,minimum,total] of observed){
    const level=skill.levels[i-1];
    assert.equal(level.lv,i);
    assert.equal(level.tip,1);
    assert.equal(level.condition,`耐久力${minimum}・精神力${minimum}以上`);
    assert.deepEqual(Array.from(level.cost),expectedCost);
    assert.equal(level.cost.reduce((a,b)=>a+b,0),total);
    assert.equal(level.effect['単体攻撃耐性'],single);
    assert.equal(level.effect['会心耐性率'],critical);
    assert.equal(D.resistanceRules.scorePerPercent['単体攻撃耐性'],70);
    assert.equal(expectedScore[1],single*70+critical*D.resistanceRules.scorePerPercent['会心耐性率'], 'critical rate resistance contributes zero appraisal');
    assert.deepEqual(Array.from(D.skillCandidateLevelCost(skill,i,1)),expectedCost);
    assert.equal(D.skillCandidateLevelCost(skill,i,2),null);
    for(const job of jobs){
      assert.equal(D.skillJobEligible(skill,job),true,job);
      assert.deepEqual(Array.from(D.skillJobScore(skill,level,job)),expectedScore,job);
    }
  }
  assert.equal(skill.levels.reduce((a,l)=>a+l.cost.reduce((b,v)=>b+v,0),0),735);
});
test('堅固の心得: Lv.3 selection is supported but existing 2-level skills are bounded',()=>{
  const ui=read('resistance_patch.js'),worker=read('pawaado_worker.js'),D=dataset();
  assert.equal(D.superResistances['堅固の心得'].levels.length,3);
  assert.equal(D.superResistances['百戦の生存術'].levels.length,2);
  assert(ui.includes('Array.from({length:maxLevel}'),'UI options must follow skill maximum level');
  assert(ui.includes('level<=maxLevel'),'UI selection must validate the maximum level');
  assert(worker.includes('level>maxLevel'),'worker must validate selected-super level');
  assert(worker.includes('row[1]<=('),'worker cache key must include Lv.3');
});

test('堅固の心得: variable super panel and worker respect separate 0-appraisal critical-rate resistance',()=>{
 const ui=read('resistance_patch.js'),worker=read('pawaado_worker_resistance.js'),D=dataset();
 const def=D.superResistances['堅固の心得'];
 const skill=D.skillRankings.skills.find(s=>s.name==='堅固の心得');
 assert.equal(D.resistanceRules.scorePerPercent['会心耐性率'],0);
 assert.deepEqual(Array.from(def.types),['単体攻撃耐性','会心耐性率']);
 for(let i=0;i<3;i++){
   const lv=skill.levels[i];
   const values=def.types.map(t=>def.levelsByType?.[t]?.[i]??def.levels[i]);
   assert.deepEqual(Array.from(values),[lv.effect['単体攻撃耐性'],lv.effect['会心耐性率']]);
   assert.equal(values[0]*D.resistanceRules.scorePerPercent['単体攻撃耐性']+values[1]*D.resistanceRules.scorePerPercent['会心耐性率'],lv.scores.剣士[1]);
 }
 assert(ui.includes('Object.keys(D?.resistanceRules?.scorePerPercent||{})'),'0-score types remain selectable');
 assert(ui.includes('def.levelsByType?.[def.types[i]]?.[lv-1]'),'selector must use per-type levels');
 assert(worker.includes('def?.levelsByType?.[type]?.[entry.level-1]'),'worker must use per-type levels');
 assert(ui.includes("'堅固の心得'"),'registered in variable-super selection order');
});
