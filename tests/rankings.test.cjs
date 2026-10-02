'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8'),data=true){
 const elements={rankingRoot:{innerHTML:''},referenceHpNote:{textContent:''}};
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
   if(i){const prev=rows[i-1];assert(prev.eff>=r.eff-1e-12);if(Math.abs(prev.eff-r.eff)<=1e-12){assert(prev.score>=r.score-1e-9);if(Math.abs(prev.score-r.score)<=1e-9)assert(prev.gameOrder<r.gameOrder);}}
  });
 }
});
test('special scores/costs match master data, zero scores are excluded, dual levels only appear in physical group',()=>{
 const {c}=load();const d=c.PAWAADO_DATA;
 for(const [g,def] of Object.entries(c.audit.groupDefs)){
  const rows=c.audit.specialItems(g);
  for(const s of d.special){if(s[1]==='通常攻撃(双剣士)')continue;const score=Number(s[11])?Number(s[def.fixedIndex]||0)+1925*Number(s[11]):Number(s[def.scoreIndex]||0);const exp=s.slice(3,8).reduce((a,v)=>a+Number(v||0),0);const item=rows.find(r=>r.ability===s[1]||r.ability===s[1]+' ※HP依存');if(score===0||exp<=0){assert(!item);continue;}assert(item,s[1]);assert.equal(item.score,score);assert.equal(item.exp,exp);}
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
test('HP note is derived from master data and missing data reports an error',()=>{
 const {c,elements}=load();assert.equal(c.audit.referenceHp,1925);assert(elements.referenceHpNote.textContent.includes('HP1925'));assert(load(undefined,false).elements.rankingRoot.innerHTML.includes('読み込めませんでした'));
});
test('ranking notes use the generic elemental attack explanation and omit the hint-level note',()=>{
 const html=fs.readFileSync(process.env.RANKINGS_SOURCE||path.join(root,'rankings.html'),'utf8');
 assert(html.includes('～攻撃は火攻撃、風攻撃、水攻撃のいずれかを指します。'));
 assert(!html.includes('コツLv0で比較しています'));
});
test('all numbers and ordering are unchanged by the display consolidation',{skip:!process.env.RANKINGS_BEFORE},()=>{
 const before=load(fs.readFileSync(process.env.RANKINGS_BEFORE,'utf8')).c.audit,after=load().c.audit;
 for(const group of Object.keys(after.groupDefs))assert.equal(JSON.stringify(after.allItems(group)),JSON.stringify(before.allItems(group)));
});
