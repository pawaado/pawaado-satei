'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
// Execute the shipped module; replace only pixel/OCR boundaries for deterministic regressions.
function setup(){
  const elements=new Map();
  function element(){return {hidden:true,disabled:false,value:'',textContent:'',style:{},dataset:{},children:[],addEventListener(){},setAttribute(){},removeAttribute(){},prepend(){},appendChild(v){this.children.push(v)},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray(4096)}}}}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  let failures=0;
  const c={console:{...console,warn(){}},Uint8Array,Uint8ClampedArray,setTimeout,clearTimeout,atob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Image:class{set src(value){queueMicrotask(()=>{if(failures>0){failures--;this.onerror()}else this.onload()})}},document:{createElement:element,getElementById:get,querySelector:()=>element(),head:element(),documentElement:element(),addEventListener(){}}};
  c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),c);
  let source=process.env.PHOTO_SOURCE?fs.readFileSync(process.env.PHOTO_SOURCE,'utf8'):fs.readFileSync(path.join(root,'photo_import.js'),'utf8');
  const hooks=`
  window.h={jobFromText,profileIdentityOf,dataJobFromHeader,dataJobByIcon,dataJobByHeaderImage,jobNameFromScores,jobNameFromIconScores,byteCorrelation,abilityByImage,classifyMarkCrossingScore,nativeMarkRun,abilityNameExactByImage,isSuperAbilityCellByColor,readAbilityCells,readImages,readTrainingPattern,levelByImage,matchesTemplate,academyOf,academyNameFromScores,cellAbility,findSpecials,classifyTrainingGlyph,classifyTrainingCurrentGlyph,classifyGlyph,decodeMask,digitSequenceToNumber,pairMarkByImage,abilityMasks:HYBRID_ABILITY_MASKS,trainingCurrentDigitMasks:TRAINING_CURRENT_DIGIT_MASKS,trainingGainColorMasks:TRAINING_GAIN_COLOR_MASKS,hybridLevelMasks:HYBRID_LEVEL_MASKS,
   stubReads(){matchesTemplate=async(im,name)=>name==='modal'?im.kind==='data':name==='basic';academyOf=async im=>im.academy||'パワフルアカデミー';profileIdentityOf=async im=>({job:im.dataJob||''});basicByImageStrict=()=>50;readAbilityCells=async im=>({specials:[],supers:[],warnings:[],explicitPairMarks:im.marks||{},explicitPairConfidence:im.confidence||{}});readTrainingPattern=async im=>im.training||null;jobOf=async im=>({job:im.job||'剣士'});numericRow=async im=>[im.exp??100,100,100,100,100];},
   stubAbilityResults(fn){readAbilityCells=fn;},
   stubDataJobHeader(raw){dataJobByIcon=()=>'';textAt=async()=>({text:raw,confidence:99});},
   stubDataJobScores(scores){grayIconVector=()=>new Uint8Array(256);let i=0;byteMse=()=>Number(scores[i++]??99999);},
   stubAbilityMask(encoded){inkMask=()=>({mask:decodeMask(encoded,64*10),w:64,h:10});},
   stubAbilityExact(fn){abilityNameExactByImage=(image,cell,name)=>fn(name);},
   stubMarkShape(value){markShapeByImage=()=>value;},
   stubPairMark(value){pairMarkByImage=()=>value;},
   stubDataHeaderMask(encoded){inkMask=()=>({mask:decodeMask(encoded,96*16),w:96,h:16});},
   stubTrainingCurrent(values){looksLikeTrainingScreen=async()=>true;trainingCurrentNumberByImage=(image,row)=>values[row]??null;trainingNumber=async()=>{throw Error('current EXP OCR fallback must not run');};trainingBubblePresent=()=>false;trainingGainNumberByImage=()=>null;},
   stubTrainingGains(presentFn,valueFn,colorFn=()=>null,ratioFn=()=>0){trainingBubblePresent=presentFn;trainingGainNumberByImage=valueFn;trainingGainColorNumber=colorFn;trainingBubbleRatio=ratioFn;},
   stubFastPairCell(name,stem,mark){let calls=0;abilityCells=()=>[{rect:[0,0,136,34],row:1,col:1,superCell:false}];elementalAttackByImage=()=>'';abilityByImage=()=>name;pairStemByImage=()=>stem;markShapeByImage=()=>mark;collectSpecialReads=async()=>{calls++;return[];};return ()=>calls;},
   stubAbilityChoice(normalName,elementalName){abilityCells=()=>[{rect:[0,0,136,34],row:1,col:1,superCell:false}];abilityByImage=()=>normalName;elementalAttackByImage=()=>elementalName;},
   stubOneAbilityCell(){abilityCells=()=>[{rect:[0,0,136,34],row:1,col:1,superCell:false}];elementalAttackByImage=()=>'';},
   stubOneSuperAbilityCell(row=3,col=2,level=1){abilityCells=()=>[{rect:[0,0,136,34],row,col,superCell:true}];elementalAttackByImage=()=>'';levelByImage=()=>level;},
   stubOneRawAbilityCell(row=1,col=1){abilityCells=()=>[{rect:[0,0,136,34],row,col,superCell:false}];},
   stubPairCandidateCell(stem,mark){abilityCells=()=>[{rect:[0,0,136,34],row:2,col:3,superCell:false}];abilityByImage=()=>'';elementalAttackByImage=()=>'';collectSpecialReads=async()=>[{text:stem,label:'test'}];hybridPairStem=()=>({stem,candidate:true});pairStemByImage=()=>stem;markShapeByImage=()=>'';pairMarkByImage=()=>mark;},
   stubGlyph(value='',width=10){glyphComponents=()=>[{w:width,h:15,x:10}];classifyGlyph=()=>value;},
   stubPixels(){canvasCrop=()=>({});vector=()=>new Uint8ClampedArray(4096);},
   stubAbilityPixels(pixels){canvasCrop=()=>({getContext(){return {}}});},
   prepareUi(read,finishedWorker){files=[{name:'a.png',size:1}];urls=['blob:test'];selectionDirty=true;readImages=read;worker=finishedWorker;},
   busy:()=>busy};
`;
  source=source.replace(/\}\)\(\);\s*$/,hooks+'})();');vm.runInContext(source,c);
  return {c,h:c.h,get,failImages:n=>failures=n};
}
test('OCR recognizes 双剣士 before the substring 剣士',()=>{
 const {h}=setup();for(const job of ['剣士','双剣士','重戦士','魔闘士','魔法使い','弓使い','僧侶'])assert.equal(h.jobFromText('ジョブ '+job).job,job);
});
test('ability data job icon fills job',async()=>{
 const {h}=setup();h.stubReads();
 const r=await h.readImages([{kind:'data',dataJob:'重戦士'},{job:'重戦士',exp:100}]);
 assert.equal(r.job,'重戦士');
});
test('near-exact data job icon is accepted even when the second-place margin is narrow',()=>{
 const {h}=setup();h.stubDataJobScores([100,150,900,900,900,900,900]);
 assert.equal(h.dataJobByIcon({}),'重戦士');
});
test('job-specific mark stays readable after brightness changes by correlation',()=>{
 const {h}=setup();
 assert.equal(h.jobNameFromIconScores(
  [{job:'重戦士',error:1006,corr:1.0},{job:'魔闘士',error:1275,corr:.88}],
  [{job:'重戦士',error:1006,corr:1.0},{job:'魔闘士',error:1275,corr:.88}]
 ),'重戦士');
});
test('ambiguous job-specific mark is not guessed',()=>{
 const {h}=setup();
 assert.equal(h.jobNameFromIconScores(
  [{job:'剣士',error:850,corr:.965},{job:'魔法使い',error:860,corr:.958}],
  [{job:'剣士',error:850,corr:.965},{job:'魔法使い',error:860,corr:.958}]
 ),'');
});
test('job candidate remains deterministic across crop-drift scoring',()=>{
 const {h}=setup();
 assert.equal(h.jobNameFromScores([{job:'重戦士',error:110},{job:'剣士',error:155}]),'重戦士');
 assert.equal(h.jobNameFromScores([{job:'重戦士',error:500},{job:'剣士',error:900}]),'重戦士');
});
test('near-exact academy crop is accepted despite a narrow score ratio',()=>{
 const {h}=setup();
 assert.equal(h.academyNameFromScores([
  {name:'パワフルアカデミー',error:250},
  {name:'タテレスキュアアカデミー',error:310}
 ]),'パワフルアカデミー');
});
test('ability data falls back to the visible header job text when icon comparison misses',async()=>{
 const {h}=setup();h.stubDataJobHeader('重戦士');
 assert.equal((await h.profileIdentityOf({})).job,'重戦士');
});
test('IMG_1009 data-screen header image identifies 重戦士 before OCR',()=>{
 const {h}=setup();
 h.stubDataHeaderMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/f/B4AAAAAAAAAAP7f/h4AAAAAAAAAAcH/XhYAAAAAAAAAAYA+X/fgAAAAAAAAAfP9BwBgAAAA8AAAAJN4fwBgAAAAwAAAAJN9b/fgAAAAAAAAAPP4ZhYAAAAAAAAAAYB97/fAAAAAAAAAAfPwA/PgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
 assert.equal(h.dataJobByHeaderImage({}),'重戦士');
});
test('IMG_1009 physical defense circle cell is accepted by image comparison',()=>{
 const {h}=setup();
 h.stubAbilityMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAfewoA4AAD/f9/3/PwAAP833/fdzgAA7z/d9/2GAAB/P9/23YIAgP8337d9hgCA/z/ft/zOAI=');
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'物理防御○');
});
test('all ability image masks are valid base64',()=>{
 const {h}=setup();
 for(const [name,raw] of Object.entries(h.abilityMasks)){
  for(const encoded of (Array.isArray(raw)?raw:[raw])) assert.doesNotThrow(()=>atob(encoded),name);
 }
});
test('all special abilities are already covered by the shared image-template database',()=>{
 const {h,c}=setup();
 const missing=[];
 for(const row of c.PAWAADO_DATA.special){
  const name=row[1];
  if(name==='〜攻撃'){
   for(const elemental of ['火攻撃','風攻撃','水攻撃'])if(!h.abilityMasks[elemental])missing.push(elemental);
  }else if(!h.abilityMasks[name])missing.push(name);
 }
 assert.deepEqual(missing,[]);
});
test('super ability name and Lv are recognized independently',()=>{
 const {h}=setup();
 const superOnly=h.cellAbility('不滅','',true);
 assert.equal(superOnly.supers[0]?.name,'不滅');
 assert.equal(superOnly.supers[0]?.level,null);
 const lv2='A/A/BjABAJAcB5AxBzBGIM8PmBmAmBZ/';
 const lv1='B/B/HH+BwBwB/BPBHBHBHBHBHBHBB/A4';
 assert.equal(h.classifyGlyph({mask:h.decodeMask(lv2,12*16),w:12,h:16},h.hybridLevelMasks,.23),'2');
 assert.equal(h.classifyGlyph({mask:h.decodeMask(lv1,12*16),w:12,h:16},h.hybridLevelMasks,.23),'1');
 assert.equal(h.abilityMasks['不滅Lv2'],undefined);
 assert.equal(h.abilityMasks['加護Lv1'],undefined);
});
test('IMG_1012 加護 Lv1 uses the generic Lv digit template, not a combined name+Lv template',()=>{
 const {h}=setup();
 const lv1='A+A+DjHD4D4DIDPDHCDCDCDCDCDCDiD+';
 assert(h.hybridLevelMasks['1'].includes(lv1));
 assert.equal(h.classifyGlyph({mask:h.decodeMask(lv1,12*16),w:12,h:16},h.hybridLevelMasks,.23),'1');
 assert.equal(h.abilityMasks['加護Lv1'],undefined);
});
test('IMG_1012 long 対ドラゴンタートル○ prefers the exact ○ cell template',()=>{
 const {h}=setup();
 const circle='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABnP4gAAf5tAG4/jgPx/n+AbAAGAHH8QYBmP4BgYfxzAMYBgODhfjMM=';
 h.stubAbilityMask(circle);
 assert.equal(h.pairMarkByImage({}, {rect:[0,0,136,34]}, '対ドラゴンタートル'),'○');
});
test('IMG_1037 exact masks recognize 柔軟な体・風耐性・無耐性・列回復◎',()=>{
 const {h}=setup();
 const cases=[
  ['柔軟な体','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/DMGAmAAAAB8f9/GYAAAAf5/3+f4AAAB/n+MRvAAAACYe4zG8AAQAf97m+f4ADAAfDee5/gAM='],
  ['風耐性','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+fMzAAAAAAP583eAAAAAA/n3f8AAAAAD+fN/AAAAAAP5/3eAAAgAA/n3N4AACAACffMzAAAI='],
  ['無耐性','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgPsRAAAAAAP8+1/AAAAAA/z/X8AAAAAD/PtdAAAAAAH8/1fAAAgAA/z/F8AACAAD/PsTAAAI='],
  ['列回復◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/v+f4+AAAAHu/7/FcAAAAe7/n+pwAAAB7vef5AgAAAHu97/kCAAgAO7/n8owACABxuOfx1AAI=']
 ];
 for(const [name,encoded] of cases){
   h.stubAbilityMask(encoded);
   assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),name,name);
   assert.equal(h.abilityNameExactByImage({}, {rect:[0,0,136,34],superCell:false},name),true,name+' exact');
 }
});
test('IMG_1037 柔軟な体 exact image does not leave a candidate warning',async()=>{
 const {h}=setup();
 h.stubOneRawAbilityCell(1,4);
 h.stubAbilityMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/DMGAmAAAAB8f9/GYAAAAf5/3+f4AAAB/n+MRvAAAACYe4zG8AAQAf97m+f4ADAAfDee5/gAM=');
 const r=await h.readAbilityCells({},2);
 assert(r.specials.includes('柔軟な体'));
 assert(!r.warnings.some(w=>w.includes('柔軟な体')));
});
test('IMG_1037 列回復◎ exact full-cell name is not overwritten as 列攻撃◎',async()=>{
 const {h}=setup();
 h.stubOneRawAbilityCell(3,2);
 h.stubAbilityMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/v+f4+AAAAHu/7/FcAAAAe7/n+pwAAAB7vef5AgAAAHu97/kCAAgAO7/n8owACABxuOfx1AAI=');
 const r=await h.readAbilityCells({},2);
 assert(r.specials.includes('列回復◎'));
 assert(!r.specials.includes('列攻撃◎'));
});
test('IMG_1037 風耐性 exact image is not replaced by ～攻撃 fallback',async()=>{
 const {h}=setup();
 h.stubOneRawAbilityCell(2,2);
 h.stubAbilityMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+fMzAAAAAAP583eAAAAAA/n3f8AAAAAD+fN/AAAAAAP5/3eAAAgAA/n3N4AACAACffMzAAAI=');
 const r=await h.readAbilityCells({},2);
 assert(r.specials.includes('風耐性'));
 assert(!r.specials.includes('〜攻撃'));
});
test('IMG_1049 long gold cells stay in the super-ability path',()=>{
 const {h}=setup();
 assert.equal(h.isSuperAbilityCellByColor(30),true);
 assert.equal(h.isSuperAbilityCellByColor(37),true);
 assert.equal(h.isSuperAbilityCellByColor(0),false);
});
test('IMG_1049 exact masks recognize 火事場の馬鹿力 and 回復効果◎',()=>{
 const {h}=setup();
 const cases=[
  ['火事場の馬鹿力','AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABh/L4Yf38MAWn89nx4fz8Baf3+/n5/P4Fp+P7afn8JgGB8/rJ/fxmI=',true],
  ['回復効果◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8fz0P4bAAAwT/P8/iqAAD9P8/zeEQAAPU/3/P5AAAA/TfO9/0AAI=',false]
 ];
 for(const [name,encoded,superCell] of cases){
   h.stubAbilityMask(encoded);
   assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell}),name,name);
   assert.equal(h.abilityNameExactByImage({}, {rect:[0,0,136,34],superCell},name),true,name+' exact');
 }
});
test('IMG_1049 火事場の馬鹿力 Lv1 is entered instead of only warned',async()=>{
 const {h}=setup();
 h.stubOneSuperAbilityCell(3,2);
 h.stubAbilityMask('AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABh/L4Yf38MAWn89nx4fz8Baf3+/n5/P4Fp+P7afn8JgGB8/rJ/fxmI=');
 const r=await h.readAbilityCells({},4);
 assert.equal(r.supers.find(x=>x.name==='火事場の馬鹿力')?.level,1);
 assert(!r.warnings.some(w=>w.includes('火事場の馬鹿力')));
});
test('IMG_1049 回復効果◎ exact cell does not leave a 回復効果○ warning',async()=>{
 const {h}=setup();
 h.stubOneRawAbilityCell(4,3);
 h.stubAbilityMask('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8fz0P4bAAAwT/P8/iqAAD9P8/zeEQAAPU/3/P5AAAA/TfO9/0AAI=');
 const r=await h.readAbilityCells({},4);
 assert(r.specials.includes('回復効果◎'));
 assert(!r.warnings.some(w=>w.includes('回復効果○')));
});
test('IMG_1038 exact mask recognizes 対僧侶◎ and not 対植物◎',()=>{
 const {h}=setup();
 const priestDouble='AAAAAAAAAAAAAAAAAAAAAAAIZvH8JAAAAB5n+fxjAAAAP+/7fPcAAAAV7/t8YIAAAB3n+zhAgAIADef5fiMAAgAeZ/lG9QACAB7n+X5iAAI=';
 h.stubAbilityMask(priestDouble);
 const got=h.abilityByImage({}, {rect:[0,0,136,34],superCell:false});
 assert.equal(got,'対僧侶◎');
 assert.notEqual(got,'対植物◎');
});
test('IMG_1039 exact mask recognizes 通常回復◎',()=>{
 const {h}=setup();
 const normalRecovery='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF8Kj/FgAAAA/z/v8/yCAAAfv+/TfKUAAP+/79H8AAAA/5/PU3wAAE=';
 h.stubAbilityMask(normalRecovery);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'通常回復◎');
});
test('IMG_1040 exact mask recognizes 火回復',()=>{
 const {h}=setup();
 const fire='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGD/F8AAAAADbP8/wAAAAANsvz/AAAAAAWy/P8AAAAAAcK93wAAI=';
 h.stubAbilityMask(fire);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'火回復');
});
test('IMG_1020 exact masks recognize 火耐性・バランス感覚・風回復・水回復',()=>{
 const {h}=setup();
 const cases=[
  ['火耐性','AAAAAAAAAAAAABh+zMAAAAAA237f8AAAAADbP9/wAAAAANo+38AAAAAAHD/d8AACAAA8P83gAAIAAOc+zMAAAgAAwz/P8AACAAAAAAAAAAI='],
  ['バランス感覚','AAAAAAAAAAABwAAAAH+aQBuP44D8f5/gGwABgBx/GGAZj+AYGH8fwDGAYDg4X47DMYDg8HwNj8MxwcPg7nePw2DDg4HGX53hAAAAAAAAAAE='],
  ['風回復','AAAAAAAAAAAAAP4/zfAAAAAA/j/P8AAAAAD+L8/wAAAAAP4rz/AAAAAA/ivd8AACAAD/L8/wAAIAAP8/z+AAAgAAvz/P8AACAAAAAAAAAAI='],
  ['水回復','AAAAAAAAAAAAAAw/x/AAAAAAbT/PgAAAAAD/P0/wAAAAAD49T/AAAAAAfj1N8AADAABvP0/wAAMAAN+/xfAAAwAAGD/F8AABAAAAAAAAAAE=']
 ];
 for(const [name,encoded] of cases){
   h.stubAbilityMask(encoded);
   assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),name,name);
 }
});
test('IMG_1096 fire-recovery real mask is recognized',()=>{
 const {h}=setup();
 const fire='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABh/z/AAAAAA22Df4AAAAADbf8/gAAAAANp73+AAAAAAPH/fgAACAAB+f8/gAAI=';
 h.stubAbilityMask(fire);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'火回復');
});
test('IMG_1096/1097 verified pair cells keep their confirmed ◎ labels',()=>{
 const cases=[
  ['通常攻撃◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3x+Og7zMAADPP9/37OoAAB8/xbe9RgAA3xmFt7yBAADfH4Tj+IEAgFc/zuBhRgCA/zff9/yqAI='],
  ['対ドラゴンタートル◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQAAAIAQEADpB55h4BBQAP0AAmGgEFAA6ceCC6+cUAB54IIY755cAnkhgjhAElgCaQMecMAQ2AI='],
  ['通常回復◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXx/P8/xGAABfP+wT/KcAAB+/79HsRQAA/5/PU/wAAAB/n4/TcAAAwH+/z9P8JQDA/7bP8TjCAM='],
  ['列回復◎','AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/v+f5GAAAAGOwb/GUAAAAe7/n+owAAAB7ve/5AgAAAHu97/ECAAgAO7/n8pwACABzv+bxTAAI=']
 ];
 for(const [name,encoded] of cases){
   const {h}=setup();
   h.stubAbilityMask(encoded);
   assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),name,name);
   const stem=name.slice(0,-1);
   assert.equal(h.pairMarkByImage({}, {rect:[0,0,136,34]},stem),'◎',name);
 }
});
test('fragmentary unrelated ability masks stay removed',()=>{
 const {h}=setup();
 const variants=h.abilityMasks['生存本能'];
 assert(Array.isArray(variants)&&variants.length===4);
 for(const encoded of variants){
   const ink=[...h.decodeMask(encoded,64*10)].reduce((a,b)=>a+b,0);
   assert(ink>=100,'template mask too sparse: '+ink);
 }
});
test('IMG_1076 対ドラゴンタートル◎ wins before 生存本能 OCR fallback',async()=>{
 const double='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQeCAIAQEADtB55h4BBQAP2AAmEgGFAA6ceCC6+cUAB54IIY755cAnkBgjBAEFgC6QMecMAQ2AI=';
 const {h}=setup();
 h.stubOneRawAbilityCell(3,3);
 h.stubAbilityMask(double);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'対ドラゴンタートル◎');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('対ドラゴンタートル○'));
 assert(r.specials.includes('対ドラゴンタートル◎'));
 assert(!r.specials.includes('生存本能'));
 assert.equal(r.explicitPairMarks['対ドラゴンタートル'],'◎');
 assert(!r.warnings.some(w=>w.includes('対ドラゴンタートル')||w.includes('生存本能')));
});
test('対ドラゴンタートル○/◎ exact template sets do not share IMG_1076 masks',()=>{
 const {h}=setup();
 const photo=fs.readFileSync(path.join(root,'photo_import.js'),'utf8');
 const get=key=>{
   const m=photo.match(new RegExp('["\\\']'+key+'["\\\']\\s*:\\s*\\[([^\\]]*)\\]'));
   assert(m,key);
   return [...m[1].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
 };
 const circle=get('対ドラゴンタートル○'),double=get('対ドラゴンタートル◎');
 assert.deepEqual(circle.filter(x=>double.includes(x)),[]);
});
test('IMG_1021 バランス感覚 is not substituted with 対ドラゴンタートル○',async()=>{
 const {h}=setup();
 const balance='AAAAAAAAAAABwAAAAH+aQBuP44D8f5/gGwABgBx/GGAZj+AYGH8fwDGAYDg4X47DMYDg8HwNj8MxwcPg7nePw2DDg4HGX53hAAAAAAAAAAE=';
 h.stubOneAbilityCell();
 h.stubAbilityMask(balance);
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('バランス感覚'));
 assert(!r.specials.includes('対ドラゴンタートル○'));
});
test('general ability match outranks elemental-attack shortcut',async()=>{
 const {h}=setup();
 h.stubAbilityChoice('火耐性','火攻撃');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('火耐性'));
 assert(!r.specials.includes('〜攻撃'));
});
test('native mark crossing score separates IMG_1090 ○ and IMG_1092 ◎ observations',()=>{
 const {h}=setup();
 assert.equal(h.classifyMarkCrossingScore([1.86,1.86,2.00]),'○');
 assert.equal(h.classifyMarkCrossingScore([2.93,3.29,3.50]),'◎');
 assert.equal(h.classifyMarkCrossingScore([2.45,2.55,2.60]),'');
});

