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
const photo=sources['photo_import.js'];
for(const [,name] of photo.matchAll(/matchesTemplate\(image,'([^']+)'/g))assert(fs.existsSync(`assets/${name}.png`),`dynamic template missing: ${name}`);
const references=photo.match(/const REFERENCES=(\[.*?\]);/)[1];
for(const [,file] of vm.runInNewContext(references))assert(fs.existsSync(`assets/academies/${file}.png`),`academy template missing: ${file}`);
const photoVersion=photo.match(/const PHOTO_IMPORT_BUILD='([^']+)'/)[1];
assert.equal(refs.find(r=>r.file==='photo_import.js').url.split('?v=')[1],photoVersion,'photo build/cache mismatch');
const workerVersion=sources['resistance_patch.js'].match(/const PATCH_VERSION='([^']+)'/)[1];
const dataContext={window:{}};new vm.Script(sources['data.js'],{filename:'data.js'}).runInNewContext(dataContext);
const data=dataContext.window.PAWAADO_DATA,resistanceRules=data.resistanceRules;
assert(resistanceRules&&resistanceRules.scorePerPercent&&resistanceRules.directEffects&&Array.isArray(resistanceRules.pairSources),'data.js: resistanceRules missing');
const specialNames=new Set((data.special||[]).map(row=>String(row[1]||'')));
const checkEffect=(name,type,value)=>{assert(specialNames.has(name),`data.js: unknown resistance skill ${name}`);assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown resistance type ${type} for ${name}`);assert(Number.isFinite(Number(value))&&Number(value)!==0,`data.js: invalid resistance value for ${name}`);};
for(const pair of resistanceRules.pairSources){for(const type of pair.types||[pair.type]){checkEffect(pair.lower,type,pair.lowerValue);checkEffect(pair.upper,type,Number(pair.upperValue)-Number(pair.lowerValue));}}
for(const [name,effects] of Object.entries(resistanceRules.directEffects))for(const [type,value] of effects)checkEffect(name,type,value);
for(const [job,effects] of Object.entries(resistanceRules.jobDefaults||{}))for(const [type,value] of Object.entries(effects)){assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown job resistance type ${type} for ${job}`);assert(Number.isFinite(Number(value))&&Number(value)!==0,`data.js: invalid job resistance for ${job}`);}
for(const [name,def] of Object.entries(data.superResistances||{}))for(const type of def.types||[])assert(Object.prototype.hasOwnProperty.call(resistanceRules.scorePerPercent,type),`data.js: unknown super resistance type ${type} for ${name}`);
assert(sources['pawaado_worker_resistance.js'].includes('D.resistanceRules'),'resistance worker must use data.js resistanceRules');
assert(sources['rankings.html'].includes('D.resistanceRules'),'rankings must use data.js resistanceRules');
assert(!sources['resistance_patch.js'].includes('window.Map=TrackedMap'),'resistance_patch.js must not replace global Map');
assert(!sources['resistance_patch.js'].includes('PAWAADO_EFFECT_RULES'),'resistance_patch.js contains duplicated/dead effect rules');
assert(!sources['resistance_patch.js'].includes('syncUsageNoteOnly'),'resistance_patch.js must not overwrite usage notes');
assert(!sources['resistance_patch.js'].includes("value=event.target.value?'2':''"),'manual super selection must not auto-select Lv2');
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
