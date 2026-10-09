'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'script.js'),'utf8');
const begin=ui.indexOf('function resultSpecialChoices(entries){');
const finish=ui.indexOf('function plannedExpNeedsConfirmation(){',begin);
assert(begin>=0&&finish>begin,'exclusion UI logic not found');
const block=ui.slice(begin,finish);
const dataScope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),dataScope);
const D=dataScope.window.PAWAADO_DATA;
const getIndex=name=>D.special.findIndex(row=>row[1]===name);
function harness(owned=[]){
  const listeners={};
  const select={id:'excludeSpecialSelect',value:'',options:[],selectedIndex:0,dispatchEvent(e){listeners[e.type]?.({target:select});}};
  const add={id:'addExcludedSpecial',disabled:true};
  const submit={id:'excludeSpecialRecalc',disabled:true};
  const pending={id:'pendingExcludedSpecials',innerHTML:'',hidden:true};
  const menu={id:'excludeSpecialMenu',innerHTML:'',hidden:true};
  const toggle={id:'excludeSpecialSelectButton',disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},focus(){},closest(){return control;}};
  const label={id:'excludeSpecialSelectText',textContent:'特殊能力を選択'};
  const control={classList:{add(){},remove(){}},contains(){return false;}};
  const result={addEventListener(name,handler){listeners[name]=handler;}};
  const dom={result,excludeSpecialSelect:select,addExcludedSpecial:add,excludeSpecialRecalc:submit,pendingExcludedSpecials:pending,excludeSpecialMenu:menu,excludeSpecialSelectButton:toggle,excludeSpecialSelectText:label};
  const ctx={
    D,Map,Set,Number,String,Array,
    specialNameIndex:new Map(D.special.map((row,index)=>[row[1],index])),
    excludedSpecialIndices:new Set(),
    pendingExcludedSpecialIndices:new Set(),
    getSpecialState:index=>({own:owned.includes(index)?1:0}),
    restoreItems:candidate=>candidate.items||[],
    document:{getElementById:id=>dom[id]||null,querySelector:()=>control,addEventListener(){}},
    Event:class{constructor(type){this.type=type;}},
    isCalculating:false,
    calc:()=>{ctx.calcCount++;},
    calcCount:0
  };
  vm.createContext(ctx);
  vm.runInContext(block,ctx);
  const click=(id,removeIndex=null)=>listeners.click({target:{closest:()=>id==='excludeSpecialSelectButton'?toggle:({
    id,
    dataset:{excludeRemove:String(removeIndex),excludeOption:''},
    hasAttribute:name=>name==='data-exclude-remove'&&removeIndex!==null,
    closest:()=>control
  })}});
  return {ctx,listeners,select,add,submit,pending,menu,toggle,label,click};
}

test('◎ result exposes both ◎ and unowned prerequisite ○, even if only ◎ is in result items',()=>{
  const h=harness();
  const upper=getIndex('アクションスキル◎'),lower=getIndex('アクションスキル○');
  assert(upper>=0&&lower>=0);
  const entries=[{candidate:{items:[{type:'special',idx:upper,name:'アクションスキル◎'}]}}];
  h.ctx.entries=entries;
  const found=Array.from(vm.runInContext('resultSpecialChoices(entries)',h.ctx),row=>Number(row[0]));
  assert.deepEqual(found,[lower,upper].sort((a,b)=>a-b));
  const html=vm.runInContext('excludeResultHtml(entries)',h.ctx);
  assert(html.includes('アクションスキル○'));
  assert(html.includes('アクションスキル◎'));
  assert(html.includes('特定の特殊能力を取得せずに査定が最大となる組合せを計算します。'));
  assert(!html.includes('◎だけを除外すると'));
  assert(html.includes('id="excludeSpecialSelectButton"'));
  assert(html.includes('class="custom-select-menu"'));
  assert(html.includes('選択した特殊能力を取得せずに再計算'));
  assert(html.includes('>追加</button>'));
});

test('new selector uses the same custom menu as academy and job',()=>{
  const h=harness();
  const a=getIndex('アクションスキル◎');
  h.select.options=[{value:'',textContent:'特殊能力を選択'},{value:String(a),textContent:'アクションスキル◎'}];
  h.click('excludeSpecialSelectButton');
  assert.equal(h.menu.hidden,false);
  assert.equal(h.toggle.attributes['aria-expanded'],'true');
  assert(h.menu.innerHTML.includes('アクションスキル◎'));
  h.click('excludeSpecialSelectButton');
  assert.equal(h.menu.hidden,true);
});

test('previously acquired lower ○ is not offered as an exclusion, but ◎ is',()=>{
  const upper=getIndex('アクションスキル◎'),lower=getIndex('アクションスキル○');
  const h=harness([lower]);h.ctx.entries=[{candidate:{items:[{type:'special',idx:upper}]}}];
  const found=Array.from(vm.runInContext('resultSpecialChoices(entries)',h.ctx),row=>Number(row[0]));
  assert.deepEqual(found,[upper]);
});

test('multiple choices are queued before a single recalculation',()=>{
  const h=harness(),lower=getIndex('アクションスキル○'),upper=getIndex('アクションスキル◎');
  h.select.options=[{value:''},{value:String(lower)},{value:String(upper)}];
  h.select.value=String(lower);h.click('addExcludedSpecial');
  assert.equal(h.ctx.pendingExcludedSpecialIndices.size,1);
  assert.equal(h.ctx.calcCount,0);
  h.select.value=String(upper);h.click('addExcludedSpecial');
  assert.equal(h.ctx.pendingExcludedSpecialIndices.size,2);
  assert(h.pending.innerHTML.includes('アクションスキル○'));
  assert(h.pending.innerHTML.includes('アクションスキル◎'));
  assert.equal(h.submit.disabled,false);
  h.click('excludeSpecialRecalc');
  assert.equal(h.ctx.calcCount,1);
  assert(h.ctx.excludedSpecialIndices.has(lower)&&h.ctx.excludedSpecialIndices.has(upper));
  assert.equal(h.ctx.pendingExcludedSpecialIndices.size,0);
});

test('pending items can be removed without changing exclusion settings',()=>{
  const h=harness(),lower=getIndex('アクションスキル○');
  h.select.options=[{value:''},{value:String(lower)}];
  h.select.value=String(lower);h.click('addExcludedSpecial');
  h.click('removePendingSpecial',lower);
  assert.equal(h.ctx.pendingExcludedSpecialIndices.size,0);
  assert.equal(h.ctx.excludedSpecialIndices.size,0);
  assert.equal(h.submit.disabled,true);
  assert.equal(h.ctx.calcCount,0);
});

test('clearing active exclusions requests a fresh unrestricted calculation',()=>{
  const h=harness(),upper=getIndex('アクションスキル◎');
  h.ctx.excludedSpecialIndices.add(upper);
  h.click('clearExcludedSpecials');
  assert.equal(h.ctx.excludedSpecialIndices.size,0);
  assert.equal(h.ctx.calcCount,1);
});

test('duplicate selections cannot be queued twice',()=>{
  const h=harness(),upper=getIndex('アクションスキル◎');
  h.select.options=[{value:''},{value:String(upper)}];
  h.select.value=String(upper);h.click('addExcludedSpecial');
  h.select.value=String(upper);h.click('addExcludedSpecial');
  assert.equal(h.ctx.pendingExcludedSpecialIndices.size,1);
});
