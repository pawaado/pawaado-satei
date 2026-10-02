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
  window.h={jobFromText,profileIdentityOf,dataJobFromHeader,dataJobByIcon,dataJobByHeaderImage,jobNameFromScores,jobNameFromIconScores,byteCorrelation,abilityByImage,readAbilityCells,readImages,readTrainingPattern,levelByImage,matchesTemplate,academyOf,academyNameFromScores,cellAbility,findSpecials,classifyTrainingGlyph,classifyTrainingCurrentGlyph,classifyGlyph,decodeMask,digitSequenceToNumber,abilityMasks:HYBRID_ABILITY_MASKS,trainingCurrentDigitMasks:TRAINING_CURRENT_DIGIT_MASKS,trainingGainColorMasks:TRAINING_GAIN_COLOR_MASKS,hybridLevelMasks:HYBRID_LEVEL_MASKS,
   stubReads(){matchesTemplate=async(im,name)=>name==='modal'?im.kind==='data':name==='basic';academyOf=async im=>im.academy||'パワフルアカデミー';profileIdentityOf=async im=>({job:im.dataJob||''});basicByImageStrict=()=>50;readAbilityCells=async im=>({specials:[],supers:[],warnings:[],explicitPairMarks:im.marks||{}});readTrainingPattern=async im=>im.training||null;jobOf=async im=>({job:im.job||'剣士'});numericRow=async im=>[im.exp??100,100,100,100,100];},
   stubDataJobHeader(raw){dataJobByIcon=()=>'';textAt=async()=>({text:raw,confidence:99});},
   stubDataJobScores(scores){grayIconVector=()=>new Uint8Array(256);let i=0;byteMse=()=>Number(scores[i++]??99999);},
   stubAbilityMask(encoded){inkMask=()=>({mask:decodeMask(encoded,64*10),w:64,h:10});},
   stubDataHeaderMask(encoded){inkMask=()=>({mask:decodeMask(encoded,96*16),w:96,h:16});},
   stubTrainingCurrent(values){looksLikeTrainingScreen=async()=>true;trainingCurrentNumberByImage=(image,row)=>values[row]??null;trainingNumber=async()=>{throw Error('current EXP OCR fallback must not run');};trainingBubblePresent=()=>false;trainingGainNumberByImage=()=>null;},
   stubFastPairCell(name,stem,mark){let calls=0;abilityCells=()=>[{rect:[0,0,136,34],row:1,col:1,superCell:false}];elementalAttackByImage=()=>'';abilityByImage=()=>name;pairStemByImage=()=>stem;markShapeByImage=()=>mark;collectSpecialReads=async()=>{calls++;return[];};return ()=>calls;},
   stubGlyph(value='',width=10){glyphComponents=()=>[{w:width,h:15,x:10}];classifyGlyph=()=>value;},
   stubPixels(){canvasCrop=()=>({});vector=()=>new Uint8ClampedArray(4096);},
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
test('high-confidence circle/double-circle image matches skip redundant OCR',async()=>{
 const {h}=setup();
 const calls=h.stubFastPairCell('物理防御○','物理防御','○');
 const r=await h.readAbilityCells({},1);
 assert.equal(calls(),0);
 assert(r.specials.includes('物理防御○'));
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
test('absent blue gain bubble cannot add a ghost +6 to mental EXP',async()=>{
 const {h}=setup();
 h.stubTrainingCurrent([558,420,311,295,591]);
 // Reproduce the actual failure: yellow is real; the generic blue-number fallback sees background as 6.
 for(const yellowGain of [91,10]){
   h.stubTrainingCurrent([558,420,311,295,591]);
   // Override the stub after setting current values.
   // Only the mental-row yellow bubble exists; no blue bubble exists.
   const original=h.readTrainingPattern;
   // These closure bindings are exposed through the injected test scope.
   trainingBubblePresent=(image,rowY,kind)=>rowY===356&&kind==='yellow';
   trainingGainNumberByImage=(image,rowY,kind)=>kind==='yellow'?yellowGain:6;
   const r=await original({});
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
 const {h}=setup();h.stubReads();const r=await h.readImages(['○','◎','○'].map(mark=>({kind:'data',marks:{通常攻撃:mark}})));assert.equal(r.explicitPairMarks.通常攻撃,null);
});
test('unrecognized glyph width does not fabricate a Lv, and supers stay within Lv1–2',()=>{
 const {h}=setup();h.stubGlyph('',10);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);h.stubGlyph('6',14);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);assert.equal(h.levelByImage({}, {rect:[0,0]},6),6);
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
test('ignored gold abilities never become resistance supers',()=>{
 const {h}=setup();
 for(const name of ['鉄壁の盾','タフネス','剛力']){
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
