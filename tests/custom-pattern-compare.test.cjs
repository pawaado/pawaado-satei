'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','script.js'),'utf8');
const compStart=source.indexOf('function rankedEntries(entries){');
const compEnd=source.indexOf('function escapeCustomText(value){',compStart);
const calcStart=source.indexOf('async function calc(){');
const calcEnd=source.indexOf('function setupUsageModal(){',calcStart);
assert(compStart>=0&&compEnd>compStart&&calcStart>=0&&calcEnd>calcStart);
const code=source.slice(compStart,compEnd)+'\n'+source.slice(calcStart,calcEnd);
const names=['筋力','敏捷','技術','知力','精神'];
function createHarness(scores){
 const elems={};
 const el=id=>elems[id]??=( {id,disabled:false,isConnected:true,innerHTML:'',textContent:'',
   style:{setProperty(){},display:''}} );
 const result=el('result'),calcBtn=el('calcBtn'),cancelBtn=el('cancelCalcBtn');
 const expSamples=Object.keys(scores).map(n=>({筋力:String(n),敏捷:'0',技術:'0',知力:'0',精神:'0'}));
 const calls=[];
 const state={
   console,Promise,Math,Number,String,Map,Set,Array,Object,JSON,
   expSamples,expNames:names,plannedExp:Object.fromEntries(names.map(n=>[n,0])),
   document:{getElementById:el,querySelectorAll:()=>[calcBtn,cancelBtn],
    body:{classList:{add(){},remove(){}}}},
   isCalculating:false,cancelRequested:false,basicNames:[],D:{special:[]},
   job:{value:'剣士'},validateAllInline(){},validateInputs:()=>[],
   plannedExpNeedsConfirmation:()=>false,ensureCancelButton:()=>cancelBtn,
   calcCacheKey:exp=>String(exp[0]),getCachedResult:()=>null,setCachedResult(){},
   optimizeAsync:async exp=>{calls.push(exp[0]);const score=scores[exp[0]];
     if(score instanceof Error)throw score;
     return {score,cost:[0,0,0,0,0],items:[]};
   },
   throwIfCancelled(){},finalizeScore:x=>x,
   cleanupActiveWorker(){},applyBasicVisual(){},applySkillVisual(){},
   renderExp(){},renderCustomConditions(){},animateResultCard(){},
   yieldToBrowser:async()=>{},customConditionsSummaryHtml:()=>'<p>条件</p>',
   sampleResultHtml:entry=>'<div>完了パターン'+entry.index+':'+entry.scoreGain+'</div>',
   sampleLabel:i=>'パターン'+String.fromCharCode(65+i),
   sampleLabelHtml:i=>'パターン'+String.fromCharCode(65+i),
   renderErrorBox:messages=>'<div>エラー: '+messages.join(' / ')+'</div>',
   escapeCustomText:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
 };
 vm.createContext(state);vm.runInContext(code,state);
 return {state,el,result,calls,run:()=>vm.runInContext('calc()',state)};
}
test('only infeasible A is excluded; B and C remain ranked by maximum assessment',async()=>{
 const x=createHarness({1:new Error('こだわり計算：生命力105以上にする経験点が不足しています。'),2:540,3:410});
 await x.run();
 assert.deepEqual(x.calls,[1,2,3]);
 const html=x.result.innerHTML;
 assert(html.includes('パターンA：条件達成不可'));
 assert(html.includes('生命力105以上にする経験点が不足'));
 assert(html.includes('パターンB</td><td>+540'));
 assert(html.includes('パターンC</td><td>+410'));
 assert(html.indexOf('1位</td><td>パターンB')<html.indexOf('2位</td><td>パターンC'));
 assert(!html.includes('エラー:'));
 assert(html.includes('完了パターン1:540'));
 assert(html.includes('完了パターン2:410'));
 assert(!html.includes('完了パターン0:'));
});
test('all infeasible patterns are individually reported without empty max or a bogus winner',async()=>{
 const x=createHarness({1:new Error('こだわり計算：筋力不足'),2:new Error('こだわり計算：前提条件不足')});
 await x.run();
 assert.deepEqual(x.calls,[1,2]);
 assert(x.result.innerHTML.includes('パターンA：条件達成不可'));
 assert(x.result.innerHTML.includes('パターンB：条件達成不可'));
 assert(!x.result.innerHTML.includes('1位</td>'));
 assert(!x.result.innerHTML.includes('+NaN'));
});
test('single pattern keeps normal error display',async()=>{
 const x=createHarness({1:new Error('こだわり計算：経験点不足')});
 await x.run();
 assert(x.result.innerHTML.includes('エラー:'));
 assert(!x.result.innerHTML.includes('条件達成不可'));
});
test('unrelated worker error stops computation and is not misrepresented as infeasible',async()=>{
 const x=createHarness({1:321,2:new Error('Worker was terminated'),3:999});
 await x.run();
 assert.deepEqual(x.calls,[1,2]);
 assert(x.result.innerHTML.includes('Worker was terminated'));
 assert(!x.result.innerHTML.includes('条件達成不可'));
});
test('reasons are escaped when displayed as unavailable pattern details',async()=>{
 const x=createHarness({1:new Error('こだわり計算：<unsafe>'),2:100});
 await x.run();
 assert(x.result.innerHTML.includes('&lt;unsafe>'));
 assert(!x.result.innerHTML.includes('<unsafe>'));
});
