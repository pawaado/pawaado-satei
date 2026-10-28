'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8'),data=true){
 const elements={rankingRoot:{innerHTML:''}};
 const tabs=['物理職','魔法職','僧侶'].map(group=>({dataset:{group},attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(t,fn){this.click=fn}}));
 const c={document:{getElementById:id=>elements[id],querySelectorAll:()=>tabs},scrollTo(){}};c.window=c;vm.createContext(c);
 if(data)vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),c);
 const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim()).join('\n');
 vm.runInContext(script.replace(/\}\)\(\);\s*$/, 'window.audit={allItems,basicItems,specialItems,groupDefs,referenceHp,resistanceImpactSkills};})();'),c);
 return {c,tabs,elements};
}
test('all groups have finite, unique, correctly ordered rankings',()=>{
 const {c}=load();for(const g of Object.keys(c.audit.groupDefs)){
  const rows=c.audit.allItems(g);assert(rows.length>100);assert.equal(new Set(rows.map(r=>r.ability)).size,rows.length);
  rows.forEach((r,i)=>{assert.equal(r.rank,i+1);assert(Number.isFinite(r.score)&&Number.isFinite(r.eff)&&r.exp>0);assert(Math.abs(r.eff-r.score/r.exp)<1e-12);
   if(i){const prev=rows[i-1];const pe=Math.round(prev.eff*1000),ce=Math.round(r.eff*1000);assert(pe>=ce);if(pe===ce){assert(prev.score>=r.score-1e-9);if(Math.abs(prev.score-r.score)<=1e-9){assert(prev.exp<=r.exp+1e-9);if(Math.abs(prev.exp-r.exp)<=1e-9)assert(prev.gameOrder<r.gameOrder);}}}
  });
 }
});
test('special scores/costs match master data, zero scores are excluded, dual levels only appear in physical group',()=>{
 const {c}=load();const d=c.PAWAADO_DATA;
 for(const [g,def] of Object.entries(c.audit.groupDefs)){
  const rows=c.audit.specialItems(g);
  for(const s of d.special){if(s[1]==='通常攻撃(双剣士)')continue;const score=Number(s[11])?Number(s[def.fixedIndex]||0)+1925*Number(s[11]):Number(s[def.scoreIndex]||0);const exp=s.slice(3,8).reduce((a,v)=>a+Number(v||0),0);const names=s[1]==='〜攻撃'?['火攻撃','風攻撃','水攻撃']:[s[1]];for(const name of names){const item=rows.find(r=>r.ability===name||r.ability===name+' ※HP依存');if(score===0||exp<=0){assert(!item);continue;}assert(item,name);assert.equal(item.score,score);assert.equal(item.exp,exp);}}
  const dual=rows.filter(r=>r.ability.startsWith('通常攻撃(双剣士)'));assert.equal(dual.length,g==='物理職'?5:0);
 }
});
test('tab clicks render each group and expose a single pressed state',()=>{
 const {c,tabs,elements}=load();for(const tab of tabs){tab.click();assert.equal(tabs.filter(t=>t.attrs['aria-pressed']==='true').length,1);assert.equal(tab.attrs['aria-pressed'],'true');assert.equal((elements.rankingRoot.innerHTML.match(/<tr class=/g)||[]).length,c.audit.allItems(tab.dataset.group).length);assert(elements.rankingRoot.innerHTML.includes('ranking-resistance-marker'));}
});
test('resistance-impact markers are derived from canonical data rules',()=>{
 const {c}=load();const rules=c.PAWAADO_DATA.resistanceRules;
 const expected=new Set([...(rules.pairSources||[]).flatMap(x=>[x.lower,x.upper]),...Object.keys(rules.directEffects||{})]);
 assert.deepEqual([...c.audit.resistanceImpactSkills].sort(),[...expected].sort());
});
test('HP-based rankings retain life-90 notes without displaying HP1925',()=>{
 const {c}=load();assert.equal(c.audit.referenceHp,1925);
 const html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8');
 assert(html.includes('HP依存特殊能力は生命力90で計算しています。'));
 assert(html.includes('HP依存の超特殊能力は生命力90で計算しています。'));
 assert(!html.includes('HP1925'));
 assert(!html.includes('referenceHpNote'));assert(!html.includes('skillReferenceHpNote'));
 assert(load(undefined,false).elements.rankingRoot.innerHTML.includes('読み込めませんでした'));
});
test('ranking notes use the renamed section and do not describe the expanded elemental attack',()=>{
 const html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8');
 assert.equal((html.match(/<h2>注記<\/h2>/g)||[]).length,2);
 assert(html.includes('物理職は剣士・重戦士・弓使い系統を、魔法職は魔法使い・魔闘士系統を指します。'));
 assert(!html.includes('～攻撃は火攻撃、風攻撃、水攻撃のいずれかを指します。'));
 assert(!html.includes('コツLv0で比較しています'));
 assert(html.includes('data-group="僧侶" aria-pressed="false">僧侶系統</button>'));
});
test('generic 〜攻撃 becomes three independently ranked rows ordered 火→風→水',()=>{
 const {c}=load();const master=c.PAWAADO_DATA.special.find(x=>x[1]==='〜攻撃');
 assert(master,'elemental attack should remain one entry in data.js');
 const elemental=['火攻撃','風攻撃','水攻撃'];
 for(const group of Object.keys(c.audit.groupDefs)){
  const ranked=c.audit.allItems(group);
  const matched=ranked.filter(x=>elemental.includes(x.ability));
  assert.deepEqual(Array.from(matched,x=>x.ability),elemental,group);
  assert.equal(ranked.some(x=>x.ability==='〜攻撃'||x.ability==='～攻撃'),false,group);
  const expectedScore=c.audit.specialItems(group).find(x=>x.ability==='火攻撃').score;
  const exp=master.slice(3,8).reduce((sum,n)=>sum+Number(n||0),0);
  for(let k=0;k<3;k++){
   const item=matched[k];assert.equal(item.score,expectedScore);assert.equal(item.exp,exp);
   if(k>0)assert.equal(item.rank,matched[k-1].rank+1);
  }
 }
});
test('all numbers and ordering are unchanged by the display consolidation',{skip:!process.env.RANKINGS_BEFORE},()=>{
 const before=load(fs.readFileSync(process.env.RANKINGS_BEFORE,'utf8')).c.audit,after=load().c.audit;
 for(const group of Object.keys(after.groupDefs))assert.equal(JSON.stringify(after.allItems(group)),JSON.stringify(before.allItems(group)));
});

