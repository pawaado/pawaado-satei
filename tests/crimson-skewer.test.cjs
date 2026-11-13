'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function dataset(){
 const c={window:{}};
 vm.runInNewContext(read('data.js'),c);
 vm.runInNewContext(read('skill_master.js'),c);
 return c.window.PAWAADO_DATA;
}
test('クリムゾンスキュアー: observed Lv1/Lv2 scores, exact tips, cost, eligibility and descriptions',()=>{
 const D=dataset(), entries=D.skillRankings.skills.filter(x=>x.name==='クリムゾンスキュアー');
 assert.equal(entries.length,1);
 const s=entries[0];
 assert.equal(s.category,'必殺技');
 assert.equal(s.kind,'固有');
 assert.equal(s.attribute,'火');
 assert.deepEqual(Array.from(s.jobs),['魔法使い']);
 assert.equal(D.skillJobEligible(s,'魔法使い'),true);
 assert.equal(D.skillJobEligible(s,'剣士'),false);
 assert.equal(D.skillJobEligible(s,'魔闘士'),false);
 assert.equal(D.skillRankings.readings[s.name],'クリムゾンスキュアー');
 assert.equal(s.levels.length,2);
 const [a,b]=s.levels;
 assert.deepEqual(Array.from(a.cost),[0,32,126,126,63]);
 assert.deepEqual(Array.from(b.cost),[0,49,194,194,97]);
 assert.equal(a.cost.reduce((p,n)=>p+n,0),347);
 assert.equal(b.cost.reduce((p,n)=>p+n,0),534);
 assert.equal(a.tip,1);assert.equal(b.tip,1);
 assert.equal(a.condition,'魔力40以上');assert.equal(b.condition,'魔力60以上');
 assert.equal(a.effect['弓使い系統特効'],50); assert.equal(b.effect['僧侶系統特効'],50);
 assert.equal(a.effect['継続ターン'],1); assert.equal(b.effect['継続ターン'],1);
 assert.equal(a.effect['敵後列への魔法ダメージ威力'],90);
 assert.equal(b.effect['敵後列への魔法ダメージ威力'],130);
 assert(a.description.includes('威力90')); assert(b.description.includes('威力130'));
 assert.deepEqual(Array.from(D.skillJobScore(s,a,'魔法使い')),[2000,2000]);
 assert.deepEqual(Array.from(D.skillJobScore(s,b,'魔法使い')),[1600,3600]);
 assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,1,1)),[0,32,126,126,63]);
 assert.deepEqual(Array.from(D.skillCandidateLevelCost(s,2,1)),[0,49,194,194,97]);
 assert.equal(D.skillCandidateLevelCost(s,1,2),null);
 assert.equal(D.skillCandidateLevelCost(s,2,2),null);
});
test('クリムゾンスキュアー: 魔法使いのLv.別と累計ランキングに登録',()=>{
 const elems={basicRankingView:{hidden:false},skillRankingView:{hidden:true},skillRankingRoot:{innerHTML:''}};
 const btn=dataset=>({dataset,setAttribute(){},addEventListener(event,handler){if(event==='click')this.click=handler}});
 const mode=['basic','skills'].map(rankingMode=>btn({rankingMode}));
 const jobs=['剣士系統','魔法使い系統'].map(skillJob=>btn({skillJob}));
 const levels=['single','total'].map(skillLevelMode=>btn({skillLevelMode}));
 const c={location:{search:'?mode=skills'},URLSearchParams,document:{getElementById:id=>elems[id]||null,querySelectorAll:q=>q==='[data-ranking-mode]'?mode:q==='[data-skill-job]'?jobs:q==='[data-skill-level-mode]'?levels:[]}};
 c.window=c;vm.createContext(c);
 for(const f of ['data.js','skill_master.js','skill_rankings.js'])vm.runInContext(read(f),c,{filename:f});
 const rows=()=> (elems.skillRankingRoot.innerHTML.match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g)||[]).filter(r=>r.includes('title="クリムゾンスキュアー"'));
 jobs[0].click();assert.equal(rows().length,0,'no appearance in swordsman rankings');
 jobs[1].click();
 const single=rows();
 assert.equal(single.length,2);
 assert(single.some(r=>r.includes('Lv.1</span>')&&r.includes('<td class="skill-rank-score">2000</td>')&&r.includes('<td class="skill-rank-exp">347</td>')));
 assert(single.some(r=>r.includes('Lv.2</span>')&&r.includes('<td class="skill-rank-score">1600</td>')&&r.includes('<td class="skill-rank-exp">534</td>')));
 levels[1].click();
 const total=rows();
 assert.equal(total.length,1);
 assert(total[0].includes('<td class="skill-rank-score">3600</td>'));
 assert(total[0].includes('<td class="skill-rank-exp">881</td>'));
});
test('propagate changed worker and skill files through every browser cache reference',()=>{
 const refs={
  'index.html':['skill_master.js?v=20261114-crimson-skewer-1','data.js?v=20261114-skewer-worker-refresh-1','resistance_patch.js?v=20261114-skewer-worker-refresh-1','script.js?v=20261114-skewer-worker-refresh-1'],
  'rankings.html':['skill_master.js?v=20261114-crimson-skewer-1','data.js?v=20261114-skewer-worker-refresh-1'],
  'pawaado_worker.js':['skill_master.js?v=20261114-crimson-skewer-1','data.js?v=20261114-skewer-worker-refresh-1'],
  'pawaado_worker_resistance.js':['pawaado_worker.js?v=20261114-skewer-worker-refresh-1'],
  'script.js':['pawaado_worker.js?v=20261114-skewer-worker-refresh-1']
 };
 for(const [file,links] of Object.entries(refs))for(const link of links)assert(read(file).includes(link),file+' missing '+link);
 assert(read('resistance_patch.js').includes("const PATCH_VERSION='20261114-skewer-worker-refresh-1'"));
});