test('native mark locator ignores the saturated blue cell border',()=>{
 const {h}=setup();
 const width=136,height=34,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;data[i]=230;data[i+1]=248;data[i+2]=252;data[i+3]=255;
 }
 for(let y=12;y<31;y++)for(let x=96;x<112;x++){
   const i=(y*width+x)*4;data[i]=75;data[i+1]=75;data[i+2]=75;
 }
 for(let y=11;y<31;y++)for(let x=121;x<128;x++){
   const i=(y*width+x)*4;data[i]=35;data[i+1]=70;data[i+2]=220;
 }
 const canvas={width,height,getContext:()=>({getImageData:()=>({data})})};
 assert.deepEqual(Array.from(h.nativeMarkRun(canvas,width,195)),[96,112]);
});
test('source-resolution mark overrides a wrong full-cell ○/◎ rank generically',async()=>{
 const {h}=setup();
 h.stubAbilityChoice('アクションスキル○','');
 h.stubAbilityExact(name=>name==='アクションスキル◎');
 h.stubMarkShape('◎');
 h.stubPairMark('');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('アクションスキル○'));
 assert(r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
});
test('source-resolution ○ can also correct a wrong ◎ rank without action-specific logic',async()=>{
 const {h}=setup();
 h.stubAbilityChoice('物理防御◎','');
 h.stubAbilityExact(name=>name==='物理防御○');
 h.stubMarkShape('○');
 h.stubPairMark('');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('物理防御○'));
 assert(!r.specials.includes('物理防御◎'));
 assert.equal(r.explicitPairMarks['物理防御'],'○');
});
test('IMG_1080 アクションスキル◎ cannot stay as ○ when the same-name ◎ template confirms it',async()=>{
 const {h}=setup();
 const double='AAAAAAAAAAAAQQAAACAgAHz5gBw8OOAADPiHjAR44AAdkyCBDDDgADmxZ4MMPPgCIDDnhxz9+AIgYcCOPhHwAmDBh4wyEWACAAAAAAAAAAI=';
 h.stubAbilityChoice('アクションスキル○','');
 h.stubAbilityMask(double);
 h.stubAbilityExact(name=>name==='アクションスキル○'||name==='アクションスキル◎');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
});
test('IMG_1088 keeps アクションスキル◎ while 対ドラゴンタートル stays ○',()=>{
 const actionDouble='AAAAAAAAAAIAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAQQAAACBgAHz5gBw8OOAADPiHjAT84AA9kyCBjDDgADmxZ4MMPPgCMDDnhxz9+AI=';
 const {h:action}=setup();
 action.stubAbilityMask(actionDouble);
 assert.equal(action.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'アクションスキル◎');
 assert.equal(action.pairMarkByImage({}, {rect:[0,0,136,34]}, 'アクションスキル'),'◎');

 const turtleCircle='AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQeCAYAQIcD5B77B4BBj4PkABkMgEGNgyc+CC++cYiDZ4YIYz57qIlkBBjDAEvti6QM+YcAQs+I=';
 const {h:turtle}=setup();
 turtle.stubAbilityMask(turtleCircle);
 assert.equal(turtle.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'対ドラゴンタートル○');
 assert.equal(turtle.pairMarkByImage({}, {rect:[0,0,136,34]}, '対ドラゴンタートル'),'○');
});
test('IMG_1090 real action-skill circle stays ○',async()=>{
 const circle='AAAAAAAAAAAAAAAAAAAAAHzBABg8IGHAfPGEHDx44+AMkgeIDPjiYDmTIIEMMOogODFngwx9+iIgYMCGHPnyYmDjh5w2EXPiYMEHiCIRYcI=';
 const {h}=setup();
 h.stubOneRawAbilityCell();
 h.stubAbilityMask(circle);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'アクションスキル○');
 assert.equal(h.pairMarkByImage({}, {rect:[0,0,136,34]}, 'アクションスキル'),'○');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('アクションスキル○'));
 assert(!r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'○');
});
test('IMG_1092 real action-skill double-circle stays ◎',async()=>{
 const double='AAAAAAAAAAAAAAAAAAAAAHzBABg8IGAAfPGFHDx44AAMkgeIDPjgADmTIIEMMOgAODFngwx9+AIgYMCGHPnwAmDjh5w2EXACYMEHiCIRYAI=';
 const {h}=setup();
 h.stubOneRawAbilityCell();
 h.stubAbilityMask(double);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:false}),'アクションスキル◎');
 assert.equal(h.pairMarkByImage({}, {rect:[0,0,136,34]}, 'アクションスキル'),'◎');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('アクションスキル○'));
 assert(r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
});
test('IMG_1088 native ◎ shape wins even when same-name pair comparison is ambiguous',async()=>{
 const {h}=setup();
 h.stubAbilityChoice('アクションスキル○','');
 h.stubAbilityExact(name=>name==='アクションスキル◎');
 // Safari/JPEG差で同名○/◎比較が未確定でも、元画像の記号形状を正本にする。
 h.stubMarkShape('◎');
 h.stubPairMark('');
 const r=await h.readAbilityCells({},1);
 assert(r.specials.includes('アクションスキル○'));
 assert(r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
});
test('アクションスキル○/◎ exact template sets have no identical masks',()=>{
 const {h}=setup();
 const photo=fs.readFileSync(path.join(root,'photo_import.js'),'utf8');
 const get=key=>{
   const m=photo.match(new RegExp('["\\\']'+key+'["\\\']\\s*:\\s*\\[([^\\]]*)\\]'));
   assert(m,key);
   return [...m[1].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
 };
 const c=get('アクションスキル○'),d=get('アクションスキル◎');
 assert.deepEqual(c.filter(x=>d.includes(x)),[]);
});
test('resolved explicit pair mark suppresses stale candidate warning',async()=>{
 const {h}=setup();
 h.stubPairCandidateCell('アクションスキル','◎');
 const r=await h.readAbilityCells({},3);
 assert(r.specials.includes('アクションスキル◎'));
 assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
 assert(!r.warnings.some(w=>w.includes('アクションスキル◎')&&w.includes('取得状態')));
});
test('high-confidence circle/double-circle image matches skip redundant OCR',async()=>{
 const {h}=setup();
 const calls=h.stubFastPairCell('物理防御○','物理防御','○');
 const r=await h.readAbilityCells({},1);
 assert.equal(calls(),0);
 assert(r.specials.includes('物理防御○'));
});
test('cross-image ○/◎ disagreement never exports a null authoritative mark',async()=>{
 const {h}=setup();h.stubReads();
 const r=await h.readImages([
  {kind:'data',dataJob:'魔法使い',marks:{'列回復':'○'}},
  {kind:'data',dataJob:'魔法使い',marks:{'列回復':'◎'}},
  {kind:'data',dataJob:'魔法使い',marks:{'列回復':'◎'}}
 ]);
 assert.equal(Object.prototype.hasOwnProperty.call(r.explicitPairMarks,'列回復'),false);
 assert(r.warnings.some(w=>w.includes('列回復')&&w.includes('画像間で一致しません')));
});
test('a verified pair mark outranks an unverified conflicting duplicate screenshot without warning',async()=>{
  const {h}=setup();h.stubReads();
  const r=await h.readImages([
    {kind:'data',dataJob:'魔法使い',marks:{'アクションスキル':'◎','対ドラゴンタートル':'○','列回復':'○'},confidence:{'アクションスキル':true,'対ドラゴンタートル':true,'列回復':true}},
    {kind:'data',dataJob:'魔法使い',marks:{'アクションスキル':'○','対ドラゴンタートル':'◎','列回復':'◎'}},
    {kind:'data',dataJob:'魔法使い',marks:{'列回復':'○'}}
  ]);
  assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
  assert.equal(r.explicitPairMarks['対ドラゴンタートル'],'○');
  assert.equal(r.explicitPairMarks['列回復'],'○');
  assert(!r.warnings.some(w=>w.includes('画像間で一致しません')));
});
test('a verified-vs-verified pair conflict still warns and stays unresolved',async()=>{
  const {h}=setup();h.stubReads();
  const r=await h.readImages([
    {kind:'data',dataJob:'魔法使い',marks:{'列回復':'○'},confidence:{'列回復':true}},
    {kind:'data',dataJob:'魔法使い',marks:{'列回復':'◎'},confidence:{'列回復':true}}
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(r.explicitPairMarks,'列回復'),false);
  assert(r.warnings.some(w=>w.includes('列回復')&&w.includes('画像間で一致しません')));
});
test('strong evidence arriving after a weak conflicting read still wins',async()=>{
  const {h}=setup();h.stubReads();
  const r=await h.readImages([
    {kind:'data',dataJob:'魔法使い',marks:{'アクションスキル':'○'}},
    {kind:'data',dataJob:'魔法使い',marks:{'アクションスキル':'◎'},confidence:{'アクションスキル':true}}
  ]);
  assert.equal(r.explicitPairMarks['アクションスキル'],'◎');
  assert(!r.warnings.some(w=>w.includes('画像間で一致しません')));
});
test('ability-up job text wins over a conflicting ability-data job icon',async()=>{
 const {h}=setup();h.stubReads();
 const r=await h.readImages([{kind:'data',dataJob:'僧侶'},{job:'剣士',exp:100}]);
 assert.equal(r.job,'剣士');
 assert(r.warnings.some(w=>w.includes('能力アップ画面の文字判定')&&w.includes('優先')));
});
test('readable ability-up job suppresses an unreadable data job-icon warning',async()=>{
 const {h}=setup();h.stubReads();
 const r=await h.readImages([{job:'重戦士',exp:100},{kind:'data',dataJob:''}]);
 assert.equal(r.job,'重戦士');
 assert(!r.warnings.some(w=>w.includes('ジョブを画像から読み取れません')));
});
test('ability data plus training is accepted without an ability-up screenshot',async()=>{
 const {h,get,c}=setup();let importedPhoto=null,importedTraining=null;
 c.__PAWAADO_IMPORT_PHOTO__=data=>{importedPhoto=data;};
 c.__PAWAADO_IMPORT_TRAINING_PHOTOS__=patterns=>{importedTraining=patterns;};
 h.prepareUi(async()=>({
   abilityUpScreens:0,dataScreens:1,academy:'パワフルアカデミー',job:'剣士',
   exp:{},basic:{生命力:50,パワー:50,魔力:50,器用さ:50,耐久力:50,精神力:50},
   specials:[],supers:[],trainingPatterns:[{exp:{筋力:100,敏捷:100,技術:100,知力:100,精神:100}}],warnings:[]
 }),null);
 await get('readPhotos').onclick();
 assert(importedPhoto);assert.equal(importedPhoto.job,'剣士');
 assert(importedTraining);assert.equal(importedTraining.length,1);
 assert.equal(get('photoStatus').textContent,'自動入力しました。');
});
test('training patterns and recognized abilities are still applied when character import needs confirmation',async()=>{
 const {h,get,c}=setup();let importedTraining=null,importedAbilities=null;
 c.__PAWAADO_IMPORT_PHOTO__=()=>{throw Error('アカデミーとジョブを確認してください。');};
 c.__PAWAADO_IMPORT_TRAINING_PHOTOS__=patterns=>{importedTraining=patterns;};
 c.__PAWAADO_IMPORT_ABILITIES_ONLY__=data=>{importedAbilities=data;};
 h.prepareUi(async()=>({
   abilityUpScreens:0,dataScreens:1,academy:'パワフルアカデミー',job:'',
   exp:{},basic:{},
   specials:['物理攻撃○','闘争本能'],
   supers:[{name:'不滅',level:2,confirmed:true},{name:'加護',level:1,confirmed:true}],
   trainingPatterns:[{exp:{筋力:649,敏捷:510,技術:311,知力:295,精神:682}},{exp:{筋力:558,敏捷:420,技術:329,知力:336,精神:601}}],
   warnings:['ジョブを画像から読み取れませんでした。ジョブを確認してください。']
 }),null);
 await get('readPhotos').onclick();
 assert(importedTraining);assert.equal(importedTraining.length,2);
 assert(importedAbilities);assert(importedAbilities.specials.includes('物理攻撃○'));
 assert.equal(importedAbilities.supers.find(x=>x.name==='不滅')?.level,2);
 assert.equal(get('photoStatus').textContent,'自動入力しました。');
 assert.equal(get('photoUncertain').hidden,false);
 assert.doesNotMatch(get('photoStatus').textContent,/失敗/);
});
test('training gain reads one digit at a time and composes arbitrary numbers',()=>{
 const {h}=setup();
 const samples=[
  ['9','H4P8f+f+8P8H4H4H4H8P+Pf/f/P3AHAH'],
  ['1','APA/A/B/P///P/P/A/A/A/A/A/A/A/A/'],
  ['0','DwH8P+f+ef+P8P8H4H4H4H4H4H8H8OYP'],
  ['8','H8P+f/ef8P8PcPePP+f+f/+f8H4H4H4H'],
  ['4','AeA+A+B+B+D+D+HOPOOOeOcOcO////79']
 ];
 for(const [digit,encoded] of samples){
  assert(h.trainingGainColorMasks[digit].includes(encoded),digit);
  assert.equal(h.classifyTrainingGlyph({mask:h.decodeMask(encoded,12*16),w:12,h:16},h.trainingGainColorMasks,.24),digit);
 }
 assert.equal(h.digitSequenceToNumber(['9','1']),91);
 assert.equal(h.digitSequenceToNumber(['9','0']),90);
 assert.equal(h.digitSequenceToNumber(['1','8']),18);
 assert.equal(h.digitSequenceToNumber(['4','1']),41);
 assert.equal(h.digitSequenceToNumber(['1','0']),10);
 assert.equal(h.digitSequenceToNumber(['1','0','5']),105);
});
test('IMG_1006/IMG_1007 mental 591 digits are each covered by exact single-digit templates',()=>{
 const {h}=setup();
 const samples=[
  ['5','f/f/f/cAYA4A98/fcHAHADADYH8Hf/P8'],
  ['9','H4P8OeYHYH4HYHcPPfP/AHAHAHIGP8H4'],
  ['1','A/A/B/////5/A/A/A/A/A/A/A/A/A/A/']
 ];
 for(const [digit,encoded] of samples){
  assert(h.trainingCurrentDigitMasks[digit].includes(encoded),digit);
  assert.equal(h.classifyTrainingGlyph({mask:h.decodeMask(encoded,12*16),w:12,h:16},h.trainingCurrentDigitMasks,.24),digit);
 }
});
test('current EXP distinguishes exact 591-one from exact 307-seven before normalization',()=>{
 const {h}=setup();
 const one='A/A/B/////5/A/A/A/A/A/A/A/A/A/A/';
 const seven='f///f/AOAMAcA4AwBwDwDwDgDgDgDADA';
 assert(h.trainingCurrentDigitMasks['1'].includes(one));
 assert(h.trainingCurrentDigitMasks['7'].includes(seven));
 assert.equal(h.classifyTrainingCurrentGlyph({mask:h.decodeMask(one,12*16),w:8,h:22}),'1');
 const ref=h.decodeMask(seven,12*16),w=15,height=22,mask=new Uint8Array(w*height);
 for(let y=0;y<height;y++)for(let x=0;x<w;x++)mask[y*w+x]=ref[Math.floor(y*16/height)*12+Math.floor(x*12/w)];
 assert.equal(h.classifyTrainingCurrentGlyph({mask,w,h:height}),'7');
});
test('a narrow current-exp glyph can never become 7',()=>{
 const {h}=setup();
 const seven='////APAGAOAMA4A4BwBgDgDgDAHAHAHA';
 // Safari antialiasing can distort the normalized bitmap, but the native width of 1 stays narrow.
 assert.equal(h.classifyTrainingCurrentGlyph({mask:h.decodeMask(seven,12*16),w:8,h:22}),'1');
});
test('IMG_1017 yellow +285 middle digit is classified as 8, not ambiguous 8/6',()=>{
 const {h}=setup();
 const eight='B4H+P/P/eHeHeHPPP/H+P/eHcD8D8D4D';
 assert(h.trainingGainColorMasks['8'].includes(eight));
 assert.equal(h.classifyTrainingGlyph({mask:h.decodeMask(eight,12*16),w:12,h:16},h.trainingGainColorMasks,.24),'8');
});
test('IMG_1017 mental EXP totals 209 + 285 + 198 = 692',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([260,149,103,2,209]);
 h.stubTrainingGains(
   (image,rowY,kind)=>rowY===356,
   (image,rowY,kind)=>kind==='yellow'?285:198
 );
 const r=await h.readTrainingPattern({});
 assert.equal(r.current.精神,209);
 assert.equal(r.gains.精神,483);
 assert.equal(r.exp.精神,692);
});
test('training current EXP never falls back to OCR guessing',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([558,420,311,295,null]);
 const r=await h.readTrainingPattern({});
 assert.equal(r.current.精神,null);
 assert.equal(r.exp.精神,null);
});
test('single-digit current EXP composition keeps mental at 591',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([558,420,311,295,591]);
 const r=await h.readTrainingPattern({});
 assert.equal(r.current.精神,591);
 assert.equal(r.exp.精神,591);
});
test('IMG_1061 faint blue +2 gains are kept from colored digits',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([925,1066,1009,210,581]);
 h.stubTrainingGains(
   (image,rowY,kind)=>kind==='yellow'&&[120,179,356].includes(rowY),
   (image,rowY,kind)=>{
     if(kind!=='yellow')return null;
     return rowY===120?55:rowY===179?47:rowY===356?52:null;
   },
   (image,rowY,kind)=>{
     if(kind!=='blue')return null;
     return rowY===120?3:rowY===179?2:rowY===356?2:null;
   },
   (image,rowY,kind)=>{
     if(kind!=='blue')return 0;
     return rowY===120?.218:rowY===179?.135:rowY===356?.140:0;
   }
 );
 const r=await h.readTrainingPattern({});
 assert.deepEqual({...r.exp},{筋力:983,敏捷:1115,技術:1009,知力:210,精神:635});
});
test('blue-colored false positive is ignored when no bubble-background signal exists',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([100,100,100,100,100]);
 h.stubTrainingGains(
   ()=>false,
   ()=>9,
   (image,rowY,kind)=>kind==='blue'?2:null,
   ()=>0.08
 );
 const r=await h.readTrainingPattern({});
 assert.deepEqual({...r.gains},{筋力:0,敏捷:0,技術:0,知力:0,精神:0});
 assert.deepEqual({...r.exp},{筋力:100,敏捷:100,技術:100,知力:100,精神:100});
});
test('absent blue gain bubble cannot add a ghost +6 to mental EXP',async()=>{
 const {h}=setup();
 // Reproduce the actual failure: yellow is real; the generic blue-number fallback sees background as 6.
 for(const yellowGain of [91,10]){
   h.stubTrainingCurrent([558,420,311,295,591]);
   // Only the mental-row yellow bubble exists; no blue bubble exists.
   h.stubTrainingGains(
     (image,rowY,kind)=>rowY===356&&kind==='yellow',
     (image,rowY,kind)=>kind==='yellow'?yellowGain:6
   );
   const r=await h.readTrainingPattern({});
   assert.equal(r.current.精神,591);
   assert.equal(r.gains.精神,yellowGain);
   assert.equal(r.exp.精神,591+yellowGain);
 }
});
test('IMG_1006/IMG_1007 mental 591 final digit is locked to 1',()=>{
 const {h}=setup();
 const encoded='A/A/B/////5/A/A/A/A/A/A/A/A/A/A/';
 assert(h.trainingCurrentDigitMasks['1'].includes(encoded));
 const mask=h.decodeMask(encoded,12*16);
 assert.equal(h.classifyTrainingGlyph({mask,w:12,h:16},h.trainingCurrentDigitMasks,.20),'1');
});
test('a third screenshot cannot erase an EXP conflict',async()=>{
 const {h}=setup();h.stubReads();const r=await h.readImages([{job:'剣士',exp:100},{job:'剣士',exp:200},{job:'剣士',exp:100}]);assert.equal(r.job,'剣士');assert.equal(r.exp.筋力,null);assert(r.warnings.some(w=>w.includes('一致しません')));
});
test('a third screenshot cannot erase conflicting ○/◎ observations',async()=>{
 const {h}=setup();h.stubReads();const r=await h.readImages(['○','◎','○'].map(mark=>({kind:'data',marks:{通常攻撃:mark}})));assert.equal(Object.prototype.hasOwnProperty.call(r.explicitPairMarks,'通常攻撃'),false);
});
test('unrecognized glyph width does not fabricate a Lv, and supers stay within Lv1–2',()=>{
 const {h}=setup();h.stubGlyph('',10);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);h.stubGlyph('6',14);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);assert.equal(h.levelByImage({}, {rect:[0,0]},6),6);
});
test('a resolved super Lv from one screenshot suppresses an unresolved duplicate warning',async()=>{
 const {h}=setup();h.stubReads();
 h.stubAbilityResults(async im=>({
   specials:[],
   supers:[{name:'加護',level:im.good?1:null,confirmed:true}],
   warnings:[],
   explicitPairMarks:{}
 }));
 const r=await h.readImages([{kind:'data',good:true},{kind:'data',good:false}]);
 assert.equal(r.supers.find(x=>x.name==='加護')?.level,1);
 assert(!r.warnings.some(w=>w.includes('加護')&&w.includes('Lv')));
});
test('super Lv warning is emitted only when all screenshots fail to resolve it',async()=>{
 const {h}=setup();h.stubReads();
 h.stubAbilityResults(async()=>({
   specials:[],
   supers:[{name:'加護',level:null,confirmed:true}],
   warnings:[],
   explicitPairMarks:{}
 }));
 const r=await h.readImages([{kind:'data'},{kind:'data'}]);
 assert.equal(r.supers.find(x=>x.name==='加護')?.level,null);
 assert(r.warnings.some(w=>w.includes('加護のLvを読み取れませんでした')));
});
test('super abilities are exact-only and never guessed from near text',()=>{
 const {h}=setup();
 const exact=h.cellAbility('対魔の盾','',true);
 assert.equal(exact.supers.length,1);
 assert.equal(exact.supers[0].name,'対魔の盾');
 assert.equal(exact.supers[0].confirmed,true);
 const near=h.cellAbility('対魔の楯','',true);
 assert.equal(near.supers.length,0);
 assert.equal(near.candidate,true);
 assert.equal(near.suggestedSuper,'対魔の盾');
 const fakeRetsu=h.cellAbility('珠','',true);
 assert.equal(fakeRetsu.supers.length,0);
});
test('IMG_1052/1059 HP-dependent supers are recognized as confirmed super names',()=>{
 const {h}=setup();
 for(const name of ['タフネス','そよかぜの加護','大真面目']){
  const r=h.cellAbility(name,'',true);
  assert.equal(r.supers.length,1,name);
  assert.equal(r.supers[0].name,name);
  assert.equal(r.supers[0].confirmed,true);
 }
});
test('IMG_1052/1059 exact masks recognize タフネス・そよかぜの加護・大真面目',()=>{
 const cases=[
  ['タフネス','AAAAAAAAAAAAAAAAAAAAAAAAYF8DAAAAAAA/n+fx+AAAAAxgMfwGAAAAB7gMDgOAAAAAfAcPwcAAIAAHA4/4+AAIAAeBwTZ3AAIAA4DgDBjgAIA='],
  ['そよかぜの加護','AAAAAAAAAAAAAAAAAAAAAAYgQMCcMM7/ANgefnc/P7+ALAc/v9/P7+AfwQb2ZtP7+AXD4byZ5P7+EED+yCB7P7+EHj22D4/P7uEHjw+D4WO7+EA='],
  ['大真面目','AAAAAAAAAAAAAAAAAAAAAAAAMH+/5/AAAAAcH8HBjAAAAB/mMfx/AAAAAMGMXR/AAAAAeH8XR/AAIAA/H+XR/AAIABzn+fx/AAIABhnOfx/AAIA=']
 ];
 for(const [name,encoded] of cases){
  const {h}=setup();h.stubAbilityMask(encoded);
  assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:true}),name,name);
 }
});
test('IMG_1052/1059 confirmed HP-dependent supers keep their Lv and do not become warnings',async()=>{
 const cases=[
  ['タフネス','AAAAAAAAAAAAAAAAAAAAAAAAYF8DAAAAAAA/n+fx+AAAAAxgMfwGAAAAB7gMDgOAAAAAfAcPwcAAIAAHA4/4+AAIAAeBwTZ3AAIAA4DgDBjgAIA='],
  ['そよかぜの加護','AAAAAAAAAAAAAAAAAAAAAAYgQMCcMM7/ANgefnc/P7+ALAc/v9/P7+AfwQb2ZtP7+AXD4byZ5P7+EED+yCB7P7+EHj22D4/P7uEHjw+D4WO7+EA='],
  ['大真面目','AAAAAAAAAAAAAAAAAAAAAAAAMH+/5/AAAAAcH8HBjAAAAB/mMfx/AAAAAMGMXR/AAAAAeH8XR/AAIAA/H+XR/AAIABzn+fx/AAIABhnOfx/AAIA=']
 ];
 for(const [name,encoded] of cases){
  for(const level of [1,2]){
   const {h}=setup();h.stubOneSuperAbilityCell(1,1,level);h.stubAbilityMask(encoded);
   const r=await h.readAbilityCells({},1);
   assert.equal(r.supers.find(x=>x.name===name)?.level,level,name+' Lv.'+level);
   assert(!r.warnings.some(w=>w.includes(name)),name+' Lv.'+level);
  }
 }
});
test('IMG_1064 鉄壁の盾 is recognized as a confirmed variable-score super',()=>{
 const {h}=setup();
 const r=h.cellAbility('鉄壁の盾','',true);
 assert.equal(r.supers.length,1);
 assert.equal(r.supers[0].name,'鉄壁の盾');
 assert.equal(r.supers[0].confirmed,true);
});
test('IMG_1064 exact mask recognizes 鉄壁の盾 and keeps Lv2',async()=>{
 const iron='AAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHcf4AP8AAAA/5/j8/gAAAB/nefz/gAAAH8/7Nv8AAAAf5/tm8wACAB3H827/AAI=';
 const {h}=setup();h.stubOneSuperAbilityCell(2,2,2);h.stubAbilityMask(iron);
 assert.equal(h.abilityByImage({}, {rect:[0,0,136,34],superCell:true}),'鉄壁の盾');
 const r=await h.readAbilityCells({},1);
 assert.equal(r.supers.find(x=>x.name==='鉄壁の盾')?.level,2);
 assert(!r.warnings.some(w=>w.includes('鉄壁の盾')));
});
test('ignored gold abilities never become variable-score supers',()=>{
 const {h}=setup();
 for(const name of ['魔族キラー','剛力']){
  const r=h.cellAbility(name,'',true);
  assert.equal(r.supers.length,0,name);
  assert.equal(r.candidate,false,name);
 }
});
test('template downloads recover after one failed request',async()=>{
 const {h,failImages}=setup();h.stubPixels();failImages(1);await assert.rejects(h.matchesTemplate({},'modal',[0,0,1,1]));assert.equal(await h.matchesTemplate({},'modal',[0,0,1,1]),true);
 failImages(1);await assert.rejects(h.academyOf({}));await assert.doesNotReject(h.academyOf({}));
});
test('OCR teardown failure always restores controls and permits retry',async()=>{
 const {h,get,c}=setup();c.__PAWAADO_IMPORT_TRAINING_PHOTOS__=()=>{};
 h.prepareUi(async()=>({abilityUpScreens:0,dataScreens:0,trainingPatterns:[{exp:{}}],warnings:[]}),{terminate:async()=>{throw Error('terminated')}});
 await get('readPhotos').onclick();assert.equal(h.busy(),false);for(const id of ['choosePhotos','photoFiles','resetBtn','topResetBtn','calcBtn'])assert.equal(get(id).disabled,false,id);
});
test('fatal import errors never render duplicated Japanese punctuation',async()=>{
 const {h,get,c}=setup();
 c.__PAWAADO_IMPORT_PHOTO__=()=>{throw Error('経験点を確認してください。');};
 h.prepareUi(async()=>({
   abilityUpScreens:1,dataScreens:1,academy:'パワフルアカデミー',job:'剣士',
   exp:{筋力:100,敏捷:100,技術:100,知力:100,精神:100},
   basic:{生命力:50,パワー:50,魔力:50,器用さ:50,耐久力:50,精神力:50},
   specials:[],supers:[],trainingPatterns:[],warnings:[]
 }),null);
 await get('readPhotos').onclick();
 assert.doesNotMatch(get('photoStatus').textContent,/。。/);
 assert.match(get('photoStatus').textContent,/経験点を確認してください。手入力/);
});
test('partial identity import hook is shipped so a recognized academy is not discarded when job is uncertain',()=>{
 const script=fs.readFileSync(path.join(root,'script.js'),'utf8');
 assert.match(script,/__PAWAADO_IMPORT_IDENTITY_ONLY__/);
 const photo=fs.readFileSync(path.join(root,'photo_import.js'),'utf8');
 assert.match(photo,/__PAWAADO_IMPORT_IDENTITY_ONLY__/);
});
test('missing planned EXP confirmation uses the requested two-line wording',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/訓練後の付与予定経験点が入力されていませんが、<br><span class="planned-exp-confirm-question">よろしいですか。<\/span>/);
});
test('reset/calculation are locked during reading and detailed warnings survive import errors',async()=>{
 const {h,get,c}=setup();let release;const ready=new Promise(r=>release=r);
 h.prepareUi(async()=>{await ready;return {abilityUpScreens:1,dataScreens:1,warnings:['筋力の不一致'],trainingPatterns:[]}},null);
 c.__PAWAADO_IMPORT_PHOTO__=()=>{throw Error('経験点を確認してください')};
 const pending=get('readPhotos').onclick();assert.equal(get('resetBtn').disabled,true);assert.equal(get('calcBtn').disabled,true);release();await pending;
 assert.equal(get('photoUncertain').hidden,false);assert.match(get('photoUncertain').innerHTML,/筋力の不一致/);assert.equal(get('readPhotos').disabled,false);
});


