'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
const names=fs.readdirSync(root).filter(n=>/\.(js|html|css)$/.test(n));
const read=n=>fs.readFileSync(n,'utf8');
const sources=Object.fromEntries(names.map(n=>[n,read(n)]));
const refs=[];
for(const [name,source] of Object.entries(sources)){
 if(name.endsWith('.js'))new vm.Script(source,{filename:name});
 if(name.endsWith('.html'))for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(m[1].trim())new vm.Script(m[1],{filename:name+' (inline)'});}
 for(const m of source.matchAll(/(?:src=|href=|importScripts\(|fetch\(|new Worker\()["']([^"']+)["']/g)){
  const url=m[1];if(/^(?:[a-z]+:|\/\/|#)/i.test(url)||url.includes('${'))continue;
  const file=url.split(/[?#]/)[0].replace(/^\.\//,'');if(!file)continue;
  assert(fs.existsSync(file),`${name}: missing ${url}`);refs.push({from:name,file,url});
 }
}
const mainStyle=sources['style.css'];
assert(!/<style(?:\s[^>]*)?>/i.test(sources['index.html']),'index.html must not contain inline style blocks; main-page styles belong in style.css');
assert(!/basicIconMap|ability-name-svg|magicWandShaft|durability-shield-icon/.test(sources['script.js']),'script.js contains hidden/dead basic ability icon generation');
assert.equal((mainStyle.match(/{/g)||[]).length,(mainStyle.match(/}/g)||[]).length,'style.css: brace count mismatch');
for(const dead of ['--paper-deep:','--leather:','--bronze:','--line-soft:','--green:','--green-light:','--blue:','--red:','section-heading-with-action','select-game-arrow','disabled-note','note-title','note-no-break','button.small']) assert(!mainStyle.includes(dead),`style.css: removed/dead style returned: ${dead}`);
const photo=sources['photo_import.js'];
for(const [,name] of photo.matchAll(/matchesTemplate\(image,'([^']+)'/g))assert(fs.existsSync(`assets/${name}.png`),`dynamic template missing: ${name}`);
const references=photo.match(/const REFERENCES=(\[.*?\]);/)[1];
for(const [,file] of vm.runInNewContext(references))assert(fs.existsSync(`assets/academies/${file}.png`),`academy template missing: ${file}`);
const photoVersion=photo.match(/const PHOTO_IMPORT_BUILD='([^']+)'/)[1];
assert.equal(refs.find(r=>r.file==='photo_import.js').url.split('?v=')[1],photoVersion,'photo build/cache mismatch');
const workerVersion=sources['resistance_patch.js'].match(/const PATCH_VERSION='([^']+)'/)[1];
const dataContext={window:{}};new vm.Script(sources['data.js'],{filename:'data.js'}).runInNewContext(dataContext);
const data=dataContext.window.PAWAADO_DATA,resistanceRules=data.resistanceRules;
assert(!Object.prototype.hasOwnProperty.call(data,'attributes'),'data.js: abandoned attribute selector data returned');
assert(!sources['index.html'].includes('id="attribute"'),'index.html: abandoned attribute selector returned');
assert(!sources['script.js'].includes("getElementById('attribute')"),'script.js: abandoned attribute UI returned');
assert(!sources['photo_import.js'].includes('attributeByIcon'),'photo_import.js: abandoned attribute recognition returned');
assert(!sources['resistance_patch.js'].includes("createElement('style')"),'resistance_patch.js must contain behavior only; resistance appearance belongs in style.css');
for(const selector of ['.extra-resistance-list{','.super-controls{','.extra-resistance-group-remove{'])assert(mainStyle.includes(selector),`style.css: resistance UI style missing: ${selector}`);
assert(sources['photo_import.js'].includes('DATA_JOB_GRAY_TEMPLATES'),'photo_import.js: ability-data job icon templates missing');
assert(sources['photo_import.js'].includes('function dataJobByIcon('),'photo_import.js: ability-data job icon recognition missing');
assert(sources['photo_import.js'].includes("else out.job=abilityUpIdentity.job||dataIdentity.job||''"),'photo_import.js: ability-up job must have priority over ability-data icon');
assert(sources['photo_import.js'].includes("if(jobResult.job)abilityUpIdentity.job=jobResult.job;"),'photo_import.js: the single ability-up job should be assigned directly');
assert(sources['photo_import.js'].includes('const hasCharacterScreens=hasData&&(hasAbilityUp||hasTraining)'),'photo_import.js: ability data plus training must be accepted without ability-up');
assert(sources['photo_import.js'].includes('EXTRA_ABILITY_MASKS_20261002_IMG1011'),'photo_import.js: IMG_1011 regression templates missing');
assert(sources['photo_import.js'].includes('const mark=shapeMark||pairMarkByImage'),'photo_import.js: explicit ○/◎ shape must outrank full-cell mark matching');
assert(sources['photo_import.js'].includes('markHint=shapeMark||visualMark'),'photo_import.js: fallback ○/◎ shape must outrank full-cell mark matching');
assert(sources['photo_import.js'].includes('const shape=exactPairMark||markShapeByImage(image,cell,stem)||pairMarkByImage'),'photo_import.js: exact full-cell pair mark must outrank shape/full-cell fallback');
assert(sources['photo_import.js'].includes('if(!abilityUpIdentity.job){'),'photo_import.js: data-screen job icon should be skipped after ability-up job is known');
assert(sources['script.js'].includes("entry.confirmed===true&&(entry.level===1||entry.level===2)"),'script.js: only confirmed super names with confirmed Lv may affect input');
assert(sources['script.js'].includes('for(const entry of confirmedSupers)'),'script.js: lower prerequisites must come only from confirmed supers');
assert(sources['photo_import.js'].includes("if(cell.superCell)return '';"),'photo_import.js: super image matching must not use relaxed fallback');
assert(sources['photo_import.js'].includes('suggestedSuper:best.name'),'photo_import.js: uncertain super may be suggested but not entered');
assert(!sources['photo_import.js'].includes("SUPER_NAMES.includes('烈')&&/[烈珠科杏吾]/"),'photo_import.js: guessed 烈 recognition returned');
assert(sources['photo_import.js'].includes('if(entry.confirmed!==true)continue;'),'photo_import.js: unconfirmed supers must not enter image result');
assert(sources['photo_import.js'].includes('s.level=null;'),'photo_import.js: conflicting super Lv must become unresolved');
assert(sources['index.html'].includes('～攻撃は火攻撃、風攻撃、水攻撃のいずれかを指します。'),'index.html: original generic elemental attack note missing');
assert(!sources['rankings.html'].includes("['火攻撃','風攻撃','水攻撃']"),'rankings.html: abandoned elemental expansion returned');
assert(!sources['rankings.html'].includes('コツLv0で比較しています'),'rankings.html: removed hint-level note returned');
assert(sources['rankings.html'].includes('～攻撃は火攻撃、風攻撃、水攻撃のいずれかを指します。'),'rankings.html: generic elemental attack note missing');
const healingHeart=(data.special||[]).find(row=>String(row[1])==='癒やしの心');
assert(healingHeart,'data.js: 癒やしの心 missing');
assert.equal(Number(healingHeart[11]),0.01,'data.js: 癒やしの心 HP rate must be 1%');
assert.equal(Number(healingHeart[12]||0),0,'data.js: 癒やしの心 physical fixed score must be 0');
assert.equal(Number(healingHeart[13]||0),0,'data.js: 癒やしの心 magic fixed score must be 0');
assert.equal(Number(healingHeart[14]||0),90,'data.js: 癒やしの心 priest fixed score must be 90');
assert(resistanceRules&&resistanceRules.scorePerPercent&&resistanceRules.directEffects&&Array.isArray(resistanceRules.pairSources),'data.js: resistanceRules missing');
const specialNames=new Set((data.special||[]).map(row=>String(row[1]||'')));
const checkEffect=(name,type,value)=>{assert(specialNames.has(name),`data.js: unknown resistance skill ${name}`);assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown resistance type ${type} for ${name}`);assert(Number.isFinite(Number(value))&&Number(value)!==0,`data.js: invalid resistance value for ${name}`);};
for(const pair of resistanceRules.pairSources){for(const type of pair.types||[pair.type]){checkEffect(pair.lower,type,pair.lowerValue);checkEffect(pair.upper,type,Number(pair.upperValue)-Number(pair.lowerValue));}}
for(const [name,effects] of Object.entries(resistanceRules.directEffects))for(const [type,value] of effects)checkEffect(name,type,value);
for(const [job,effects] of Object.entries(resistanceRules.jobDefaults||{}))for(const [type,value] of Object.entries(effects)){assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown job resistance type ${type} for ${job}`);assert(Number.isFinite(Number(value))&&Number(value)!==0,`data.js: invalid job resistance for ${job}`);}
for(const [name,def] of Object.entries(data.superResistances||{})){for(const type of def.types||[])assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown super resistance type ${type} for ${name}`);for(const included of def.includes||[])assert(specialNames.has(String(included)),`data.js: unknown included lower ability ${included} for ${name}`);}
assert(sources['pawaado_worker_resistance.js'].includes('D.resistanceRules'),'resistance worker must use data.js resistanceRules');
assert(sources['rankings.html'].includes('D.resistanceRules'),'rankings must use data.js resistanceRules');
assert(!sources['resistance_patch.js'].includes('window.Map=TrackedMap'),'resistance_patch.js must not replace global Map');
assert(!sources['resistance_patch.js'].includes('PAWAADO_EFFECT_RULES'),'resistance_patch.js contains duplicated/dead effect rules');
assert(!sources['resistance_patch.js'].includes('syncUsageNoteOnly'),'resistance_patch.js must not overwrite usage notes');
assert(sources['resistance_patch.js'].includes("value=event.target.value?'2':''"),'manual super selection must default to Lv2');
assert(sources['script.js'].includes('D.superResistances?.[superName]?.includes'),'script worker payload must include lower abilities implied by selected supers');
assert(sources['script.js'].includes('__PAWAADO_APPLY_SUPER_INCLUDED_SPECIALS__'),'script must expose super-to-lower ownership sync');
assert(sources['script.js'].includes('__PAWAADO_REMOVE_SUPERS_REQUIRING_SPECIAL__'),'script must remove an upper super when an included lower ability is manually removed');
assert(sources['resistance_patch.js'].includes('__PAWAADO_REMOVE_SUPERS_REQUIRING_SPECIAL__'),'resistance UI must expose lower-to-super removal sync');
assert(sources['resistance_patch.js'].includes('__PAWAADO_APPLY_SUPER_INCLUDED_SPECIALS__'),'resistance UI must apply lower abilities for selected supers');
assert(!sources['script.js'].includes("addEventListener('pawaado-super-change'"),'legacy one-way super ownership event must stay removed');
assert(sources['academy_runtime.js'].includes('__PAWAADO_DUAL_ATTACK_SIGNATURE__'),'dual attack UI must expose cache identity');
assert(sources['script.js'].includes("'dualAttack:'+dualPart"),'calculation cache key must include dual attack level/hint');
assert(sources['script.js'].includes('disabledBeforeCalc'),'calculation must restore prior disabled states');
assert(!sources['script.js'].includes("querySelectorAll('button,input,select').forEach(el=>{el.disabled=false;})"),'calculation must not blindly enable every control');
assert.equal((sources['resistance_patch.js'].match(/function removeSupersRequiringSpecial\(/g)||[]).length,1,'resistance_patch.js must define one lower-to-super remover');
assert.equal((sources['academy_runtime.js'].match(/__PAWAADO_DUAL_ATTACK_SIGNATURE__/g)||[]).length,1,'academy_runtime.js must expose one dual cache signature getter');
assert(!/^\s*async\s*$/m.test(sources['script.js']),'script.js contains an orphan async keyword');
assert(!sources['script.js'].includes('function prune('),'script.js must not contain the removed browser-side optimizer');
assert(!sources['script.js'].includes('function itemForSpecialIndex('),'script.js must not contain the removed browser-side special candidate engine');
assert(!sources['script.js'].includes('MIXED_BRANCH_NORMAL'),'script.js must not contain removed mixed-search tuning constants');
for(const deadName of ['TARGET_DEBUG','function optimizeMixedAsync','function optimizeSpecialsForLife','function buildBasicStates']){
 assert(!sources['script.js'].includes(deadName),`script.js: obsolete local calculation/debug code remained: ${deadName}`);
}
for(const r of refs.filter(r=>['pawaado_worker.js','resistance_patch.js'].includes(r.file)))assert.equal(r.url.split('?v=')[1],workerVersion,`${r.from}: worker cache mismatch`);
const baseIndex=process.argv.indexOf('--base');
if(baseIndex>=0){
 const base=process.argv[baseIndex+1];assert(base,'--base needs a commit');
 const oldFiles=cp.execFileSync('git',['ls-tree','--name-only',base],{encoding:'utf8'}).trim().split('\n');
 for(const file of names.filter(n=>/\.(js|css)$/.test(n)&&oldFiles.includes(n))){
  const old=cp.execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'});if(old===sources[file])continue;
  for(const ref of refs.filter(r=>r.file===file)){
   assert(ref.url.includes('?v='),`${ref.from}: ${file} needs a cache version`);
   if(oldFiles.includes(ref.from)){
    const before=cp.execFileSync('git',['show',`${base}:${ref.from}`],{encoding:'utf8'});
    assert(!before.includes(ref.url),`${ref.from}: changed ${file}, but cache version was not updated`);
   }
  }
 }
}
// Run the actual resistance loader against the actual worker source; stale patch anchors must fail CI.
(async()=>{
 const messages=[],c={console,setTimeout,clearTimeout,performance};c.self=c;c.window=c;vm.createContext(c);
 c.postMessage=m=>messages.push(m);c.importScripts=url=>vm.runInContext(read(url.split('?')[0]),c);
 c.fetch=async()=>({ok:true,text:async()=>sources['pawaado_worker.js']});
 vm.runInContext(sources['pawaado_worker_resistance.js'],c);
 c.onmessage({data:{type:'calculate',payload:{academy:'パワフルアカデミー',job:'剣士',exp:[0,0,0,0,0]}}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(messages.length,1);assert.equal(messages[0].type,'result',messages[0].message);assert.equal(messages[0].result.score,0);
 console.log('PASS: JS syntax, local/dynamic references, cache versions, resistance worker startup'+(baseIndex>=0?', changed-file cache propagation':''));
})().catch(e=>{console.error(e);process.exitCode=1});
