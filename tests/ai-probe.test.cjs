'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(){
  const listeners=new Map(),result={textContent:'',innerHTML:''};
  const file={addEventListener(name,fn){listeners.set(name,fn);},disabled:false};
  const doc={getElementById:id=>id==='aiResults'?result:id==='aiPhotos'?file:null};
  const c={document:doc,Uint8Array,Uint8ClampedArray,Int8Array,Float64Array,Array,Math,JSON,Number,
    URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
    Image:class{},atob,console};
  c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,'ai_models_probe.js'),'utf8'),c);
  let source=fs.readFileSync(path.join(root,'ai_probe.js'),'utf8');
  source=source.replace(/\}\)\(\);\s*$/, 'window.__AI_LAB_TEST__={predict,areaResize,detectRows,markCells,digitCharacters,decoded};})();');
  vm.runInContext(source,c,{timeout:15000});
  return {c,listener:listeners.get('change'),api:c.__AI_LAB_TEST__,result};
}
test('experiment models decode into intended compact dimensions',()=>{
  const {api}=setup();
  assert.equal(api.decoded.marks.weights.length,400);
  assert.equal(api.decoded.digits.weights.length,2520);
  assert.equal(api.decoded.marks.shape.join('x'),'20x20');
  assert.equal(api.decoded.digits.shape.join('x'),'14x18');
});
test('score produces valid labels and confidence for both models',()=>{
  const {api}=setup();
  const symbol=api.predict('marks',new Float64Array(400).fill(0.5));
  assert(['○','◎'].includes(symbol.value));assert(symbol.confidence>=.5&&symbol.confidence<=1);
  const digit=api.predict('digits',new Float64Array(252).fill(.5));
  assert(/^[0-9]$/.test(digit.value));assert(digit.confidence>0&&digit.confidence<=1);
});
test('area-resize keeps constant pixel values unchanged',()=>{
  const {api}=setup();
  const out=api.areaResize(new Float64Array(18*21).fill(177),18,21,14,18);
  assert.equal(out.length,252);
  for(const value of out)assert(Math.abs(value-177)<1e-9);
});
test('blank game screenshot produces no invented digits or marks',()=>{
  const {api}=setup();
  const pixels=new Uint8ClampedArray(1536*706*4);
  for(let i=0;i<pixels.length;i+=4){pixels[i]=240;pixels[i+1]=240;pixels[i+2]=240;pixels[i+3]=255;}
  assert.deepEqual([...api.detectRows(pixels)],[]);
  assert.deepEqual([...api.markCells(pixels)],[]);
  const digits=api.digitCharacters(pixels,0);
  assert.equal(digits.value,'未読');
});
test('photo input handler is wired on experimental page only',()=>{
  const {listener}=setup();assert.equal(typeof listener,'function');
});


test('AI probe skips the hidden first-row fragment from IMG_1097',()=>{
  const {api}=setup();
  const pixels=new Uint8ClampedArray(1536*706*4);
  for(let i=0;i<pixels.length;i+=4){
    pixels[i]=240;pixels[i+1]=228;pixels[i+2]=208;pixels[i+3]=255;
  }
  const bands=[[274,287],[293,336],[343,386],[392,435],[442,485],[492,535]];
  for(const [first,last] of bands)for(let y=first;y<=last;y++)
    for(const x of [713,852,990,1128])for(let xx=x+3;xx<x+127;xx++){
      const i=(y*1536+xx)*4;pixels[i]=75;pixels[i+1]=190;pixels[i+2]=245;
    }
  assert.deepEqual(Array.from(api.detectRows(pixels)),[293,343,392,442,492]);
});
test('AI probe keeps complete first rows such as IMG_1096',()=>{
  const {api}=setup();
  const pixels=new Uint8ClampedArray(1536*706*4);
  for(let i=0;i<pixels.length;i+=4){
    pixels[i]=240;pixels[i+1]=228;pixels[i+2]=208;pixels[i+3]=255;
  }
  const bands=[[279,322],[328,371],[378,421],[428,471],[478,520],[527,536]];
  for(const [first,last] of bands)for(let y=first;y<=last;y++)
    for(const x of [713,852,990,1128])for(let xx=x+3;xx<x+127;xx++){
      const i=(y*1536+xx)*4;pixels[i]=75;pixels[i+1]=190;pixels[i+2]=245;
    }
  assert.deepEqual(Array.from(api.detectRows(pixels)),[279,328,378,428,478]);
});
