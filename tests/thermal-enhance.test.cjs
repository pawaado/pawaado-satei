'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function load(){
 const c={window:{}};
 for(const p of ['data.js','skill_master.js'])vm.runInNewContext(read(p),c,{filename:p});
 return c.window.PAWAADO_DATA;
}
test('サーマルエンハンス Lv.1/Lv.2: screenshot costs, job, attribute, conditions and appraisal',()=>{
 const D=load(),matches=D.skillRankings.skills.filter(s=>s.name==='サーマルエンハンス');
 assert.equal(matches.length,1);const s=matches[0];
 assert.equal(s.category,'アクションスキル');
 assert.equal(s.kind,'固有');
 assert.equal(s.attribute,'火');
 assert.deepEqual(Array.from(s.jobs),['僧侶']);
 assert.equal(D.skillJobEligible(s,'僧侶'),true);
 assert.equal(D.skillJobEligible(s,'魔法使い'),false);
 assert.equal(s.levels.length,2);
 for(const [i,cost,score,condition] of [
  [0,[0,0,64,64,86],[1125,1125],'魔力40以上'],
  [1,[0,0,78,78,103],[675,1800],'魔力60以上']]){
  const lv=s.levels[i];assert.equal(lv.lv,i+1);assert.equal(lv.tip,1);
  assert.equal(lv.condition,condition);
  assert.deepEqual(Array.from(lv.cost),cost);
  assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,i+1,1)),cost);
  assert.deepEqual(Array.from(D.skillJobScore(s,lv,'僧侶')),score);
  assert.equal(lv.description,undefined);assert.equal(lv.effect,undefined);
 }
 assert.equal(s.description,undefined);assert.equal(s.effect,undefined);
 assert.equal(D.skillCandidateLevelCost(s,1,2),null);
 assert.deepEqual(Array.from(s.levels.map(l=>l.cost.reduce((a,b)=>a+b,0))),[214,259]);
 assert.equal(s.levels.reduce((sum,l)=>sum+l.cost.reduce((a,b)=>a+b,0),0),473);
});
test('サーマルエンハンス Lv.別 and Lv.累計 僧侶系統 rankings',()=>{
 const elements={basicRankingView:{hidden:false},skillRankingView:{hidden:true},skillRankingRoot:{innerHTML:''}};
 const btn=dataset=>({dataset,setAttribute(){},addEventListener(event,fn){if(event==='click')this.click=fn}});
 const modes=['basic','skills'].map(rankingMode=>btn({rankingMode}));
 const jobs=['僧侶系統'].map(skillJob=>btn({skillJob}));
 const levels=['single','total'].map(skillLevelMode=>btn({skillLevelMode}));
 const c={location:{search:'?mode=skills'},URLSearchParams,
  document:{getElementById:id=>elements[id]||null,querySelectorAll:q=>q==='[data-ranking-mode]'?modes:q==='[data-skill-job]'?jobs:q==='[data-skill-level-mode]'?levels:[]}};
 c.window=c;vm.createContext(c);
 for(const p of ['data.js','skill_master.js','skill_rankings.js'])vm.runInContext(read(p),c,{filename:p});
 jobs[0].click();
 const rows=()=>(elements.skillRankingRoot.innerHTML.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[]).filter(r=>r.includes('title="サーマルエンハンス"'));
 const singles=rows();assert.equal(singles.length,2);
 for(const [score,exp] of [[1125,214],[675,259]]){
  assert(singles.some(r=>r.includes('<td class="skill-rank-score">'+score+'</td>')&&r.includes('<td class="skill-rank-exp">'+exp+'</td>')),score+'/'+exp);
 }
 levels[1].click();
 const total=rows();assert.equal(total.length,1);
 assert(total[0].includes('<td class="skill-rank-score">1800</td>'));
 assert(total[0].includes('<td class="skill-rank-exp">473</td>'));
});
test('サーマルエンハンス worker cache versions propagated to UI and rankings',()=>{
 const worker=read('pawaado_worker.js');
 const skillVersion=worker.split('skill_master.js?v=')[1]?.split("'")[0];
 const workerVersion=worker.split('data.js?v=')[1]?.split("'")[0];
 assert(skillVersion&&workerVersion&&skillVersion.includes('thermal-enhance'));
 for(const p of ['index.html','rankings.html']){
  assert(read(p).includes('skill_master.js?v='+skillVersion));
  assert(read(p).includes('data.js?v='+workerVersion));
 }
 assert(read('script.js').includes('pawaado_worker.js?v='+workerVersion));
 assert(read('pawaado_worker_resistance.js').includes('pawaado_worker.js?v='+workerVersion));
 assert(read('resistance_patch.js').includes("const PATCH_VERSION='"+workerVersion+"'"));
});