test('AI comparison shows old OCR and AI candidates by screenshot without treating agreement as accuracy',()=>{
 const {c}=setup();
 const render=c.__PAWAADO_PHOTO_TEST__.buildAiComparisonHtml;
 const html=render(
  [{name:'A.jpg'}],
  {exp:{筋力:300},specials:['アクションスキル◎'],comparisonScreens:[{index:0,type:'能力データ',cells:[
    {row:1,col:1,name:'アクションスキル◎',mark:'◎'},
    {row:1,col:2,name:'風回復',mark:'なし'},
    {row:1,col:3,name:'対ドラゴンタートル○',mark:'○'}
  ]}]},
  [{experience:[],marks:[{row:1,col:1,value:'◎',confidence:.99},{row:1,col:2,value:'◎',confidence:.95},{row:1,col:3,value:'◎',confidence:.96}]}]
 );
 assert(html.includes('アクションスキル◎'));
 assert(html.includes('対ドラゴンタートル○'));
 assert(html.includes('<th>従来の記号</th>'));
 assert(html.includes('一致 <strong>1</strong>'));
 assert(html.includes('相違 <strong>2</strong>'),'記号なし対◎も比較上の相違');
 assert(html.includes('記号の有無・金色セルを先に判別し'));
 assert(html.includes('査定入力は変更しません'));
});
test('AI comparison renders experience readings and never claims a missing AI value is correct',()=>{
 const {c}=setup();
 const output=c.__PAWAADO_PHOTO_TEST__.buildAiComparisonHtml(
  [{name:'能力アップ.jpg'}],
  {exp:{筋力:300},specials:[],comparisonScreens:[{index:0,type:'能力アップ',exp:{筋力:300,敏捷:130,技術:null,知力:105,精神:78}}]},
  [{experience:[{name:'筋力',value:'300',confidence:.99},{name:'敏捷',value:'131',confidence:.99},{name:'知力',value:'105',confidence:.99},{name:'精神',value:'78',confidence:.99}]}]
 );
 assert(output.includes('経験点の比較'));
 assert(output.includes('一致 <strong>3</strong>'));
 assert(output.includes('相違 <strong>1</strong>'));
 assert(output.includes('要確認 <strong>1</strong>'));
 assert(output.includes('未読'));
});
test('one ability-data screen is enough for isolated AI comparison without EXP warnings',async()=>{
 const {c,h}=setup();h.stubReads();
 const report=await h.readImages([{kind:'data',academy:'パワフルアカデミー',dataJob:'剣士'}],{comparison:true});
 assert.equal(report.dataScreens,1);
 assert.equal(report.abilityUpScreens,0);
 assert.equal(report.trainingPatterns.length,0);
 assert.equal(report.comparisonScreens.length,1);
 assert.equal(report.comparisonScreens[0].basic['生命力'],50);
 assert(!report.warnings.some(w=>w.includes('能力アップ')&&w.includes('訓練')));
 const html=c.__PAWAADO_PHOTO_TEST__.buildAiComparisonHtml(
  [{name:'能力データ.png'}],report,[{marks:[],experience:[]}]
 );
 assert(html.includes('「能力データ」のみの比較検証'));
 assert(html.includes('基本能力（従来の画像認識・AI未対応）'));
 assert(!html.includes('経験点の比較'));
 // 通常の自動入力では経験点画像が必要なことを引き続き通知する。
 const regular=await h.readImages([{kind:'data',dataJob:'剣士'}]);
 assert(regular.warnings.some(w=>w.includes('「能力アップ」または「訓練」')));
});
test('AI comparison escapes file names and unread names in rendered HTML',()=>{
 const {c}=setup();
 const output=c.__PAWAADO_PHOTO_TEST__.buildAiComparisonHtml(
  [{name:'<img src=x onerror=alert(1)>.png'}],
  {exp:{},specials:['<svg/onload=alert(2)>'],comparisonScreens:[]},[{}]
 );
 assert(!output.includes('<img src=x'));
 assert(!output.includes('<svg/onload=alert(2)>'));
 assert(output.includes('&lt;img'));
});
test('AI comparison button evaluates the same selected images without modifying inputs',async()=>{
 const {c,h,get}=setup();
 let imported=0,called=0,terminated=0;
 c.__PAWAADO_IMPORT_PHOTO__=()=>{imported++;};
 c.__PAWAADO_AI_PROBE__={inspectImage:async()=>{called++;return {marks:[],experience:[]}}};
 h.prepareUi(async(images,options)=>{
  assert.equal(options?.comparison,true);
  assert.equal(images.length,1);
  return {exp:{},specials:[],comparisonScreens:[{index:0,type:'能力データ',cells:[]}]};
 },{terminate:async()=>{terminated++;}});
 await get('comparePhotos').onclick();
 assert.equal(called,1);
 assert.equal(imported,0);
 assert.equal(terminated,1);
 assert.equal(h.busy(),false);
 assert.equal(get('readPhotos').disabled,false,'regular import remains available');
 assert.equal(get('photoCompare').hidden,false);
 assert(get('photoCompare').innerHTML.includes('従来OCRと端末内AIの比較'));
});


