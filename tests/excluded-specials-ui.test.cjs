'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'script.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const begin=ui.indexOf('function escapeCustomText(value){');
const finish=ui.indexOf('function plannedExpNeedsConfirmation(){',begin);
assert(begin>=0&&finish>begin,'custom calculation code block not found');
const code=ui.slice(begin,finish);
const dataContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),dataContext);
const D=dataContext.window.PAWAADO_DATA;
const mutualGroups=vm.runInNewContext(ui.match(/const mutualGroups=(\[[\s\S]*?\]);/)[1]);
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
   'customClearAll','customCalcMessage','custom-basic-list','custom-special-list'];
 ids.forEach(node);
 node('basic_生命力').value='90';
 const state={D,customBasicRules:new Map(),customRequiredSpecials:new Set(),customForbiddenSpecials:new Set(),
   basicNames:['生命力','パワー','魔力','器用さ','耐久力','精神力'],
   mutualGroups,specialNameIndex:new Map(D.special.map((row,index)=>[String(row[1]),index])),
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
 const change=id=>node('customCalcCard').handlers.change({target:node(id)});

 const enter=id=>node(id).handlers.keydown({key:'Enter',preventDefault(){}});

 return {state,dom,node,owned,click,change,enter};
}
test('custom condition section and usage are concise',()=>{
  assert(html.includes('<h2 id="customCalcTitle">こだわり条件</h2>'));
  assert(/id="customBasicValue"[^>]*type="number"[^>]*aria-label="基本能力の指定値"/.test(html));
  assert(/id="customBasicValue"[^>]*placeholder="数値"/.test(html));
  const usage=html.match(/<ol class="usage-list">([\s\S]*?)<\/ol>/);
  assert(usage,'usage list exists');
  assert.equal((usage[1].match(/<li>/g)||[]).length,3,'usage has three steps');
  assert(usage[1].includes('「計算する」を押すと、査定が最大となる組合せが表示されます。'));
  assert(usage[1].includes('各訓練後の経験点パターンにて比較できます。'));
  assert(usage[1].includes('「訓練後の付与予定経験点」を入力すると、その経験点を各パターンに加算し、査定が最大となるパターンと組合せが表示されます。'));
  assert(usage[1].includes('「こだわり条件」で基本能力や特殊能力に条件を設定することもできます。'));
  assert(!usage[1].includes('「こだわり計算」では'));
  assert(ui.includes('<h3>こだわり条件</h3>'));
});

