const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const req=n=>require(require.resolve(n,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const {createCanvas,Image}=req('@napi-rs/canvas'),T=req('tesseract.js');
const root=path.resolve(__dirname,'..');process.chdir(root);
const nodes=new Map();function node(){return {style:{},prepend(){},appendChild(){},addEventListener(){},classList:{},querySelector(){return node()}};}
const document={createElement:tag=>tag==='canvas'?createCanvas(1,1):node(),getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelector:()=>node(),head:node()};
let worker;const context={document,Image,console,Set,Map,URL,window:null};context.window=context;
context.Tesseract={createWorker:async()=>{worker=await T.createWorker('jpn',1,{langPath:path.join(root,'vendor/ocr/lang'),gzip:false});return {setParameters:p=>worker.setParameters(p),reinitialize:(...a)=>worker.reinitialize(...a),recognize:c=>worker.recognize(c.toBuffer('image/png')),terminate:()=>worker.terminate()};}};
vm.createContext(context);vm.runInContext(fs.readFileSync('data.js','utf8'),context);vm.runInContext(fs.readFileSync('photo_import.js','utf8'),context);
for(const [name,lowers] of Object.entries(context.PAWAADO_DATA.superPrerequisites)){const parsed=context.__PAWAADO_PHOTO_TEST__.findSpecials(name);for(const lower of lowers)assert.ok(parsed.specials.includes(lower));}
assert.equal(context.__PAWAADO_PHOTO_TEST__.cellAbility('叶').supers.length,0);
{
  const ambiguous=context.__PAWAADO_PHOTO_TEST__.cellAbility('対ヌメリン⑥');
  assert.ok(ambiguous.specials.includes('対ヌメリン○'));
  assert.ok(!ambiguous.specials.includes('対ヌメリン◎'));
}
assert.ok(context.__PAWAADO_PHOTO_TEST__.cellAbility('対ウンディーネ○').specials.includes('対ウンディーネ○'));
assert.deepEqual(context.__PAWAADO_PHOTO_TEST__.findSpecials('無頼漢の教えLv1').supers,[{name:'無頼漢の教え',level:1}]);
assert.ok(!context.__PAWAADO_PHOTO_TEST__.findSpecials('通常攻撃(双剣士)').specials.includes('通常攻撃(双剣士)'));
(async()=>{try{const imgs=[];for(const name of process.argv.slice(2)){const im=new Image();im.src=fs.readFileSync(path.resolve(name));await im.decode();imgs.push(im);}const result=await context.__PAWAADO_PHOTO_TEST__.readImages(imgs);console.log(JSON.stringify(result,null,2));if(process.env.NEW_FIXTURE){assert.deepEqual(JSON.parse(JSON.stringify(result.basic)),{生命力:7,パワー:9,魔力:8,器用さ:9,耐久力:51,精神力:50});assert.ok(result.specials.includes('通常攻撃◎'));assert.ok(result.specials.includes('単体攻撃◎'));assert.ok(result.specials.includes('物理防御◎'));assert.ok(!result.supers.some(s=>s.name==='烈'));assert.equal(result.job,'魔法使い');assert.deepEqual(JSON.parse(JSON.stringify(result.exp)),{筋力:15,敏捷:33,技術:125,知力:2,精神:2});assert.ok(!result.warnings.some(w=>w.includes('画像間で異なります')||w.includes('確認が必要な特殊能力の文字')));} }finally{if(worker)await worker.terminate();}})().catch(e=>{console.error(e);process.exitCode=1;});
