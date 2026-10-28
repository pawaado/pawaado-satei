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
  vm.runInContext(file('skill_rankings.js'),context,{filename:'skill_rankings.js'});
  return {context,elements,jobButtons,modeButtons};
}
function leader(html){
  return html.match(/<td class="skill-rank-num">1<\/td>[\s\S]*?<span class="skill-row-title">([^<]+)/)?.[1];
}

test('skill rankings use only canonical data.js, not the old ranking snapshot',()=>{
  const html=file('rankings.html');
  const app=file('index.html');
  assert(!html.includes('<script src="skill_rankings_data.js'));
  assert(html.includes('<script src="data.js?v='));
  assert(html.indexOf('<script src="data.js?')<html.indexOf('<script src="skill_rankings.js?'));
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