test('custom conditions share compact vertical spacing with the super-ability card',()=>{
  // The preceding section heading is also a div, so :first-of-type would leave a duplicate rule.
  assert(css.includes('.custom-calc-card>.section-heading+.custom-condition-group{border-top:0;padding-top:0}'));
  assert(!css.includes('.custom-condition-group:first-of-type{'));
  assert(css.includes('.custom-calc-card>.section-heading{margin-bottom:8px}'));
  assert(css.includes('.custom-condition-group{padding:8px 0 6px;border-top:1px solid #dcc4a0}'));
  assert(css.includes('.custom-calc-card>.custom-condition-group:last-of-type{padding-bottom:0}'));
  assert(css.includes('.custom-condition-group h3{font-size:16px;color:#53391e;margin:0 0 6px}'));
  assert(css.includes('.custom-condition-select .custom-select-button{height:52px;min-height:52px'));
  assert(css.includes('.custom-condition-options input{width:100%;min-width:0;height:52px;min-height:52px'));
});
test('custom basic ability controls stay on one row on desktop and iPhone',()=>{
 assert(html.includes('class="custom-condition-inputs custom-basic-inputs"'));
 assert(html.includes('class="custom-condition-options"'));
 const outer=css.match(/\.custom-basic-inputs\{([^}]*)\}/)?.[1]||'';
 const nested=css.match(/\.custom-basic-inputs \.custom-condition-options\{([^}]*)\}/)?.[1]||'';
 assert(outer.includes('grid-template-columns:minmax(0,1.05fr) minmax(0,1.65fr)'),outer);
 assert(nested.includes('grid-template-columns:minmax(0,.65fr) minmax(0,1.05fr)'),nested);
 assert(css.includes('.custom-basic-inputs .custom-select-button span{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'));
 assert(css.includes('.custom-basic-inputs .custom-select-button::after{right:8px'));
 assert(css.includes('@media(max-width:370px){\n  .custom-basic-inputs,.custom-basic-inputs .custom-condition-options{gap:4px}'));
 assert(html.includes('id="customBasicValue"'));
 assert(html.includes('id="customBasicMode"'));
});
test('custom controls retain standard dropdown options',()=>{
 for(const id of ['customBasicName','customBasicMode','customSpecialName','customSpecialMode']){
   assert(html.includes('id="'+id+'SelectButton"'));
 }
 assert(!html.includes('custom-calc-intro'));
 for(const item of ['<option value="above">以上</option>','<option value="exact">固定</option>','<option value="below">以下</option>','<option value="required">取得する</option>','<option value="forbidden">取得しない</option>'])assert(html.includes(item));
 assert(!html.includes('id="excludeSpecialSelect"'));
});
test('basic conditions add when all values are complete and use updated mode',()=>{
 const x=mock();
 assert.equal(x.node('customBasicMode').value,'');
 x.node('customBasicName').value='生命力';x.change('customBasicName');
 x.node('customBasicValue').value='9';
 assert.equal(x.state.customBasicRules.size,0,'typing 9 has not confirmed a value');
 x.node('customBasicMode').value='above';x.change('customBasicMode');
 assert.equal(x.state.customBasicRules.get('生命力').value,9);
 assert(x.node('custom-basic-list').innerHTML.includes('生命力 9以上'));
 assert.equal(x.node('customBasicName').value,'');
 assert.equal(x.node('customBasicMode').value,'');
 assert.equal(x.node('customBasicModeSelectText').textContent,'条件を選択');
 assert.equal(x.node('customBasicValue').value,'');
 x.click('remove',{kind:'basic',key:'生命力'});
 x.node('customBasicName').value='生命力';x.change('customBasicName');
 x.node('customBasicMode').value='exact';x.change('customBasicMode');
 x.node('customBasicValue').value='96';x.change('customBasicValue');
 assert.equal(x.state.customBasicRules.get('生命力').value,96);
 assert(x.node('custom-basic-list').innerHTML.includes('生命力 96固定'));
 x.node('customBasicName').value='器用さ';x.change('customBasicName');
 x.node('customBasicMode').value='below';x.change('customBasicMode');
 x.node('customBasicValue').value='75';x.enter('customBasicValue');
 assert(x.node('custom-basic-list').innerHTML.includes('器用さ 75以下'));
});
test('special conditions add in either order, and reset the selection after each addition',()=>{
 const x=mock();
 const lower=D.special.findIndex(s=>s[1]==='アクションスキル○');
 const upper=D.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert(lower>=0&&upper>=0);
 assert.equal(x.node('customSpecialMode').value,'');
 x.node('customSpecialName').value=String(lower);x.change('customSpecialName');
 assert.equal(x.state.customRequiredSpecials.size,0);
 x.node('customSpecialMode').value='required';x.change('customSpecialMode');
 assert(x.state.customRequiredSpecials.has(lower));
 assert.equal(x.node('customSpecialName').value,'');
 assert.equal(x.node('customSpecialMode').value,'');
 assert.equal(x.node('customSpecialModeSelectText').textContent,'条件を選択');
 x.node('customSpecialMode').value='forbidden';x.change('customSpecialMode');
 x.node('customSpecialName').value=String(upper);x.change('customSpecialName');
 assert(x.state.customForbiddenSpecials.has(upper));
 assert(x.node('custom-special-list').innerHTML.includes('取得しない'));
 x.click('remove',{kind:'forbidden',key:String(upper)});
 assert(!x.state.customForbiddenSpecials.has(upper));
});
test('owned abilities and job-exclusive skills remain filtered',()=>{
 const x=mock(),own=D.special.findIndex(s=>s[1]==='癒やしの心');
 assert(own>=0);
 assert(x.node('customSpecialName').innerHTML.includes('癒やしの心'));
 x.owned.add(own);vm.runInContext('renderCustomConditions()',x.state);
 assert(!x.node('customSpecialName').innerHTML.includes('癒やしの心'));
 assert(!x.node('customSpecialName').innerHTML.includes('通常攻撃(双剣士)'));
 x.state.job.value='双剣士';vm.runInContext('renderCustomConditions()',x.state);
 assert(x.node('customSpecialName').innerHTML.includes('通常攻撃(双剣士)'));
});
test('academy/job required to add a condition',()=>{
 const x=mock({ready:false});
 assert(x.node('customBasicName').disabled);
 assert(x.node('customBasicValue').disabled);
 assert(x.node('customSpecialName').disabled);
 x.node('customBasicName').value='生命力';
 x.node('customBasicValue').value='95';
 x.node('customBasicMode').value='above';
 x.change('customBasicMode');
 assert.equal(x.state.customBasicRules.size,0);
});
test('invalid condition values do not add and clear-all resets defaults',()=>{
 const x=mock();
 x.node('customBasicName').value='生命力';
 x.node('customBasicMode').value='exact';
 x.node('customBasicValue').value='80';x.change('customBasicValue');
 assert.equal(x.state.customBasicRules.size,0);
 assert(x.node('customCalcMessage').textContent.includes('現在値'));
 x.node('customBasicValue').value='120';x.change('customBasicValue');
 assert(x.node('customCalcMessage').textContent.includes('上限'));
 x.node('customBasicValue').value='100';x.change('customBasicValue');
 assert.equal(x.state.customBasicRules.size,1);
 x.click('customClearAll');
 assert.equal(x.state.customBasicRules.size,0);
 assert.equal(x.node('customBasicMode').value,'');
 assert.equal(x.node('customSpecialMode').value,'');
});
test('Add buttons are absent, but both mode placeholders exist',()=>{
 for(const id of ['customAddBasic','customAddSpecial'])assert(!html.includes('id="'+id+'"'));
 assert(html.includes('<option value="">条件を選択</option>'));
 assert.equal((html.match(/<option value="">条件を選択<\/option>/g)||[]).length,2,'both basic and special modes show 条件を選択');
});
test('mutually exclusive special abilities disappear after either one is required and return when removed',()=>{
 for(const pair of mutualGroups){
  const a=pair[0],b=pair[1],x=mock();
  const ai=D.special.findIndex(s=>s[1]===a),bi=D.special.findIndex(s=>s[1]===b);
  assert(ai>=0&&bi>=0,a+' '+b);
  assert(x.node('customSpecialName').innerHTML.includes(b));
  x.node('customSpecialName').value=String(ai);x.change('customSpecialName');
  x.node('customSpecialMode').value='required';x.change('customSpecialMode');
  assert(x.state.customRequiredSpecials.has(ai));
  assert(!x.node('customSpecialName').innerHTML.includes('>'+b+'</option>'),b+' should disappear');
  assert(!vm.runInContext('customSpecialAvailable('+bi+')',x.state));
  x.click('remove',{kind:'required',key:String(ai)});
  assert(x.node('customSpecialName').innerHTML.includes('>'+b+'</option>'),b+' should return');
 }
});
test('requiring ◎ hides its prerequisite ○, while requiring ○ still permits optional ◎',()=>{
 const x=mock(),lower=D.special.findIndex(s=>s[1]==='アクションスキル○'),
 upper=D.special.findIndex(s=>s[1]==='アクションスキル◎');
 assert(lower>=0&&upper>=0);
 x.node('customSpecialName').value=String(upper);x.change('customSpecialName');
 x.node('customSpecialMode').value='required';x.change('customSpecialMode');
 assert(x.state.customRequiredSpecials.has(upper));
 assert(!x.node('customSpecialName').innerHTML.includes('>アクションスキル○</option>'));
 x.click('remove',{kind:'required',key:String(upper)});
 assert(x.node('customSpecialName').innerHTML.includes('>アクションスキル○</option>'));
 x.node('customSpecialMode').value='required';x.change('customSpecialMode');
 x.node('customSpecialName').value=String(lower);x.change('customSpecialName');
 assert(x.state.customRequiredSpecials.has(lower));
 assert(x.node('customSpecialName').innerHTML.includes('>アクションスキル◎</option>'));
});
test('forbidding ○ removes dependent ◎; forbidding ◎ leaves independent ○ available',()=>{
 const x=mock(),lower=D.special.findIndex(s=>s[1]==='物理攻撃○'),
 upper=D.special.findIndex(s=>s[1]==='物理攻撃◎');
 assert(lower>=0&&upper>=0);
 x.node('customSpecialName').value=String(lower);x.change('customSpecialName');
 x.node('customSpecialMode').value='forbidden';x.change('customSpecialMode');
 assert(x.state.customForbiddenSpecials.has(lower));
 assert(!x.node('customSpecialName').innerHTML.includes('>物理攻撃◎</option>'));
 x.click('remove',{kind:'forbidden',key:String(lower)});
 assert(x.node('customSpecialName').innerHTML.includes('>物理攻撃◎</option>'));
 x.node('customSpecialName').value=String(upper);x.change('customSpecialName');
 x.node('customSpecialMode').value='forbidden';x.change('customSpecialMode');
 assert(x.node('customSpecialName').innerHTML.includes('>物理攻撃○</option>'));
});
test('payload and cache include all constraint modes',()=>{
 assert(ui.includes('basicRules:Object.fromEntries(customBasicRules)'));
 assert(ui.includes('JSON.stringify(constraintsKey)'));
 assert(ui.includes('customConditionsSummaryHtml()+comparisonHtml(entries)'));
 assert(!ui.includes('minimumBasics:Object.fromEntries(customMinimumBasics)'));
});
