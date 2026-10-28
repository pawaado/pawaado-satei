'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=src('index.html'),script=src('script.js');
test('attributes are offered exactly after academy/job, in 火・風・水 order',()=>{
 const before=html.indexOf('id="jobFieldLabel"'),after=html.indexOf('id="attributeFieldLabel"');
 assert(before>=0&&after>before);
 const block=html.slice(after,html.indexOf('</section>',after));
 assert.match(block,/id="attribute"/);
 assert(!/id="attribute"[^>]*disabled/.test(block));
 assert.deepEqual([...block.matchAll(/<option value="([^"]*)">/g)].map(m=>m[1]),['','火属性','風属性','水属性']);
 assert.match(block,/id="attributeSelectButton"/);
 assert(!/id="attributeSelectButton"[^>]*disabled/.test(block));
});
test('elemental ability display names and access depend on current attribute',()=>{
 const start=script.indexOf("const attribute=document.getElementById('attribute');");
 const end=script.indexOf('const DEFAULT_EXP_LIMIT',start);
 assert(start>0&&end>start);
 const attribute={value:''},academy={value:'パワフルアカデミー'},job={value:'剣士'};
 const context={document:{getElementById:id=>id==='attribute'?attribute:null},hasAcademyJob:()=>!!academy.value&&!!job.value};
 vm.createContext(context);
 vm.runInContext(script.slice(start,end),context);
 const check=vm.runInContext("({ access: hasSpecialAccess(), attack: skillDisplayName('〜攻撃') })",context);
 assert.equal(check.access,false);
 assert.equal(check.attack,'〜攻撃');
 for(const [attr,name] of [['火属性','火攻撃'],['風属性','風攻撃'],['水属性','水攻撃']]){
  attribute.value=attr;
  const out=vm.runInContext("({ access: hasSpecialAccess(), attack: skillDisplayName('〜攻撃'), preserved: skillDisplayName('通常攻撃○') })",context);
  assert.equal(out.access,true);assert.equal(out.attack,name);assert.equal(out.preserved,'通常攻撃○');
 }
 job.value='';
 assert.equal(vm.runInContext('hasSpecialAccess()',context),true,'attribute selection alone unlocks specials');
});
test('special abilities cannot change without attribute and calculator includes attribute in its cache',()=>{
 assert(script.includes("if(kind==='special-hint'){if(!hasSpecialAccess())return;"));
 assert(script.includes("if(kind==='special-name'){if(!hasSpecialAccess())return;"));
 assert(script.includes("const locked=!hasSpecialAccess()||isCalculating;"));
 assert(script.includes('specialCard?.classList.toggle(\'is-locked\',specialLocked)'));
 assert(script.includes("const specialReady=hasSpecialAccess();"));
 assert(script.includes("if(!hasSpecialAccess()||isCalculating||special.value===''"));
 assert(script.includes("return [academy.value,job.value,attribute.value,currentCalcMode()"));
 assert(script.includes("if(!hasAttribute()) errs.push('属性を選択してください。');"));
 assert(html.includes("['火属性','風属性','水属性'].includes(attribute.value)"));
 assert(script.includes('pendingPhotoAbilities={data,options:{replace}}'));
});
