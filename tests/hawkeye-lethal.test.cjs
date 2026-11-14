'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const load=()=>{
 const c={window:{}};
 vm.runInNewContext(read('data.js'),c,{filename:'data.js'});
 vm.runInNewContext(read('skill_master.js'),c,{filename:'skill_master.js'});
 return c.window.PAWAADO_DATA;
};
test('ホークアイリーサル Lv.1/Lv.2 observed costs, eligibility, appraisal, and no descriptions',()=>{
 const D=load(),matches=D.skillRankings.skills.filter(s=>s.name==='ホークアイリーサル');
 assert.equal(matches.length,1);
 const s=matches[0];
 assert.equal(s.category,'アクションスキル');
 assert.equal(s.kind,'固有');
 assert.equal(s.attribute,'風');
 assert.deepEqual(Array.from(s.jobs),['弓使い']);
 assert.equal(D.skillJobEligible(s,'弓使い'),true);
 assert.equal(D.skillJobEligible(s,'剣士'),false);
 assert.equal(s.description,undefined);
 for(const [i,cost,score,condition] of [
  [0,[82,0,82,0,51],[1125,1125],'器用さ40以上'],
  [1,[99,0,99,0,61],[675,1800],'器用さ60以上']]){
  const l=s.levels[i];
  assert.equal(l.lv,i+1);assert.equal(l.tip,1);
  assert.equal(l.condition,condition);
  assert.deepEqual(Array.from(l.cost),cost);
  assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,l.lv,1)),cost);
  assert.deepEqual(Array.from(D.skillJobScore(s,l,'弓使い')),score);
  assert.equal(l.description,undefined);
  assert.equal(l.effect,undefined);
 }
 assert.deepEqual(Array.from(s.levels.map(l=>l.cost.reduce((a,b)=>a+b,0))),[215,259]);
 assert.equal(s.levels.reduce((sum,l)=>sum+l.cost.reduce((a,b)=>a+b,0),0),474);
});
test('ホークアイリーサル Lv.別 and Lv.累計 appear in 弓使い系統 rankings',()=>{
 const elements={basicRankingView:{hidden:false},skillRankingView:{hidden:true},skillRankingRoot:{innerHTML:''}};
 const btn=dataset=>({dataset,setAttribute(){},addEventListener(event,fn){if(event==='click')this.click=fn}});
 const modes=['basic','skills'].map(rankingMode=>btn({rankingMode}));
 const jobs=['弓使い系統'].map(skillJob=>btn({skillJob}));
 const levels=['single','total'].map(skillLevelMode=>btn({skillLevelMode}));
 const c={location:{search:'?mode=skills'},URLSearchParams,
   document:{getElementById:id=>elements[id]||null,querySelectorAll:q=>q==='[data-ranking-mode]'?modes:q==='[data-skill-job]'?jobs:q==='[data-skill-level-mode]'?levels:[]}};
 c.window=c;vm.createContext(c);
 for(const p of ['data.js','skill_master.js','skill_rankings.js'])vm.runInContext(read(p),c,{filename:p});
 jobs[0].click();
 const rows=()=> (elements.skillRankingRoot.innerHTML.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[]).filter(row=>row.includes('title="ホークアイリーサル"'));
 const singles=rows();
 assert.equal(singles.length,2);
 assert(singles.some(x=>x.includes('<td class="skill-rank-score">1125</td>')&&x.includes('<td class="skill-rank-exp">215</td>')));
 assert(singles.some(x=>x.includes('<td class="skill-rank-score">675</td>')&&x.includes('<td class="skill-rank-exp">259</td>')));
 levels[1].click();
 const total=rows();assert.equal(total.length,1);
 assert(total[0].includes('<td class="skill-rank-score">1800</td>'));
 assert(total[0].includes('<td class="skill-rank-exp">474</td>'));
});
test('New skill asset and worker cache version is synchronized',()=>{
 const main=read('index.html'),ranking=read('rankings.html'),worker=read('pawaado_worker.js');
 const skillVersion=worker.match(/skill_master\.js\?v=([^']+)/)?.[1];
 const dataVersion=worker.match(/data\.js\?v=([^']+)/)?.[1];
 assert(skillVersion&&dataVersion&&skillVersion.includes('hawkeye-lethal'));
 for(const page of [main,ranking]){
  assert(page.includes('skill_master.js?v='+skillVersion));
  assert(page.includes('data.js?v='+dataVersion));
 }
 assert(read('script.js').includes('pawaado_worker.js?v='+dataVersion));
 assert(read('pawaado_worker_resistance.js').includes('pawaado_worker.js?v='+dataVersion));
 assert(read('resistance_patch.js').includes("const PATCH_VERSION='"+dataVersion+"'"));
});
