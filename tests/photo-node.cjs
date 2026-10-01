// Node-side OCR/parser regression test.
// Scope: deterministic parser/template logic and optional raw-image OCR.
// Browser/UI behavior belongs in photo-browser.cjs; scoring math belongs in scoring.cjs.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const modulePaths=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,root].filter(Boolean);
const req=name=>require(require.resolve(name,{paths:modulePaths}));
const {createCanvas,Image}=req('@napi-rs/canvas');
const Tesseract=req('tesseract.js');

process.chdir(root);

const nodes=new Map();
function node(){
  return {
    style:{},
    prepend(){},
    appendChild(){},
    addEventListener(){},
    classList:{},
    querySelector(){return node();}
  };
}
const document={
  createElement:tag=>tag==='canvas'?createCanvas(1,1):node(),
  getElementById:id=>{
    if(!nodes.has(id)) nodes.set(id,node());
    return nodes.get(id);
  },
  querySelector:()=>node(),
  head:node()
};

let worker;
const context={document,Image,console,Set,Map,URL,window:null};
context.window=context;
context.Tesseract={
  createWorker:async()=>{
    worker=await Tesseract.createWorker('jpn',1,{
      langPath:path.join(root,'vendor/ocr/lang'),
      gzip:false
    });
    return {
      setParameters:params=>worker.setParameters(params),
      reinitialize:(...args)=>worker.reinitialize(...args),
      recognize:canvas=>worker.recognize(canvas.toBuffer('image/png')),
      terminate:()=>worker.terminate()
    };
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('data.js','utf8'),context);
vm.runInContext(fs.readFileSync('photo_import.js','utf8'),context);

const api=context.__PAWAADO_PHOTO_TEST__;

// Upper abilities must deterministically imply their lower abilities.
// This coverage lives only here so the browser test stays an end-to-end smoke test.
for(const [name,lowers] of Object.entries(context.PAWAADO_DATA.superPrerequisites)){
  const parsed=api.findSpecials(name);
  assert.deepEqual(parsed.supers.map(entry=>entry.name),[name],name);
  for(const lower of lowers){
    assert.ok(parsed.specials.includes(lower),`${name} -> ${lower}`);
  }
}
{
  const parsed=api.findSpecials('鉄人Lv2\n超免疫Lv1\n魔法攻撃◎\n慈愛の祈りLv2');
  assert.deepEqual(parsed.supers,[
    {name:'鉄人',level:2},
    {name:'超免疫',level:1},
    {name:'慈愛の祈り',level:2}
  ]);
  assert.deepEqual(
    new Set(parsed.specials),
    new Set(['魔法攻撃◎','魔法攻撃○','ケガしにくさ◎','ケガしにくさ○','免疫強化'])
  );
}
assert.deepEqual(api.findSpecials('烈火').supers,[]);
assert.equal(api.cellAbility('叶').supers.length,0);

// ○/◎ handling: text OCR identifies the stem; the supplied visual mark decides the tier.
{
  const doubleCircle=api.cellAbility('対ヌメリン⑥');
  assert.ok(doubleCircle.specials.includes('対ヌメリン◎'));
  assert.ok(doubleCircle.specials.includes('対ヌメリン○'));
}
assert.ok(api.cellAbility('対ウンディーネ○').specials.includes('対ウンディーネ○'));
assert.deepEqual(api.findSpecials('無頼漢の教えLv1').supers,[{name:'無頼漢の教え',level:1}]);
assert.ok(!api.findSpecials('通常攻撃(双剣士)').specials.includes('通常攻撃(双剣士)'));

// Known OCR confusions from real screenshots.
assert.equal(api.jobFromText('双刻直').job,'双剣士');
for(const [ocr,name] of [
  ['忍','忍耐'],
  ['園当本能','闘争本能'],
  ['手心の摘え','無心の構え'],
  ['防御胡勢','防御態勢'],
  ['苔しみ','慈しみ']
]){
  assert.ok(api.cellAbility(ocr).specials.includes(name),`${ocr} -> ${name}`);
}
for(const [ocr,name] of [
  ['対魔法使いら','対魔法使い◎'],
  ['対オーク6','対オーク◎'],
  ['対ヌメリン','対ヌメリン◎'],
  ['対ハービー','対ハービー◎'],
  ['ケガしにくさ','ケガしにくさ◎']
]){
  const parsed=api.cellAbility(ocr,'◎');
  assert.ok(parsed.specials.includes(name),`${ocr} -> ${name}`);
}
{
  const parsed=api.cellAbility('ーー珠一一','',true);
  assert.deepEqual(parsed.supers.map(entry=>entry.name),['烈']);
  assert.ok(parsed.specials.includes('列攻撃◎'));
  assert.ok(parsed.specials.includes('列攻撃○'));
}

(async()=>{
  try{
    const images=[];
    for(const name of process.argv.slice(2)){
      const image=new Image();
      image.src=fs.readFileSync(path.resolve(name));
      await image.decode();
      images.push(image);
    }

    if(images.length){
      const result=await api.readImages(images);
      console.log(JSON.stringify(result,null,2));

      if(process.env.NEW_FIXTURE){
        assert.deepEqual(
          JSON.parse(JSON.stringify(result.basic)),
          {生命力:7,パワー:9,魔力:8,器用さ:9,耐久力:51,精神力:50}
        );
        assert.ok(result.specials.includes('通常攻撃◎'));
        assert.ok(result.specials.includes('単体攻撃◎'));
        assert.ok(result.specials.includes('物理防御◎'));
        assert.ok(!result.supers.some(entry=>entry.name==='烈'));
        assert.equal(result.job,'魔法使い');
        assert.deepEqual(
          JSON.parse(JSON.stringify(result.exp)),
          {筋力:15,敏捷:33,技術:125,知力:2,精神:2}
        );
        assert.ok(!result.warnings.some(warning=>
          warning.includes('画像間で異なります') ||
          warning.includes('確認が必要な特殊能力の文字')
        ));
      }
    }

    console.log('PASS OCR/parser unit regressions');
  }finally{
    if(worker) await worker.terminate();
  }
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
