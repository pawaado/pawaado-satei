'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const groups=['剣士系統','重戦士系統','弓使い系統','魔法使い系統','僧侶系統','魔闘士系統'];
function makeButton(dataset){
  return {dataset,attributes:{},setAttribute(key,value){this.attributes[key]=value},
    addEventListener(event,handler){if(event==='click')this.click=handler}};
}
function load(){
  const elements={
    basicRankingView:{hidden:false},
    skillRankingView:{hidden:true},
    skillRankingRoot:{innerHTML:''}
  };
  const modeButtons=['basic','skills'].map(rankingMode=>makeButton({rankingMode}));
  const jobButtons=groups.map(skillJob=>makeButton({skillJob}));
  const context={
    location:{search:'?mode=skills'},
    URLSearchParams,
    scrollTo(){},
    document:{
      getElementById:id=>elements[id],
      querySelectorAll:selector=>selector==='[data-ranking-mode]'?modeButtons:
        selector==='[data-skill-job]'?jobButtons:[]
    }
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(file('data.js'),context,{filename:'data.js'});
  vm.runInContext(file('skill_master.js'),context,{filename:'skill_master.js'});
  vm.runInContext(file('skill_rankings.js'),context,{filename:'skill_rankings.js'});
  return {context,elements,jobButtons,modeButtons};
}
function leader(html){
  return html.match(/<span class="skill-rank-index">1<\/span>[\s\S]*?<span class="skill-row-title"[^>]*>([^<]+)/)?.[1];
}

test('skill rankings load canonical skill_master.js and do not use the removed snapshot',()=>{
  const html=file('rankings.html');
  const app=file('index.html');
  assert(!html.includes('<script src="skill_rankings_data.js'));
  assert(html.includes('<script src="data.js?v='));
  assert(html.includes('<script src="skill_master.js?v='));
  assert(!fs.existsSync(path.join(root,'skill_rankings_data.js')));
  assert(html.indexOf('<script src="data.js?')<html.indexOf('<script src="skill_master.js?'));
  assert(html.indexOf('<script src="skill_master.js?')<html.indexOf('<script src="skill_rankings.js?'));
  assert.equal(html.match(/data\.js\?v=([^"]+)/)?.[1],app.match(/data\.js\?v=([^"]+)/)?.[1]);
  assert(file('skill_rankings.js').includes('window.PAWAADO_DATA?.skillRankings'));
  assert(!file('skill_rankings.js').includes('window.PAWAADO_SKILL_RANKING_DATA'));
});
test('all six skill groups render rankings from the master',()=>{
  const {context,elements,jobButtons}=load();
  const master=context.PAWAADO_DATA.skillRankings;
  assert(master&&Array.isArray(master.skills)&&master.skills.length>=172);
  assert.equal(new Set(master.skills.map(x=>x.name)).size,master.skills.length);
  for(const button of jobButtons){
    button.click();
    const rendered=elements.skillRankingRoot.innerHTML;
    assert(rendered.includes('<th>査定効率</th>'),button.dataset.skillJob);
    assert((rendered.match(/<tr class=/g)||[]).length>50,button.dataset.skillJob);
    assert(leader(rendered),button.dataset.skillJob);
  }
});
test('changing only a master data score automatically changes ordering and shown score',()=>{
  const {context,elements,jobButtons}=load();
  const before=leader(elements.skillRankingRoot.innerHTML);
  const water=context.PAWAADO_DATA.skillRankings.skills.find(x=>x.name==='水斬撃');
  assert(water&&water.jobs.includes('剣士'));
  const score=water.levels[0].scores['剣士'];
  score[0]=50000;score[1]=50000;
  jobButtons[0].click();
  const rendered=elements.skillRankingRoot.innerHTML;
  assert.notEqual(before,'水斬撃');
  assert.equal(leader(rendered),'水斬撃');
  assert(rendered.includes('<td class="skill-rank-score">50000</td>'));
});

test('skill names remain on one line while efficiency and score remain visible together',()=>{
 const style=file('skill_rankings.css');
 const calc=Object.fromEntries([...style.matchAll(/#skillRankingRoot \.(rank|name|eff|score)-col\{width:(\d+)px\}/g)].map(m=>[m[1],Number(m[2])]));
 assert.equal(calc.rank+calc.name+calc.eff+calc.score,337,'the first four columns must fit a compact iPhone viewport');
 assert.equal(calc.name,196,'name column still accommodates the longest 12-character label plus Lv');
 assert(calc.eff>=61&&calc.score>=49,'efficiency and assessment values must remain visible');
 assert(style.includes('left:31px;z-index:2'),'sticky name offset follows rank width');
 assert(style.includes('.skill-row-title{display:block;flex:0 0 auto;font-weight:600;font-size:13px;line-height:1.4;white-space:nowrap;overflow:visible}'));
 assert(!style.includes('.skill-row-title.skill-long-name{font-size:11px}'));
 assert(!style.includes('.skill-row-title.skill-extra-long-name{font-size:10px}'));
 assert(!style.includes('font-size:14px;line-height:1.4;min-width:0;white-space:nowrap;overflow:hidden'));
 assert(style.includes('.skill-level{display:block;flex:0 0 auto;font-size:10px;line-height:1.4;'));
 assert(style.includes('.skill-name-line{display:flex;align-items:baseline;gap:2px;'));
 const {elements,jobButtons}=load();
 jobButtons[2].click();
 const h=elements.skillRankingRoot.innerHTML;
 assert(!h.includes('class="skill-row-title skill-long-name"'));
 assert(h.includes('class="skill-row-title" title="ウォータープロテクション">ウォータープロテクション</span>'),'full water protection title must render without abbreviation');
 assert(h.includes('ウォータープロテクション</span><span class="skill-level">Lv.1</span>'),'Lv stays immediately right of full name');
 assert(!h.includes('class="skill-rank-level">'));
 assert(!h.includes('class="skill-full-name"'),'the obsolete tap-to-expand detail is no longer rendered');
 assert(h.includes('<th>査定効率</th><th>査定</th>'));
 const widthBudget=[...('ウォータープロテクション')].length*13 + 30 + 2 + 4;
 assert(widthBudget<=calc.name,'12-character name plus right-side Lv fits the 196px column at 13px');
});

function rowForSkill(html,name,level){
 const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const rows=html.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[];
 return rows.find(row=>row.includes('title="'+name+'"') && (
  row.includes('<span class="skill-level">Lv.'+level+'</span>') ||
  // 1段階だけの汎用技は名称の横にLv.を表示しないのが現行仕様。
  level===1&&!row.includes('<span class="skill-level">')
 ))||'';
}
test('uses directly observed tip Lv1 for supers/unique skills and no-tip for every generic skill',()=>{
 const {context,elements,jobButtons}=load();
 const master=context.PAWAADO_DATA.skillRankings;
 const byCategory={};
 for(const skill of master.skills){
  const tip=skill.category==='超特殊能力'||skill.kind==='固有'?1:0;
  for(const level of skill.levels){
   byCategory[skill.category]??={same:0,converted:0};
   byCategory[skill.category][level.tip===tip?'same':'converted']++;
  }
 }
 assert.equal(byCategory['超特殊能力'].converted,0);
 assert.equal(byCategory['アクションスキル'].converted,0);
 assert.equal(byCategory['必殺技'].converted,0);
 assert.equal(Object.values(byCategory).reduce((sum,v)=>sum+v.converted,0),0);
 const expectedPhases=master.skills.reduce((sum,skill)=>sum+skill.levels.length,0);
 assert(expectedPhases>=330);
 assert.equal(Object.values(byCategory).reduce((sum,v)=>sum+v.same+v.converted,0),expectedPhases);
 const original=JSON.stringify(master.skills);
 for(const button of jobButtons){
  button.click();
  const html=elements.skillRankingRoot.innerHTML;
  for(const skill of master.skills){
   if(!skill.jobs.some(job=>({剣士系統:['剣士','双剣士'],重戦士系統:['重戦士'],弓使い系統:['弓使い'],魔法使い系統:['魔法使い'],僧侶系統:['僧侶'],魔闘士系統:['魔闘士']}[button.dataset.skillJob]||[]).includes(job)))continue;
   for(const lv of skill.levels){
    const row=rowForSkill(html,skill.name,lv.lv);
    if(!row)continue; // unranked or duplicate class rows can still be checked independently
    const target=skill.category==='超特殊能力'||skill.kind==='固有'?1:0;
    const cost=lv.cost.reduce((sum,n)=>sum+Number(n||0),0);
    assert(row.includes('<td class="skill-rank-exp">'+cost+'</td>'),skill.name+' Lv'+lv.lv+' / '+button.dataset.skillJob);
    assert(!row.includes('（ランキング比較条件）'),'hint basis belongs in the shared ranking notes, not every row');
    assert.equal(lv.tip,target,skill.name+' Lv'+lv.lv+' must be directly observed at the intended hint level');
    assert(!row.includes('（換算値・参考）')&&!row.includes('（必要経験点未確認）'),skill.name+' is confirmed, not estimated');
   }
  }
 }
 assert.equal(JSON.stringify(master.skills),original,'rendering must not rewrite the canonical observed costs/tips');
});
test('unique finishers, generic actions and all supers use exact costs and the note describes hint levels',()=>{
 const {context,elements,jobButtons}=load();
 const dataset=context.PAWAADO_DATA.skillRankings.skills;
 const gale=dataset.find(s=>s.name==='ゲイルシュート');
 assert(gale&&gale.category==='必殺技'&&gale.levels[0].tip===1);
 jobButtons[2].click();
 const rendered=rowForSkill(elements.skillRankingRoot.innerHTML,'ゲイルシュート',1);
 const directCost=gale.levels[0].cost.reduce((sum,n)=>sum+n,0);
 const assessment=gale.levels[0].scores['弓使い'][0];
 assert(rendered.includes('<td class="skill-rank-exp">'+directCost+'</td>'));
 assert(rendered.includes('<td class="skill-rank-eff">'+(assessment/directCost).toFixed(3)+'</td>'));
 assert(!rendered.includes('換算値・参考'),'unique finisher observed cost should not be estimated');
 assert(!rendered.includes('（ランキング比較条件）'));
 const water=dataset.find(s=>s.name==='水斬撃');
 assert(water&&water.kind==='汎用'&&water.levels[0].tip===0);
 jobButtons[0].click();
 const waterRow=rowForSkill(elements.skillRankingRoot.innerHTML,'水斬撃',1);
 assert(waterRow.includes('<td class="skill-rank-exp">'+water.levels[0].cost.reduce((sum,v)=>sum+v,0)+'</td>'));
 assert(!waterRow.includes('（ランキング比較条件）'));
 const rescuer=dataset.find(s=>s.name==='救援者');
 const ace=dataset.find(s=>s.name==='エースアタッカー');
 assert.deepEqual(Array.from(rescuer.levels[0].cost),[59,68,0,68,0]);
 assert.deepEqual(Array.from(rescuer.levels[1].cost),[68,79,0,79,0]);
 assert.deepEqual(Array.from(ace.levels[1].cost),[0,0,85,0,142]);
 for(const [skill,level,expectedCost] of [[rescuer,1,195],[rescuer,2,226],[ace,2,227]]){
  assert.equal(skill.levels[level-1].tip,1,skill.name+' Lv'+level);
  jobButtons[0].click();
  const row=rowForSkill(elements.skillRankingRoot.innerHTML,skill.name,level);
  assert(row.includes('<td class="skill-rank-exp">'+expectedCost+'</td>'),skill.name+' Lv'+level);
  assert(!row.includes('（ランキング比較条件）'),skill.name+' Lv'+level);
  assert(!row.includes('参考')&&!row.includes('未確認'),skill.name+' Lv'+level+' must use exact experience');
 }
 const notes=file('rankings.html');
 assert(notes.includes('汎用の必殺技・アクションスキルはコツなし、その他の必殺技等はコツLv.1で計算しています。'));
 assert(!notes.includes('換算した参考値です'));
});

test('no registered skill costs require a reverse estimate',()=>{
 const {context}=load();
 const unknown=context.PAWAADO_DATA.skillRankings.skills.flatMap(skill=>{
  const target=skill.category==='超特殊能力'||skill.kind==='固有'?1:0;
  return skill.levels.filter(level=>level.tip!==target).map(level=>skill.name+' Lv'+level.lv);
 }).sort();
 assert.deepEqual(Array.from(unknown),[]);
});
