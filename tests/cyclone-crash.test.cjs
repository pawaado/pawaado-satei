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
test('サイクロンクラッシュ Lv.1-3: image-observed costs, appraisal, conditions and no explanations',()=>{
 const D=dataset(), matches=D.skillRankings.skills.filter(s=>s.name==='サイクロンクラッシュ');
 assert.equal(matches.length,1);
 const s=matches[0];
 assert.equal(s.category,'必殺技');assert.equal(s.kind,'固有');assert.equal(s.attribute,'風');
 assert.deepEqual(Array.from(s.jobs),['オーブストライカー']);
 assert.equal(D.skillJobEligible(s,'オーブストライカー'),true);
 assert.equal(D.skillJobEligible(s,'魔闘士'),false);
 assert.equal(D.jobFamilyByJob['オーブストライカー'],'魔闘士系統');
 assert.equal(s.levels.length,3);
 for(const [i,cost,score,condition] of [
  [0,[0,32,126,126,63],[2000,2000],'魔力20以上・器用さ20以上'],
  [1,[0,49,194,194,97],[1600,3600],'魔力50以上・器用さ50以上'],
  [2,[0,146,583,583,292],[1600,5200],'魔力70以上・器用さ70以上']]){
  const lv=s.levels[i];assert.equal(lv.lv,i+1);assert.equal(lv.tip,1);assert.equal(lv.condition,condition);
  assert.deepEqual(Array.from(lv.cost),cost);
  assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,i+1,1)),cost);
  assert.deepEqual(Array.from(D.skillJobScore(s,lv,'オーブストライカー')),score);
  assert.equal(lv.description,undefined);assert.equal(lv.effect,undefined);
 }
 assert.equal(s.description,undefined);assert.equal(s.effect,undefined);
 assert.deepEqual(Array.from(s.levels.map(l=>l.cost.reduce((a,b)=>a+b,0))),[347,534,1604]);
 assert.equal(s.levels.reduce((sum,l)=>sum+l.cost.reduce((a,b)=>a+b,0),0),2485);
});
test('サイクロンクラッシュ appears in Lv.別 and Lv.累計 魔闘士系統 ranking',()=>{
 const elements={basicRankingView:{hidden:false},skillRankingView:{hidden:true},skillRankingRoot:{innerHTML:''}};
 const button=dataset=>({dataset,setAttribute(){},addEventListener(evt,fn){if(evt==='click')this.click=fn}});
 const modes=['basic','skills'].map(rankingMode=>button({rankingMode}));
 const jobs=['魔闘士系統'].map(skillJob=>button({skillJob}));
 const levels=['single','total'].map(skillLevelMode=>button({skillLevelMode}));
 const c={location:{search:'?mode=skills'},URLSearchParams,
 document:{getElementById:id=>elements[id]||null,querySelectorAll:q=>q==='[data-ranking-mode]'?modes:q==='[data-skill-job]'?jobs:q==='[data-skill-level-mode]'?levels:[]}};
 c.window=c;vm.createContext(c);
 for(const file of ['data.js','skill_master.js','skill_rankings.js'])vm.runInContext(read(file),c,{filename:file});
 jobs[0].click();
 const rows=()=> (elements.skillRankingRoot.innerHTML.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[]).filter(r=>r.includes('title="サイクロンクラッシュ"'));
 const single=rows();assert.equal(single.length,3);
 for(const [score,exp] of [[2000,347],[1600,534],[1600,1604]]){
  assert(single.some(r=>r.includes('<td class="skill-rank-score">'+score+'</td>')&&r.includes('<td class="skill-rank-exp">'+exp+'</td>')),'missing '+score+'/'+exp);
 }
 levels[1].click();
 const total=rows();assert.equal(total.length,1);
 assert(total[0].includes('<td class="skill-rank-score">5200</td>'));
 assert(total[0].includes('<td class="skill-rank-exp">2485</td>'));
});
