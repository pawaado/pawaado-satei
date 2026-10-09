'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'script.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const begin=ui.indexOf('function customConditionListHtml(kind){');
const finish=ui.indexOf('function plannedExpNeedsConfirmation(){',begin);
assert(begin>=0&&finish>begin,'custom calculation code block not found');
assert(!html.includes('id="excludeSpecialSelect"'),'old exclusion UI must be gone');
const code=ui.slice(begin,finish);
const contextData={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),contextData);
const D=contextData.window.PAWAADO_DATA;
function mock(){
 const dom={};
 const node=id=>{
   if(dom[id])return dom[id];
   const obj={id,value:'',hidden:true,innerHTML:'',textContent:'',handlers:{},
     addEventListener(t,cb){this.handlers[t]=cb;},closest(){return this;},
     dataset:{},hasAttribute(name){return name==='data-kind'&&this.dataset.kind!=null||name==='data-key'&&this.dataset.key!=null;},setAttribute(){},getAttribute(){},disabled:false};
   dom[id]=obj;return obj;
 };
 const ids=['customCalcCard','customBasicName','customBasicMin','customRequiredName','customForbiddenName',
   'customAddBasic','customAddRequired','customAddForbidden','customClearAll','customCalcMessage',
   'custom-basic-list','custom-required-list','custom-forbidden-list'];
 ids.forEach(node);
 const state={D,customMinimumBasics:new Map(),customRequiredSpecials:new Set(),customForbiddenSpecials:new Set(),
   basicNames:['生命力','パワー','魔力','器用さ','耐久力','精神力'],
   isCalculating:false,limits:()=>({生命力:110,パワー:115,魔力:110,器用さ:120,耐久力:100,精神力:100}),
   specialOwned:()=>false,document:{getElementById:node}};
 vm.createContext(state);
 vm.runInContext(code,state);
 vm.runInContext('initCustomConditions()',state);
 const click=(id,dataset)=>{
   const button=node(id);button.dataset=dataset||{};
   node('customCalcCard').handlers.click({target:{closest:()=>button}});
 };
 return {state,dom,node,click};
}
test('the three independent conditions are available before calculation',()=>{
 for(const text of ['基本能力を○以上','必ず取得する特殊能力','取得しない特殊能力','こだわり計算'])
   assert(html.includes(text));
 assert(!html.includes('特殊能力を除外して再計算'));
});
test('basic minimum is added, updated and removed',()=>{
 const x=mock();
 x.node('customBasicName').value='生命力';x.node('customBasicMin').value='95';
 x.click('customAddBasic');
 assert.equal(x.state.customMinimumBasics.get('生命力'),95);
 assert(x.node('custom-basic-list').innerHTML.includes('生命力 95以上'));
 x.node('customBasicName').value='生命力';x.node('customBasicMin').value='100';x.click('customAddBasic');
 assert.equal(x.state.customMinimumBasics.get('生命力'),100);
 x.click('deleteBasic',{kind:'basic',key:'生命力'});
 assert.equal(x.state.customMinimumBasics.size,0);
});
test('skill conditions use separate ○ and ◎ and allow multiple entries',()=>{
 const x=mock();
 const lower=D.special.findIndex(s=>s[1]==='アクションスキル○');
 const upper=D.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert(lower>=0&&upper>=0);
 x.node('customRequiredName').value=String(lower);x.click('customAddRequired');
 x.node('customRequiredName').value=String(upper);x.click('customAddRequired');
 assert.equal(x.state.customRequiredSpecials.size,2);
 assert(x.node('custom-required-list').innerHTML.includes('アクションスキル◎'));
 x.node('customForbiddenName').value=String(upper);x.click('customAddForbidden');
 assert.equal(x.state.customForbiddenSpecials.size,0);
 assert(x.node('customCalcMessage').textContent.includes('両方'));
});
test('conditions summary escapes text and clear button removes all',()=>{
 const x=mock();
 x.state.customMinimumBasics.set('生命力',90);
 x.state.customRequiredSpecials.add(D.special.findIndex(s=>s[1]==='アクションスキル◎'));
 const summary=vm.runInContext('customConditionsSummaryHtml()',x.state);
 assert(summary.includes('生命力 90以上')&&summary.includes('アクションスキル◎'));
 x.click('customClearAll');
 assert.equal(x.state.customMinimumBasics.size,0);
 assert.equal(x.state.customRequiredSpecials.size,0);
 assert.equal(x.state.customForbiddenSpecials.size,0);
});
test('invalid values beyond academy job limits do not enter constraints',()=>{
 const x=mock();
 x.node('customBasicName').value='生命力';x.node('customBasicMin').value='120';
 x.click('customAddBasic');
 assert.equal(x.state.customMinimumBasics.size,0);
 assert(x.node('customCalcMessage').textContent.includes('上限'));
});
test('custom conditions in payload and cache identity',()=>{
 assert(ui.includes('customConditions:{'));
 assert(ui.includes('minimumBasics:Object.fromEntries(customMinimumBasics)'));
 assert(ui.includes('requiredSpecialIndices:[...customRequiredSpecials]'));
 assert(ui.includes('forbiddenSpecialIndices:[...customForbiddenSpecials]'));
 assert(ui.includes('customConditionsSummaryHtml()+comparisonHtml(entries)'));
 assert(!ui.includes('excludeResultHtml(entries)'));
});
