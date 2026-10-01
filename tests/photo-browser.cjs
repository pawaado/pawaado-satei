// Browser integration regression test.
// Scope: real-image import -> live UI wiring -> planned-EXP confirmation -> reset.
// Parser/prerequisite unit coverage belongs in photo-node.cjs; scoring math belongs in scoring.cjs.
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const fixtures=process.env.PHOTO_FIXTURE_DIR;
if(!fixtures) throw new Error('Set PHOTO_FIXTURE_DIR to the folder containing IMG_0747.jpeg through IMG_0751.jpeg');

const modulePaths=[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,root].filter(Boolean);
const {chromium}=require(require.resolve('playwright',{paths:modulePaths}));
const server=spawn('python',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});

const fixture=name=>path.join(fixtures,name);

(async()=>{
  await new Promise(resolve=>setTimeout(resolve,300));
  const browser=await chromium.launch({
    headless:true,
    executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,
    args:['--no-sandbox']
  });

  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    if(process.env.DEBUG_OCR) page.on('console',message=>console.log(message.text()));

    await page.goto('http://127.0.0.1:8765/');
    await page.route('**/upload/*.jpeg',route=>{
      const name=path.basename(new URL(route.request().url()).pathname);
      return route.fulfill({path:fixture(name),contentType:'image/jpeg'});
    });
    if(process.env.DEBUG_OCR) await page.evaluate(()=>window.__PAWAADO_DEBUG_OCR__=true);

    // Academy reference-image smoke test.
    const academies=await page.evaluate(async()=>{
      const out=[];
      for(const n of [748,749,750,751]){
        const image=new Image();
        image.src='/upload/IMG_0'+n+'.jpeg';
        await image.decode();
        out.push(await __PAWAADO_PHOTO_TEST__.academyOf(image));
      }
      return out;
    });
    assert.deepEqual(academies,[
      'ブートレインアカデミー',
      'パワフルアカデミー',
      'タテレスキュアアカデミー',
      'カジナイトアカデミー'
    ]);
    console.log('PASS academy reference images');

    // Current product flow auto-applies the OCR result; there is no review/apply screen.
    await page.locator('#photoFiles').setInputFiles([
      fixture('IMG_0747.jpeg'),
      fixture('IMG_0748.jpeg')
    ]);
    await page.locator('#readPhotos').click();
    await page.waitForFunction(
      ()=>document.getElementById('photoStatus')?.textContent?.includes('自動入力しました。'),
      {timeout:90000}
    );

    assert.equal(await page.locator('#academy').inputValue(),'ブートレインアカデミー');
    assert.equal(await page.locator('#job').inputValue(),'剣士');
    assert.equal(await page.locator('#basic_生命力').inputValue(),'12');
    assert.equal(await page.locator('[data-exp-name="筋力"]').inputValue(),'690');
    assert.ok(await page.locator('#calcBtn').isEnabled());

    const magicAttackIndex=await page.evaluate(()=>PAWAADO_DATA.special.findIndex(s=>s[1]==='魔法攻撃○'));
    assert.ok(await page.locator(`.skill-row[data-index="${magicAttackIndex}"]`).evaluate(el=>el.classList.contains('owned')));
    console.log('PASS screenshot OCR auto-import');

    // Browser/UI wiring for super abilities and their lower/resistance effects.
    await page.locator('.super-name').selectOption('鉄人');
    await page.locator('.super-level').selectOption('2');
    assert.deepEqual(
      await page.evaluate(()=>__PAWAADO_GET_EXTRA_RESISTANCES__()),
      [
        {name:'鉄人',type:'物理攻撃耐性',value:7},
        {name:'鉄人',type:'魔法攻撃耐性',value:7}
      ]
    );
    const injuryIndex=await page.evaluate(()=>PAWAADO_DATA.special.findIndex(s=>s[1]==='ケガしにくさ◎'));
    assert.ok(await page.locator(`.skill-row[data-index="${injuryIndex}"]`).evaluate(el=>el.classList.contains('owned')));

    await page.locator('.super-name').selectOption('火事場の馬鹿力');
    assert.deepEqual(
      await page.evaluate(()=>__PAWAADO_GET_EXTRA_RESISTANCES__()),
      [{name:'火事場の馬鹿力',type:'被ダメージ耐性',value:-4}]
    );
    console.log('PASS super-ability UI wiring');

    // Multi-pattern calculation may intentionally omit planned EXP, but must ask first.
    await page.locator('.exp-action-btn[data-exp-action="duplicate"][data-sample-index="0"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('.exp-sample').length===2);
    assert.equal(await page.locator('[data-planned-exp-name]').count(),5);
    assert.ok(await page.locator('[data-planned-exp-name]').evaluateAll(inputs=>inputs.every(input=>input.value==='')));
    await page.waitForFunction(()=>!document.getElementById('calcBtn').disabled);

    await page.locator('#calcBtn').click();
    const confirm=page.locator('#plannedExpConfirmModal');
    await confirm.waitFor({state:'visible'});
    assert.equal(
      await page.locator('#plannedExpConfirmMessage').textContent(),
      '訓練後の付与予定経験点が入力されていませんが、問題ないですか。'
    );
    assert.equal(await page.locator('#plannedExpConfirmYes').textContent(),'はい');
    assert.equal(await page.locator('#plannedExpConfirmNo').textContent(),'いいえ');

    await page.locator('#plannedExpConfirmNo').click();
    await confirm.waitFor({state:'hidden'});
    assert.equal(await page.locator('#calcBtn').textContent(),'計算する');

    await page.locator('#calcBtn').click();
    await confirm.waitFor({state:'visible'});
    await page.locator('#plannedExpConfirmYes').click();
    await page.waitForFunction(()=>{
      const modal=document.getElementById('plannedExpConfirmModal');
      const button=document.getElementById('calcBtn');
      const result=document.getElementById('result');
      return modal?.hidden && (button?.textContent!=='計算する' || String(result?.textContent||'').trim()!=='');
    },{timeout:5000});
    const cancel=page.locator('#cancelCalcBtn');
    if(await cancel.isVisible()){
      await cancel.click();
      await page.waitForFunction(()=>document.getElementById('calcBtn')?.textContent==='計算する');
    }
    console.log('PASS planned EXP confirmation: no stops, yes proceeds');

    // Reset remains a browser smoke test; parser details are intentionally not duplicated here.
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.locator('#topResetBtn').click();
    assert.equal(await page.locator('#photoFiles').inputValue(),'');
    assert.equal(await page.locator('#academy').inputValue(),'');
    assert.equal(await page.locator('.super-name').inputValue(),'');
    assert.equal(await page.locator('#photoUncertain').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS mobile width, reset, and no page errors');
  }finally{
    await browser.close();
    server.kill();
  }
})().catch(error=>{
  console.error(error);
  server.kill();
  process.exit(1);
});