test('target-specific fractional scores are preserved in rankings',()=>{
 const {c}=load();
 for(const [name,group,index] of [
  ['対ヌメリン◎','物理職',8],
  ['対ウンディーネ◎','魔法職',9],
  ['対ウンディーネ◎','僧侶',10]
 ]){
  const ability=c.PAWAADO_DATA.special.find(row=>row[1]===name);
  assert(ability,`missing skill: ${name}`);
  assert.equal(ability[index],4.5,`${name}: ${group} source score`);
  const ranked=c.audit.allItems(group).find(row=>row.ability===name);
  assert(ranked,`missing ranking: ${name} / ${group}`);
  assert.equal(ranked.score,4.5,`${name}: ${group} ranking score`);
  assert.equal(ranked.eff,4.5/ranked.exp);
 }
});

test('both ranking note blocks use the requested resistance wording',()=>{
 const html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8');
 assert(html.includes('耐性に影響する特殊能力は他の耐性に影響するものを除いた状態で計算しています。'));
 assert(html.includes('耐性に影響する超特殊能力は他の耐性に影響するものを除いた状態で計算しています。'));
 assert(!html.includes('重戦士のジョブ固有耐性を含めず'));
 assert(!html.includes('重戦士の固有耐性や他の耐性系能力'));
});
test('skill ranking table font sizes match the basic ranking table',()=>{
 const html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'skill_rankings.css'),'utf8');
 assert(html.includes('td{font-size:13px;background:#fff}'));
 assert(html.includes('font-size:13px;') && css.includes('#skillRankingRoot th{font-size:13px;'));
 for(const selector of ['#skillRankingRoot td{font-size:13px;', '.skill-row-title{display:block;flex:0 0 auto;font-weight:600;font-size:13px;', '.skill-level{display:inline-flex;align-items:center;flex:0 0 auto;font-size:10px;', '.skill-row-detail{font-size:13px;', '#skillRankingRoot td.skill-rank-eff{font-size:13px;font-weight:800}', '#skillRankingRoot td.skill-rank-score,#skillRankingRoot td.skill-rank-exp{font-size:13px;font-weight:600}'])assert(css.includes(selector),selector);
});

test('basic ranking selected class uses the same red family-tab style as skills',()=>{
 const html=fs.readFileSync(path.join(root,'rankings.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'skill_rankings.css'),'utf8');
 assert(html.includes('.tab[aria-pressed="true"]{color:#fff;border-color:#793323;background:linear-gradient(180deg,#b65d3f,#8b392a)'));
 assert(css.includes('.skill-job-tab[aria-pressed="true"]{background:linear-gradient(#b65d3f,#8b392a);border-color:#793323;color:#fff}'));
 assert(html.includes('.tab{font-size:12px;padding:12px 2px}'));
});
