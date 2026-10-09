'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {compare,REQUIRED}=require('../experiments/ai_safety_gate.js');
const stable=(mark,confidence=.999)=>Object.fromEntries(REQUIRED.map(k=>[k,{mark,confidence}]));
const check=(args,disposition,mark)=>{const input=JSON.parse(JSON.stringify(args));const result=compare(args);assert.equal(result.disposition,disposition);
  assert.equal(result.aiCandidate,mark);assert.equal(result.automaticChange,false);
  assert.deepEqual(args,input,'input not mutated');return result;};
test('unknown ability names never become acquired',()=>{
 check({recognizedName:false,variants:stable('○')},'ignore',null);
});
test('AI does not promote unknown mark to owned even with 4 agreeing predictions',()=>{
 check({recognizedName:true,variants:stable('◎')},'review-only','◎');
});
test('existing ○ is never overwritten by ◎',()=>{
 const x=check({recognizedName:true,currentFinalMark:'○',variants:stable('◎')},'keep-current-review','◎');
 assert.equal(x.currentFinalMark,'○');
});
test('existing ◎ is not erased by a no-mark AI prediction',()=>{
 const x=check({recognizedName:true,currentFinalMark:'◎',variants:stable('なし')},'keep-current-review',null);
 assert.equal(x.currentFinalMark,'◎');
});
test('no-mark on unacquired ability produces no new ownership',()=>{
 check({recognizedName:true,variants:stable('なし')},'no-mark',null);
});
test('AI may corroborate existing OCR without changing it',()=>{
 check({recognizedName:true,currentFinalMark:'◎',variants:stable('◎')},'corroborated','◎');
});
test('brightness instability forces abstention',()=>{
 const v=stable('○');v.brightness90={mark:'◎',confidence:.999};
 check({recognizedName:true,variants:v},'unresolved',null);
});
test('JPEG instability forces abstention',()=>{
 const v=stable('○');v.jpeg85={mark:'なし',confidence:.999};
 check({recognizedName:true,variants:v},'unresolved',null);
});
test('one low confidence prediction forces abstention',()=>{
 const v=stable('○');v.brightness110.confidence=.9499;
 check({recognizedName:true,variants:v},'unresolved',null);
});
test('missing or unexpected model output forces abstention',()=>{
 const v=stable('○');delete v.jpeg85;
 check({recognizedName:true,variants:v},'unresolved',null);
 const invalid=stable('○');invalid.original.mark='◉';
 check({recognizedName:true,variants:invalid},'unresolved',null);
});