function fakeScreenshotFrame(frame){
 const pixels=new Uint8ClampedArray(1536*706*4);
 for(let i=0;i<pixels.length;i+=4){pixels[i]=240;pixels[i+1]=228;pixels[i+2]=208;pixels[i+3]=255;}
 for(const [first,last] of frame){
  for(let y=first;y<=last;y++)for(const x of [713,852,990,1128]){
   for(let xx=x+3;xx<x+127;xx++){
    const i=(y*1536+xx)*4;pixels[i]=75;pixels[i+1]=190;pixels[i+2]=245;
   }
  }
 }
 return pixels;
}
function detectedSyntheticRows(frame){
 const {c,h}=setup();
 const pixels=fakeScreenshotFrame(frame);
 h.stubAbilityPixels(pixels);
 c.document.createElement=()=>({width:1536,height:706,getContext(){
  return {drawImage(){},getImageData(){return {data:pixels};}};
 }});
 return Array.from(c.__PAWAADO_PHOTO_TEST__.abilityCells({width:1536,height:706}));
}
test('IMG_1097 partial header row no longer displaces the next four ability names',()=>{
 const cells=detectedSyntheticRows([[274,287],[293,336],[343,386],[392,435],[442,485],[492,535]]);
 assert.equal(cells.length,20);
 assert.deepEqual(cells.slice(0,4).map(item=>item.col),[1,2,3,4]);
 assert.equal(cells[0].rect[1],295,'1行目: 対魔闘士◎、対弓使い○、対魔法使い◎、対ゴブリン○');
 assert.equal(cells[4].rect[1],345);
});
test('IMG_1096 normal top row retains its original vertical position',()=>{
 const cells=detectedSyntheticRows([[279,322],[328,371],[378,421],[428,471],[478,520],[527,536]]);
 assert.equal(cells.length,20);
 assert.equal(cells[0].rect[1],281);
 assert.equal(cells[4].rect[1],330);
});
test('comparison explains 99 percent AI confidence is not the rate of agreement',()=>{
 const {c}=setup();
 const html=c.__PAWAADO_PHOTO_TEST__.buildAiComparisonHtml(
  [{name:'IMG_1096.png'}],
  {exp:{},specials:['対ドラゴンタートル◎','回復効果○'],
   comparisonScreens:[{index:0,type:'能力データ',cells:[
    {row:4,col:3,name:'対ドラゴンタートル◎',mark:'◎'},
    {row:4,col:4,name:'回復効果○',mark:'○'}
   ]}]},
  [{marks:[{row:4,col:3,value:'◎',confidence:.994},{row:4,col:4,value:'○',confidence:.991}],experience:[]}]
 );
 assert(html.includes('AI確信度 99%（参考）'));
 assert(html.includes('正解率・一致率ではありません'));
 assert(html.includes('一致 <strong>2</strong>'));
});
