'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'script.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const begin=ui.indexOf('function escapeCustomText(value){');
const finish=ui.indexOf('function plannedExpNeedsConfirmation(){',begin);
assert(begin>=0&&finish>begin,'custom calculation code block not found');
const code=ui.slice(begin,finish);
const dataContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),dataContext);
const D=dataContext.window.PAWAADO_DATA;
function mock({ready=true,jobName='剣士'}={}){
 const dom={},owned=new Set();
 const node=id=>{
   if(dom[id])return dom[id];
   const obj={id,value:'',hidden:true,innerHTML:'',textContent:'',handlers:{},disabled:false,
     classList:{toggle(){}},
     addEventListener(t,cb){this.handlers[t]=cb;},closest(){return this;},
     dataset:{},hasAttribute(name){return name==='data-kind'&&this.dataset.kind!=null||name==='data-key'&&this.dataset.key!=null;}};
   dom[id]=obj;return obj;
 };
 const ids=['customCalcCard','customBasicName','customBasicMode','customBasicValue','customSpecialName','customSpecialMode',
   'customAddBasic','customAddSpecial','customClearAll','customCalcMessage','custom-basic-list','custom-special-list'];
 ids.forEach(node);
 node('customBasicMode').value='above';
 node('customSpecialMode').value='required';
 node('basic_生命力').value='90';
 const state={D,customBasicRules:new Map(),customRequiredSpecials:new Set(),customForbiddenSpecials:new Set(),
   basicNames:['生命力','パワー','魔力','器用さ','耐久力','精神力'],
   isCalculating:false,job:{value:jobName},hasAcademyJob:()=>ready,
   limits:()=>({生命力:110,パワー:115,魔力:110,器用さ:120,耐久力:100,精神力:100}),
   specialOwned:i=>owned.has(i),document:{getElementById:node}};
 vm.createContext(state);
 vm.runInContext(code,state);
 vm.runInContext('initCustomConditions()',state);
 const click=(id,dataset)=>{
   const button=node(id);button.dataset=dataset||{};
   node('customCalcCard').handlers.click({target:{closest:()=>button}});
 };
 return {state,dom,node,owned,click};
}
test('custom condition section and usage are concise',()=>{
  assert(html.includes('<h2 id="customCalcTitle">こだわり条件</h2>'));
  assert(/id="customBasicValue"[^>]*type="number"[^>]*aria-label="基本能力の指定値"/.test(html));
  assert(!/id="customBasicValue"[^>]*placeholder="数値"/.test(html));
  const usage=html.match(/<ol class="usage-list">([\s\S]*?)<\/ol>/);
  assert(usage,'usage list exists');
  assert.equal((usage[1].match(/<li>/g)||[]).length,3,'usage has three steps');
  assert(usage[1].includes('「計算する」を押すと、査定が最大となる組合せが表示されます。'));
  assert(usage[1].includes('各訓練後の経験点パターンにて比較できます。'));
  assert(usage[1].includes('「こだわり条件」で基本能力や特殊能力に条件を設定することもできます。'));
  assert(!usage[1].includes('「こだわり計算」では'));
  assert(ui.includes('<h3>こだわり条件</h3>'));
});

test('custom controls share existing dropdown style and intro moves into usage',()=>{
 for(const id of ['customBasicName','customBasicMode','customSpecialName','customSpecialMode']){
   assert(html.includes('id="'+id+'SelectButton"'));
 }
 assert(!html.includes('custom-calc-intro'));
 assert(html.includes('以上・固定・以下'));
 assert(html.includes('取得する・取得しない'));
 assert(!html.includes('id="excludeSpecialSelect"'));
});
test('basic mode defaults to above, and fixed and below are stored and labeled',()=>{
 const x=mock();
 assert.equal(x.node('customBasicMode').value,'above');
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='95';
 x.click('customAddBasic');
 assert.equal(x.state.customBasicRules.get('生命力').mode,'above');
 assert(x.node('custom-basic-list').innerHTML.includes('生命力 95以上'));
 x.click('remove',{kind:'basic',key:'生命力'});
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='96';
 x.node('customBasicMode').value='exact';x.click('customAddBasic');
 assert.equal(x.state.customBasicRules.get('生命力').value,96);
 assert(x.node('custom-basic-list').innerHTML.includes('生命力 96固定'));
 x.node('customBasicName').value='器用さ';x.node('customBasicValue').value='75';
 x.node('customBasicMode').value='below';x.click('customAddBasic');
 assert(x.node('custom-basic-list').innerHTML.includes('器用さ 75以下'));
});
test('special mode defaults to acquire, and exclusion uses the same selection field',()=>{
 const x=mock();
 const lower=D.special.findIndex(s=>s[1]==='アクションスキル○');
 const upper=D.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert(lower>=0&&upper>=0);
 assert.equal(x.node('customSpecialMode').value,'required');
 x.node('customSpecialName').value=String(lower);x.click('customAddSpecial');
 assert(x.state.customRequiredSpecials.has(lower));
 x.node('customSpecialName').value=String(upper);
 x.node('customSpecialMode').value='forbidden';x.click('customAddSpecial');
 assert(x.state.customForbiddenSpecials.has(upper));
 assert(x.node('custom-special-list').innerHTML.includes('取得しない'));
 x.click('remove',{kind:'forbidden',key:String(upper)});
 assert(!x.state.customForbiddenSpecials.has(upper));
});
test('owned special choices and dual-exclusive attack are filtered from candidates',()=>{
 const x=mock();
 const own=D.special.findIndex(s=>s[1]==='癒やしの心');
 assert(own>=0);
 assert(x.node('customSpecialName').innerHTML.includes('癒やしの心'));
 x.owned.add(own);
 vm.runInContext('renderCustomConditions()',x.state);
 assert(!x.node('customSpecialName').innerHTML.includes('癒やしの心'));
 assert(!x.node('customSpecialName').innerHTML.includes('通常攻撃(双剣士)'));
 x.state.job.value='双剣士';
 vm.runInContext('renderCustomConditions()',x.state);
 assert(x.node('customSpecialName').innerHTML.includes('通常攻撃(双剣士)'));
});
test('academy/job required before accepting constraints',()=>{
 const x=mock({ready:false});
 assert(x.node('customBasicName').disabled);
 assert(x.node('customBasicValue').disabled);
 assert(x.node('customSpecialName').disabled);
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='95';x.click('customAddBasic');
 assert.equal(x.state.customBasicRules.size,0);
});
test('clearing conditions resets defaults, validation respects current value and upper cap',()=>{
 const x=mock();
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='80';
 x.node('customBasicMode').value='exact';x.click('customAddBasic');
 assert.equal(x.state.customBasicRules.size,0);
 assert(x.node('customCalcMessage').textContent.includes('現在値'));
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='120';x.click('customAddBasic');
 assert(x.node('customCalcMessage').textContent.includes('上限'));
 x.node('customBasicName').value='生命力';x.node('customBasicValue').value='100';x.click('customAddBasic');
 assert.equal(x.state.customBasicRules.size,1);
 x.click('customClearAll');
 assert.equal(x.state.customBasicRules.size,0);
 assert.equal(x.node('customBasicMode').value,'above');
 assert.equal(x.node('customSpecialMode').value,'required');
});
test('payload and cache include all constraint modes',()=>{
 assert(ui.includes('basicRules:Object.fromEntries(customBasicRules)'));
 assert(ui.includes('JSON.stringify(constraintsKey)'));
 assert(ui.includes('customConditionsSummaryHtml()+comparisonHtml(entries)'));
 assert(!ui.includes('minimumBasics:Object.fromEntries(customMinimumBasics)'));
});
