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
  window.h={jobFromText,readImages,levelByImage,matchesTemplate,academyOf,
   stubReads(){matchesTemplate=async(im,name)=>name==='modal'?im.kind==='data':name==='basic';academyOf=async im=>im.academy||'パワフルアカデミー';basicByImageStrict=()=>50;readAbilityCells=async im=>({specials:[],supers:[],warnings:[],explicitPairMarks:im.marks||{}});readTrainingPattern=async()=>null;jobOf=async im=>({job:im.job||'剣士'});numericRow=async im=>[im.exp??100,100,100,100,100];},
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
test('a third screenshot cannot erase a job or EXP conflict',async()=>{
 const {h}=setup();h.stubReads();const r=await h.readImages([{job:'剣士',exp:100},{job:'僧侶',exp:200},{job:'剣士',exp:100}]);assert.equal(r.job,null);assert.equal(r.exp.筋力,null);assert(r.warnings.some(w=>w.includes('一致しません')));
});
test('a third screenshot cannot erase conflicting ○/◎ observations',async()=>{
 const {h}=setup();h.stubReads();const r=await h.readImages(['○','◎','○'].map(mark=>({kind:'data',marks:{通常攻撃:mark}})));assert.equal(r.explicitPairMarks.通常攻撃,null);
});
test('unrecognized glyph width does not fabricate a Lv, and supers stay within Lv1–2',()=>{
 const {h}=setup();h.stubGlyph('',10);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);h.stubGlyph('6',14);assert.equal(h.levelByImage({}, {rect:[0,0]}),null);assert.equal(h.levelByImage({}, {rect:[0,0]},6),6);
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
test('reset/calculation are locked during reading and detailed warnings survive import errors',async()=>{
 const {h,get,c}=setup();let release;const ready=new Promise(r=>release=r);
 h.prepareUi(async()=>{await ready;return {abilityUpScreens:1,dataScreens:1,warnings:['筋力の不一致'],trainingPatterns:[]}},null);
 c.__PAWAADO_IMPORT_PHOTO__=()=>{throw Error('経験点を確認してください')};
 const pending=get('readPhotos').onclick();assert.equal(get('resetBtn').disabled,true);assert.equal(get('calcBtn').disabled,true);release();await pending;
 assert.equal(get('photoUncertain').hidden,false);assert.match(get('photoUncertain').innerHTML,/筋力の不一致/);assert.equal(get('readPhotos').disabled,false);
});
