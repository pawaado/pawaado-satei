/* Screenshot import. OCR and image comparison run locally in the browser. */
(() => {
  'use strict';
  const D=window.PAWAADO_DATA;
  const BASICS=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  const EXPS=['筋力','敏捷','技術','知力','精神'];
  const ACADEMIES=[...new Set(D.academies.map(r=>r[0]))];
  const JOBS=[...new Set(D.academies.map(r=>r[1]))];
  const SUPER_NAMES=[...new Set([...Object.keys(D.superResistances),...Object.keys(D.superPrerequisites)])];
  const REFERENCES=[['パワフルアカデミー','powerful'],['タテレスキュアアカデミー','tateless'],['カジナイトアカデミー','kaji'],['ブートレインアカデミー','bootrain']];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s).normalize('NFKC').replace(/\s/g,'').replace(/[〇◯]/g,'○');
  const section=document.createElement('section'); section.className='card photo-card';
  section.innerHTML=`<h2>スクショから入力</h2><p>①「基本能力」画面と、②「能力データ」画面を選んでください。特殊能力の続きも追加できます。</p>
    <label class="photo-picker">ゲームのスクショを選ぶ<input id="photoFiles" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>
    <p class="photo-note">画像は端末内で読み取ります。加工・切り抜きしていない横向きのスクショを使ってください。</p>
    <div id="photoPreviews"></div><button id="readPhotos" type="button" disabled>画像を読み取る</button>
    <p id="photoStatus" role="status" aria-live="polite"></p><div id="photoReview" hidden></div>`;
  document.querySelector('main').prepend(section);
  const style=document.createElement('style');style.textContent=`
    .photo-card p{line-height:1.65}.photo-picker{display:block;padding:18px;border:2px dashed #a47842;border-radius:12px;background:#fff6dc;font-weight:700;cursor:pointer}
    .photo-picker input{display:block;width:100%;margin-top:10px;font-size:16px}.photo-note{font-size:13px;color:#70563c}
    #photoPreviews{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}#photoPreviews img{width:100%;border-radius:8px}
    #photoPreviews p{margin:2px 0;font-size:12px;overflow-wrap:anywhere}.photo-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .photo-review-grid label,.super-controls label{display:grid;gap:5px;min-width:0}.photo-review-grid input,.photo-review-grid select,.super-controls select{width:100%;min-width:0;font-size:16px;min-height:44px;padding:6px}
    .photo-specials{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:320px;overflow:auto;padding:8px;border:1px solid #b58a52;border-radius:8px}
    .photo-specials label{display:flex;align-items:center;gap:5px;min-height:40px;font-size:14px}.photo-specials input{width:20px;height:20px;flex-shrink:0}
    .photo-warning{color:#9d3019;font-weight:700}.photo-super-row{display:flex;gap:8px;align-items:center;margin:8px 0}.photo-super-row select{min-height:44px;font-size:16px;min-width:0}.photo-super-name{flex:1;width:0}.photo-super-level{width:64px;flex:none}.photo-remove-super{width:42px;flex:none;padding:4px}
    #photoReview[hidden]{display:none}#photoReview h3{margin-top:20px}.super-controls{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:8px;margin-bottom:10px}.super-note{font-size:13px}
    #applyPhotos{margin-top:14px;width:100%}.photo-confirm{display:flex;align-items:flex-start;gap:8px;margin-top:16px}.photo-confirm input{width:22px;height:22px;flex-shrink:0}
  `;document.head.appendChild(style);
  const el=id=>document.getElementById(id);
  let files=[],urls=[],busy=false,worker=null,workerLanguage='jpn',review=null;
  const status=t=>{el('photoStatus').textContent=t;};
  const imageFrom=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('画像を開けませんでした。PNGまたはJPEGでお試しください。'));im.src=src;});
  function canvasCrop(image,rect,scale=3){
    const c=document.createElement('canvas'),r=rect.map((v,i)=>v*(i%2?image.height/706:image.width/1536));
    c.width=Math.round(r[2]*scale);c.height=Math.round(r[3]*scale);
    c.getContext('2d').drawImage(image,...r,0,0,c.width,c.height);return c;
  }
  function vector(image){
    const c=document.createElement('canvas');c.width=32;c.height=32;
    c.getContext('2d').drawImage(image,0,0,32,32);return c.getContext('2d').getImageData(0,0,32,32).data;
  }
  const layoutRefs={};
  async function matchesTemplate(image,name,rect){
    layoutRefs[name] ||= imageFrom('./assets/'+name+'.png').then(vector);
    const a=vector(canvasCrop(image,rect,1)),b=await layoutRefs[name];let error=0;
    for(let i=0;i<a.length;i++)if(i%4!==3)error+=(a[i]-b[i])**2;
    return error/(32*32*3)<900;
  }
  let refs;
  async function academyOf(image){
    refs ||= Promise.all(REFERENCES.map(async ([name,file])=>({name,pixels:vector(await imageFrom(`./assets/academies/${file}.png`))})));
    const pixels=vector(canvasCrop(image,[417,280,104,115],1));
    const scores=(await refs).map(ref=>{let error=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)error+=(pixels[i]-ref.pixels[i])**2;return {name:ref.name,error:error/(32*32*3)};}).sort((a,b)=>a.error-b.error);
    return scores[0].error<1400 && scores[1].error>scores[0].error*1.35?scores[0].name:'';
  }
  async function getWorker(){
    if(worker) return worker;
    if(!window.Tesseract) await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/ocr/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('読み取り機能を読み込めませんでした。通信状態を確認してください。'));document.head.appendChild(s);});
    status('初回の読み取り準備中…');workerLanguage='jpn';
    worker=await Tesseract.createWorker('jpn',1,{workerPath:'./vendor/ocr/worker.min.js',corePath:'./vendor/ocr',langPath:'./vendor/ocr/lang',gzip:false});
    return worker;
  }
  async function textAt(image,rect,digits=false,white=false){
    const w=await getWorker();
    const language=digits?'eng':'jpn';if(workerLanguage!==language){await w.reinitialize(language);workerLanguage=language;}
    await w.setParameters({tessedit_pageseg_mode:digits?'7':'6',tessedit_char_whitelist:digits?'0123456789':'',preserve_interword_spaces:'1'});
    let input=canvasCrop(image,rect,1);
    if(!digits){const ctx=input.getContext('2d'),im=ctx.getImageData(0,0,input.width,input.height);for(let i=0;i<im.data.length;i+=4){const black=white?Math.min(im.data[i],im.data[i+1],im.data[i+2])>150:Math.max(im.data[i],im.data[i+1],im.data[i+2])<170;im.data[i]=im.data[i+1]=im.data[i+2]=black?0:255;}ctx.putImageData(im,0,0);}
    const big=document.createElement('canvas');big.width=input.width*3+40;big.height=input.height*3+40;const ctx=big.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,big.width,big.height);ctx.drawImage(input,20,20,input.width*3,input.height*3);
    let {data}=await w.recognize(big);
    if(digits&&(!/^\d{1,4}$/.test(data.text.trim())||data.confidence<40)){
      for(const mode of ['8','13']){
        await w.setParameters({tessedit_pageseg_mode:mode});
        const attempt=(await w.recognize(big)).data;
        if(/^\d{1,4}$/.test(attempt.text.trim())&&attempt.confidence>=40){data=attempt;break;}
      }
    }
    return {text:data.text.trim(),confidence:data.confidence};
  }
  async function numericRow(image,rects){
    const result=[];
    for(const rect of rects){const r=await textAt(image,rect,true);result.push(/^\d{1,4}$/.test(r.text)&&r.confidence>=40?Number(r.text):null);}
    return result;
  }
  function distance(a,b){
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,prev[j+1]+1,prev[j]+(a[i]===b[j]?0:1)));prev=next;}return prev[b.length];
  }
  function findSpecials(text){
    const lines=text.split(/\n/).map(normalize);
    const specials=[],supers=[],unknown=[];
    const names=D.special.map(s=>s[1]).filter(n=>n!=='通常攻撃（双剣士）');
    for(const line of lines){
      if(!line || line==='未修得')continue;
      let remaining=line;
      for(const name of SUPER_NAMES.slice().sort((a,b)=>b.length-a.length)){
        if(!remaining.includes(normalize(name)))continue;
        if(name.length===1&&!new RegExp('^'+name+'(?:(?:Lv\\.?|レベル)[12])?$','i').test(remaining))continue;
        const tail=remaining.slice(remaining.indexOf(normalize(name))+normalize(name).length);
        const level=tail.match(/^(?:Lv\.?|LV\.?|lv\.?|レベル)([12])/i)?.[1];
        supers.push({name,level:level?Number(level):null});remaining=remaining.replace(normalize(name),'').replace(/(?:Lv\.?|レベル)[12]/gi,'');
      }
      for(const name of names.sort((a,b)=>b.length-a.length)){
        if(remaining.includes(normalize(name))){specials.push(name);remaining=remaining.replace(normalize(name),'');}
      }
      if(remaining.replace(/[\s|,、:：・]/g,'')){
        const candidates=names.filter(n=>normalize(n).length>=4&&normalize(n).slice(-1)===remaining.slice(-1)&&distance(normalize(n),remaining)===1);
        if(candidates.length===1){specials.push(candidates[0]);unknown.push(line+' → '+candidates[0]+'（候補・要確認）');}
        else unknown.push(line);
      }
    }
    const owned=new Set(specials);
    const addOwned=name=>{if(owned.has(name))return;owned.add(name);const lower=D.special.find(s=>s[1]===name)?.[2];if(lower&&D.special.some(s=>s[1]===lower))addOwned(lower);};
    // Explicit ◎ and recognized super abilities both imply their ○ prerequisite.
    for(const name of specials){const lower=D.special.find(s=>s[1]===name)?.[2];if(lower&&D.special.some(s=>s[1]===lower))addOwned(lower);}
    for(const entry of supers)for(const name of D.superPrerequisites[entry.name]||[])addOwned(name);
    return {specials:[...owned],supers,unknown};
  }
  async function readImages(images){
    const out={academy:'',job:'',exp:{},basic:{},specials:[],supers:[],warnings:[],abilityScreens:0,basicScreens:0};
    function mergeField(target,key,value,label){
      if(value==null||value==='')return;
      if(target[key]!=null&&target[key]!==''&&target[key]!==value){target[key]=null;out.warnings.push(label+'が画像間で異なります。同じ育成時点の画像を使ってください。');}
      else target[key]=value;
    }
    for(let i=0;i<images.length;i++){
      const image=images[i];status(`${i+1}/${images.length}枚目を読み取り中…`);
      if(Math.abs(image.width/image.height-1536/706)>0.06){out.warnings.push(`${i+1}枚目は画面比率が異なるため読み取れませんでした。`);continue;}
      if(await matchesTemplate(image,'modal',[670,55,220,45])){
        out.abilityScreens++;
        mergeField(out,'academy',await academyOf(image),'アカデミー');
        const values=await numericRow(image,BASICS.map((_,j)=>[267+72.5*j,513,45,18]));
        BASICS.forEach((n,j)=>mergeField(out.basic,n,values[j],n));
        const result=findSpecials((await textAt(image,[708,274,566,260])).text);
        out.specials.push(...result.specials);out.supers.push(...result.supers);
        if(result.unknown.length)out.warnings.push('確認が必要な特殊能力の文字：'+result.unknown.join('／'));
      }else{
        if(!await matchesTemplate(image,'basic',[748,104,141,39])){out.warnings.push(`${i+1}枚目は対応画面を判別できませんでした。`);continue;}
        out.basicScreens++;
        const jobText=normalize((await textAt(image,[685,22,165,32],false,true)).text);
        let jobMatch=await matchesTemplate(image,'swordsman',[685,22,165,32])?'剣士':JOBS.find(j=>jobText===normalize(j))||'';
        if(!jobMatch){const candidates=JOBS.filter(j=>distance(normalize(j),jobText.replace(/[|｜]/g,''))===1);if(candidates.length===1){jobMatch=candidates[0];out.warnings.push('ジョブの候補：'+jobMatch+'（要確認）');}}
        mergeField(out,'job',jobMatch,'ジョブ');
        const exp=await numericRow(image,EXPS.map((_,j)=>[981+60*j,228,49,21]));
        EXPS.forEach((n,j)=>mergeField(out.exp,n,exp[j],n+'経験点'));
        const basic=await numericRow(image,BASICS.map((_,j)=>[182+88.5*j,214,50,18]));
        BASICS.forEach((n,j)=>mergeField(out.basic,n,basic[j],n));
      }
    }
    out.specials=[...new Set(out.specials)];
    const superMap=new Map();for(const s of out.supers){const old=superMap.get(s.name);if(old&&old.level!==s.level){s.level=null;out.warnings.push(s.name+'のLvを確認してください。');}superMap.set(s.name,s);}out.supers=[...superMap.values()];
    if(!out.basicScreens)out.warnings.push('基本能力画面がありません。ジョブと経験点を確認してください。');
    if(!out.abilityScreens)out.warnings.push('能力データ画面がありません。アカデミーと取得済み特殊能力を確認してください。');
    return out;
  }
  const options=(items,value)=>'<option value="">確認・選択してください</option>'+items.map(n=>`<option value="${escape(n)}" ${n===value?'selected':''}>${escape(n)}</option>`).join('');
  function showReview(data){
    review=data;const box=el('photoReview');box.hidden=false;
    box.innerHTML=`<h3>読み取り結果を確認</h3><p>空欄・誤読があれば修正してください。特殊能力は写っているものだけを読み取ります。</p>
      ${data.warnings.map(w=>`<p class="photo-warning">${escape(w)}</p>`).join('')}
      <div class="photo-review-grid"><label>アカデミー<select id="photoAcademy">${options(ACADEMIES,data.academy)}</select></label><label>ジョブ<select id="photoJob">${options(JOBS,data.job)}</select></label></div>
      <h3>所持経験点</h3><div class="photo-review-grid">${EXPS.map((n,i)=>`<label>${n}<input id="photoExp${i}" type="number" min="0" inputmode="numeric" value="${data.exp[n]??''}"></label>`).join('')}</div>
      <h3>基本能力</h3><div class="photo-review-grid">${BASICS.map((n,i)=>`<label>${n}<input id="photoBasic${i}" type="number" min="1" inputmode="numeric" value="${data.basic[n]??''}"></label>`).join('')}</div>
      <h3>取得済み特殊能力</h3><p id="photoOwnedSummary"></p><details><summary>取得状態を確認・修正する</summary><div class="photo-specials">${D.special.map((s,i)=>`<label><input type="checkbox" data-photo-special="${i}" ${data.specials.includes(s[1])?'checked':''}>${escape(s[1])}</label>`).join('')}</div></details>
      <h3>取得済み超特殊能力</h3><p class="photo-note">上位能力に対応する◎・○は自動で取得済みにします。耐性のある能力はLvを選択してください。</p>
      <div id="photoSupers">${data.supers.map(s=>superRow(s)).join('')}</div><button id="photoAddSuper" class="secondary" type="button">＋超特殊能力を追加</button>
      <label class="photo-confirm"><input id="photoConfirmed" type="checkbox">特殊能力の続きも含め、読み取り結果を確認しました</label>
      <button id="applyPhotos" type="button">反映してコツを入力する</button>`;
    const summary=()=>{const names=[...box.querySelectorAll('[data-photo-special]:checked')].map(e=>D.special[Number(e.dataset.photoSpecial)][1]);el('photoOwnedSummary').textContent=names.join('／')||'取得済み能力なし（読み取り漏れがないか確認してください）';};summary();
    box.onchange=event=>{
      if(event.target.matches('.photo-super-name')){
        const row=event.target.closest('.photo-super-row');const needsLevel=!!D.superResistances[event.target.value];
        row.querySelector('.photo-super-level').disabled=!needsLevel;
        if(!needsLevel)row.querySelector('.photo-super-level').value='';
      }
      summary();
    };
    el('photoAddSuper').onclick=()=>el('photoSupers').insertAdjacentHTML('beforeend',superRow({}));
    el('photoSupers').onclick=e=>{if(e.target.matches('.photo-remove-super'))e.target.closest('.photo-super-row').remove();};
    el('applyPhotos').onclick=()=>{
      try{
        if(!el('photoConfirmed').checked)throw new Error('読み取り結果を確認し、チェックを入れてください。');
        const number=id=>el(id).value===''?null:Number(el(id).value);
        const result={academy:el('photoAcademy').value,job:el('photoJob').value,exp:Object.fromEntries(EXPS.map((n,i)=>[n,number('photoExp'+i)])),basic:Object.fromEntries(BASICS.map((n,i)=>[n,number('photoBasic'+i)])),specials:[...box.querySelectorAll('[data-photo-special]:checked')].map(e=>D.special[Number(e.dataset.photoSpecial)][1]),supers:[]};
        for(const row of el('photoSupers').children){const name=row.querySelector('.photo-super-name').value,level=Number(row.querySelector('.photo-super-level').value);if(!name)throw new Error('超特殊能力の名前を選択してください。');const def=D.superResistances[name];if(def&&![1,2].includes(level))throw new Error('耐性のある超特殊能力のLvを選択してください。');if(result.supers.some(s=>s.name===name))throw new Error('超特殊能力が重複しています。');if(def?.job&&def.job!==result.job)throw new Error(name+'は'+def.job+'専用です。');result.supers.push({name,level:def?level:null});}
        window.__PAWAADO_IMPORT_PHOTO__(result);
        status('反映しました。下のコツLvを入力して「計算する」を押してください。');
        el('basicCard').scrollIntoView({behavior:'smooth',block:'start'});
      }catch(error){status(error.message);}
    };
  }
  function superRow(s){return `<div class="photo-super-row"><select class="photo-super-name" aria-label="超特殊能力">${options(SUPER_NAMES,s.name)}</select><select class="photo-super-level" aria-label="超特殊能力のLv" ${s.name&&!D.superResistances[s.name]?'disabled':''}><option value="">Lv</option><option value="1" ${s.level===1?'selected':''}>1</option><option value="2" ${s.level===2?'selected':''}>2</option></select><button type="button" class="secondary photo-remove-super" aria-label="削除">×</button></div>`;}
  function clear(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];files=[];el('photoFiles').value='';el('photoPreviews').replaceChildren();el('photoReview').hidden=true;el('readPhotos').disabled=true;review=null;status('');}
  el('photoFiles').onchange=()=>{
    if(busy)return;urls.forEach(u=>URL.revokeObjectURL(u));files=[...el('photoFiles').files];urls=[];el('photoReview').hidden=true;
    if(files.length>12){status('画像は一度に12枚まで選べます。');el('readPhotos').disabled=true;return;}
    el('photoPreviews').replaceChildren();
    for(const file of files){const url=URL.createObjectURL(file);urls.push(url);const wrap=document.createElement('div'),img=document.createElement('img'),label=document.createElement('p');img.src=url;img.alt='選択したスクショ';label.textContent=file.name;wrap.append(img,label);el('photoPreviews').append(wrap);}
    el('readPhotos').disabled=!files.length;status(`${files.length}枚選択しました。`);
  };
  el('readPhotos').onclick=async()=>{
    if(busy)return;busy=true;el('readPhotos').disabled=true;el('photoFiles').disabled=true;
    try{const images=await Promise.all(urls.map(imageFrom));showReview(await readImages(images));status('読み取りが終わりました。内容を確認してください。');}
    catch(e){status('読み取りに失敗しました：'+e.message+'。手入力でも利用できます。');}
    finally{if(worker){await worker.terminate();worker=null;}busy=false;el('readPhotos').disabled=!files.length;el('photoFiles').disabled=false;}
  };
  for(const id of ['resetBtn','topResetBtn'])el(id)?.addEventListener('click',()=>{if(!busy)clear();});
  window.__PAWAADO_PHOTO_TEST__={academyOf,findSpecials,readImages};
})();
