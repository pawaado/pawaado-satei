'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function load(){
 const c={window:{}};
 vm.runInNewContext(read('data.js'),c);
 vm.runInNewContext(read('skill_master.js'),c);
 return c.window.PAWAADO_DATA;
}
test('一撃粉砕: jobs, levels, effects, exact costs and recorded descriptions',()=>{
 const D=load(),a=D.skillRankings.skills.filter(x=>x.name==='一撃粉砕');
 assert.equal(a.length,1);
 const s=a[0];
 assert.equal(s.category,'超特殊能力');
 assert.equal(s.kind,'サポートスキル');
 assert.equal(s.attribute,null);
 assert.equal(D.skillRankings.readings['一撃粉砕'],'いちげきふんさい');
 assert.equal(s.description,'自身の魔法攻撃倍率と必殺技倍率をアップ。');
 for(const job of ['剣士','重戦士','弓使い','双剣士','魔法使い','魔闘士','僧侶','オーブストライカー'])
  assert(D.skillJobEligible(s,job),'must be available for '+job);
 assert.deepEqual(Array.from(s.levels.map(x=>x.cost.reduce((sum,v)=>sum+v,0))),[196,227]);
 for(const [i,cost,needed,rate] of [[0,[49,0,98,49,0],'器用さ50以上',9],[1,[57,0,113,57,0],'器用さ60以上',17]]){
  const l=s.levels[i];
  assert.deepEqual(Array.from(l.cost),cost);
  assert.equal(l.tip,1);assert.equal(l.condition,needed);
  assert.equal(l.effect.魔法攻撃倍率,rate);assert.equal(l.effect.必殺技倍率,rate);
  assert.equal(l.description,'自身の魔法攻撃倍率を'+rate+'%アップ。さらに必殺技倍率を'+rate+'%アップ。');
  assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,i+1,1)),cost);
  assert.equal(D.skillCandidateLevelCost(s,i+1,2),null,'no estimated hint costs');
 }
 for(const [job,a,b,total] of [['魔法使い',603,536,1139],['魔闘士',603,536,1139],['オーブストライカー',603,536,1139],['剣士',198,176,374],['双剣士',198,176,374],['弓使い',198,176,374],['重戦士',198,176,374],['僧侶',238.5,212,450.5]]){
  assert.deepEqual(Array.from(D.skillJobScore(s,s.levels[0],job)),[a,a],job+' Lv1');
  assert.deepEqual(Array.from(D.skillJobScore(s,s.levels[1],job)),[b,total],job+' Lv2');
 }
});
test('一撃粉砕 is ranked in Lv.別 and Lv.累計 for physical, magical and healer jobs',()=>{
 const elements={basicRankingView:{hidden:false},skillRankingView:{hidden:true},skillRankingRoot:{innerHTML:''}};
 const btn=dataset=>({dataset,setAttribute(){},addEventListener(event,handler){if(event==='click')this.click=handler}});
 const modes=['basic','skills'].map(rankingMode=>btn({rankingMode}));
 const jobs=['剣士系統','魔法使い系統','僧侶系統'].map(skillJob=>btn({skillJob}));
 const levels=['single','total'].map(skillLevelMode=>btn({skillLevelMode}));
 const c={location:{search:'?mode=skills'},URLSearchParams,document:{getElementById:id=>elements[id]||null,querySelectorAll:q=>q==='[data-ranking-mode]'?modes:q==='[data-skill-job]'?jobs:q==='[data-skill-level-mode]'?levels:[]}};
 c.window=c;vm.createContext(c);
 for(const p of ['data.js','skill_master.js','skill_rankings.js'])vm.runInContext(read(p),c,{filename:p});
 const rows=()=> (elements.skillRankingRoot.innerHTML.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[]).filter(r=>r.includes('title="一撃粉砕"'));
 for(const [group,a,b,total] of [['剣士系統',198,176,374],['魔法使い系統',603,536,1139],['僧侶系統',238.5,212,450.5]]){
  jobs.find(x=>x.dataset.skillJob===group).click();
  const singles=rows();
  assert.equal(singles.length,2,group+' two levels');
  assert(singles.some(x=>x.includes('Lv.1</span>')&&x.includes('<td class="skill-rank-score">'+a+'</td>')&&x.includes('<td class="skill-rank-exp">196</td>')),group+' Lv1');
  assert(singles.some(x=>x.includes('Lv.2</span>')&&x.includes('<td class="skill-rank-score">'+b+'</td>')&&x.includes('<td class="skill-rank-exp">227</td>')),group+' Lv2');
  levels.find(x=>x.dataset.skillLevelMode==='total').click();
  const cumulative=rows();
  assert.equal(cumulative.length,1,group+' cumulative');
  assert(cumulative[0].includes('<td class="skill-rank-score">'+total+'</td>'));
  assert(cumulative[0].includes('<td class="skill-rank-exp">423</td>'));
  levels.find(x=>x.dataset.skillLevelMode==='single').click();
 }
});
test('skill master cache versions are synchronized for UI, rankings and worker',()=>{
 const versions=['index.html','rankings.html','pawaado_worker.js'].map(p=>read(p).match(/skill_master\.js\?v=([^"' ]+)/)?.[1]);
 assert(versions.every(x=>x&&x===versions[0]));
 assert.equal(versions[0],'20261114-ichigeki-funsai-1');
});
