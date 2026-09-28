/* Screenshot import. OCR and image comparison run locally in the browser. */
(() => {
  'use strict';
  const D=window.PAWAADO_DATA;
  const BASICS=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  const EXPS=['筋力','敏捷','技術','知力','精神'];
  const ACADEMIES=[...new Set(D.academies.map(r=>r[0]))];
  const JOBS=[...new Set(D.academies.map(r=>r[1]))];
  const SUPER_NAMES=[...new Set([...Object.keys(D.superResistances),...Object.keys(D.superPrerequisites)])];
  const DUAL_NORMAL_ATTACK='通常攻撃(双剣士)';
  const REFERENCES=[['パワフルアカデミー','powerful'],['タテレスキュアアカデミー','tateless'],['カジナイトアカデミー','kaji'],['ブートレインアカデミー','bootrain']];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s).normalize('NFKC').replace(/\s/g,'').replace(/[〇◯]/g,'○');
  const GENERIC_SPECIAL_NAMES=D.special.map(s=>s[1]).filter(n=>normalize(n)!==normalize(DUAL_NORMAL_ATTACK));
  const section=document.createElement('section'); section.className='card photo-card';
  section.innerHTML=`<h2>スクショから入力</h2><p>①左上に「能力アップ」と表示される画面（基本能力・特殊能力・必殺技・ジョブチェンジのどれでも可）と、②「能力データ」画面を選んでください。特殊能力の続きも追加できます。</p>
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
  async function textAt(image,rect,digits=false,white=false,single=false,threshold=false){
    const w=await getWorker();
    const language=digits?'eng':'jpn';if(workerLanguage!==language){await w.reinitialize(language);workerLanguage=language;}
    await w.setParameters({tessedit_pageseg_mode:digits||single?'7':'6',tessedit_char_whitelist:digits?'0123456789':'',preserve_interword_spaces:'1'});
    let input=canvasCrop(image,rect,1);
    const inputCtx=input.getContext('2d'),inputData=inputCtx.getImageData(0,0,input.width,input.height);
    if(digits){
      // The game uses outlined numerals. Removing colour prevents 5 from being read as 3/9.
      for(let i=0;i<inputData.data.length;i+=4){const y=Math.round(inputData.data[i]*0.299+inputData.data[i+1]*0.587+inputData.data[i+2]*0.114);inputData.data[i]=inputData.data[i+1]=inputData.data[i+2]=y;}
      inputCtx.putImageData(inputData,0,0);
    }else if(!single||threshold){
      const limit=typeof threshold==='number'?threshold:170;
      for(let i=0;i<inputData.data.length;i+=4){const black=white?Math.min(inputData.data[i],inputData.data[i+1],inputData.data[i+2])>150:Math.max(inputData.data[i],inputData.data[i+1],inputData.data[i+2])<limit;inputData.data[i]=inputData.data[i+1]=inputData.data[i+2]=black?0:255;}
      inputCtx.putImageData(inputData,0,0);
    }
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
  const PAIR_STEMS=[...new Set(GENERIC_SPECIAL_NAMES.filter(n=>/[○◎]$/.test(normalize(n))).map(n=>normalize(n).slice(0,-1)))];
  function cleanCellText(text){
    return normalize(text).replace(/[|｜「」『』【】=。、,，:：;；!！?？]/g,'').replace(/^[\-―—]+|[\-―—]+$/g,'');
  }
  function fuzzyBest(text,names,stripTrailing=false){
    let clean=cleanCellText(text);
    if(stripTrailing)clean=clean.replace(/[○◎O0@①②③④⑤⑥⑦⑧⑨⑩A-Za-z0-9]+$/g,'');
    if(!clean)return null;
    const ranked=names.map(name=>{const n=normalize(name);return {name,d:clean.includes(n)||n.includes(clean)&&clean.length>=Math.max(2,n.length-1)?Math.abs(n.length-clean.length):distance(n,clean)};}).sort((a,b)=>a.d-b.d);
    const best=ranked[0],second=ranked[1];if(!best)return null;
    const len=normalize(best.name).length,limit=len<=2?1:len<=5?2:3;
    return best.d<=limit&&(!second||best.d<second.d)?best:null;
  }
  function pairStemFromText(text){
    const best=fuzzyBest(text,PAIR_STEMS,true);return best?.name||'';
  }
  function jobFromText(raw){
    const cleaned=cleanCellText(raw).replace(/ジョブ/g,'');
    const exact=JOBS.find(j=>cleaned.includes(normalize(j)));if(exact)return {job:exact,candidate:false,raw};
    const ranked=JOBS.map(job=>({job,d:distance(normalize(job),cleaned)})).sort((a,b)=>a.d-b.d);
    const best=ranked[0],second=ranked[1],limit=cleaned.length>=3?2:1;
    return best&&best.d<=limit&&(!second||best.d<second.d)?{job:best.job,candidate:true,raw}:{job:'',candidate:false,raw};
  }
  function findSpecials(text){
    const lines=text.split(/\n/).map(normalize);
    const specials=[],supers=[],unknown=[];
    const names=GENERIC_SPECIAL_NAMES;
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
  function abilityCells(image){
    const c=canvasCrop(image,[0,0,1536,706],1),ctx=c.getContext('2d');
    // Work in reference coordinates even for resized screenshots.
    const ref=document.createElement('canvas');ref.width=1536;ref.height=706;
    ref.getContext('2d').drawImage(c,0,0,1536,706);
    const pixels=ref.getContext('2d').getImageData(0,0,1536,706).data;
    const blue=(x,y)=>{const i=(y*1536+x)*4;return pixels[i+2]>pixels[i]+30&&pixels[i+1]>pixels[i]+15;};
    const bands=[];for(let y=274;y<537;y++){
      if(![716,855,993,1131].some(x=>blue(x,y)))continue;
      if(!bands.length||y>bands[bands.length-1][1]+2)bands.push([y,y]);else bands[bands.length-1][1]=y;
    }
    const anchor=bands.find(([a,b])=>b-a>=32);if(!anchor)return [];
    const cells=[];
    for(let y=anchor[0];y+39<=537;y+=50)for(let col=0;col<4;col++){
      const x=[713,852,990,1128][col];let colored=0,yellow=0;
      for(let yy=y+5;yy<y+35;yy++)for(let xx=x+3;xx<x+127;xx+=8){const i=(yy*1536+xx)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];if((b>r+25&&g>r+10)||(r>b+65&&g>b+35))colored++;if(r>175&&g>125&&b<120&&r>b+65&&g>b+35)yellow++;}
      // Long names such as 対ウンディーネ and 無頼漢の教え need almost the full cell width.
      if(colored>30)cells.push({rect:[x+1,y+2,136,34],levelRect:[x+103,y+25,32,24],row:Math.round((y-anchor[0])/50)+1,col:col+1,superCell:yellow>18});
    }
    return cells;
  }
  function cellAbility(text,markHint='',superCell=false){
    const normalized=normalize(text);
    const pairStem=pairStemFromText(text);
    if(pairStem&&markHint&&D.special.some(s=>normalize(s[1])===pairStem+markHint))return {...findSpecials(pairStem+markHint),candidate:true};
    const marked=String(text).normalize('NFC').replace(/\s/g,'').match(/^(.+?)[③⑥⑧⑨][ぐく]?$/);
    if(marked){const upper=marked[1]+'◎';if(D.special.some(s=>s[1]===upper))return {...findSpecials(upper),candidate:true};}
    // One-character 烈 is especially prone to 珠/科/杏/吾 in this game font.
    if(superCell&&SUPER_NAMES.includes('烈')&&/[烈珠科杏吾]/.test(cleanCellText(text)))return {...findSpecials('烈'),candidate:true};
    const clean=cleanCellText(normalized.replace(/[O0〇◯]$/,'○')).replace(/^[火水風無]攻撃$/,'〜攻撃');
    const exact=findSpecials(clean);
    if(!exact.unknown.length&&(exact.specials.length||exact.supers.length))return {...exact,candidate:false};
    const names=[...GENERIC_SPECIAL_NAMES,...SUPER_NAMES].filter(n=>n.length>=2);
    const best=fuzzyBest(clean,names,false);
    if(best){
      // Without a symbol hint, never silently swap ○ and ◎.
      if(/[○◎]$/.test(normalize(best.name))&&!/[○◎]$/.test(clean))return {specials:[],supers:[],unknown:[clean],candidate:false};
      return {...findSpecials(best.name),candidate:true};
    }
    return {specials:[],supers:[],unknown:[clean],candidate:false};
  }
  async function abilityMarkHint(image,cell,rawTexts=[]){
    const joined=rawTexts.map(normalize).join('');
    if(/[◎①②③④⑤⑥⑦⑧⑨⑩@]/.test(joined))return '◎';
    const [x,y,w,h]=cell.rect;let sawCircle=/[○〇◯O]/.test(joined);
    for(const offset of [88,98]){
      const width=Math.min(48,w-offset);if(width<=10)continue;
      const t=(await textAt(image,[x+offset,y,width,h],false,false,true)).text;
      const n=normalize(t);
      if(/[◎①②③④⑤⑥⑦⑧⑨⑩@]/.test(n))return '◎';
      if(/[○〇◯O]/.test(n))sawCircle=true;
    }
    return sawCircle?'○':'';
  }
  async function readAbilityCells(image,index){
    const result={specials:[],supers:[],warnings:[]};
    const cells=abilityCells(image);if(!cells.length)result.warnings.push(`${index}枚目：特殊能力の枠を読み取れませんでした。「取得状態を確認・修正する」で選び直してください。`);
    const missed=[],candidates=[];
    for(const cell of cells){
      const first=(await textAt(image,cell.rect,false,false,true)).text;
      const firstStem=pairStemFromText(first);
      let preliminary=cellAbility(first,'',cell.superCell),retry='';
      if(firstStem||preliminary.unknown.length||preliminary.candidate)retry=(await textAt(image,cell.rect,false,false,true,120)).text;
      const stem=firstStem||pairStemFromText(retry);
      const markHint=stem?await abilityMarkHint(image,cell,[first,retry]):'';
      let raw=first,parsed=cellAbility(first,markHint,cell.superCell);
      if(retry){
        const alternative=cellAbility(retry,markHint,cell.superCell);
        if(!alternative.unknown.length&&(parsed.unknown.length||!alternative.candidate)){raw=retry;parsed=alternative;}
      }
      if(window.__PHOTO_DEBUG__)console.log(index,cell.row,cell.col,raw,markHint,cell.superCell);
      result.specials.push(...parsed.specials);
      for(const entry of parsed.supers){
        if(D.superResistances[entry.name]){const t=(await textAt(image,cell.levelRect,true)).text;entry.level=/[12]$/.test(t)?Number(t.slice(-1)):null;}
        result.supers.push(entry);
      }
      const where=`${cell.row}段目・左から${cell.col}番目`;
      if(parsed.unknown.length)missed.push(where);
      if(parsed.candidate)candidates.push(`${where}「${parsed.supers[0]?.name||parsed.specials[0]}」`);
    }
    if(missed.length)result.warnings.push(`${index}枚目：${missed.join('、')}を読み取れませんでした。画像と見比べて、下の「取得状態を確認・修正する」または「＋超特殊能力を追加」で補ってください。`);
    if(candidates.length)result.warnings.push(`${index}枚目：${candidates.join('、')}は読み取り候補です。取得状態が合っているか確認してください。`);
    return result;
  }
  async function jobOf(image){
    const crops=[[675,18,205,40],[685,22,190,34],[650,12,250,48]];
    for(const rect of crops){
      for(const [white,threshold] of [[false,false],[true,false],[false,120]]){
        const raw=(await textAt(image,rect,false,white,true,threshold)).text;
        const matched=jobFromText(raw);if(matched.job)return matched;
      }
    }
    if(await matchesTemplate(image,'swordsman',[685,22,165,32]))return {job:'剣士',candidate:false,raw:''};
    return {job:'',candidate:false,raw:''};
  }
  async function readImages(images){
    const out={academy:'',job:'',exp:{},basic:{},specials:[],supers:[],warnings:[],dataScreens:0,abilityUpScreens:0};
    const modalBasicSamples=Object.fromEntries(BASICS.map(n=>[n,[]]));
    function mergeField(target,key,value,label){
      if(value==null||value==='')return;
      if(target[key]!=null&&target[key]!==''&&target[key]!==value){target[key]=null;out.warnings.push(label+'の読み取り値が一致しません。画像の数値を確認して入力してください。');}
      else target[key]=value;
    }
    for(let i=0;i<images.length;i++){
      const image=images[i];status(`${i+1}/${images.length}枚目を読み取り中…`);
      if(Math.abs(image.width/image.height-1536/706)>0.06){out.warnings.push(`${i+1}枚目は画面比率が異なるため読み取れませんでした。`);continue;}
      if(await matchesTemplate(image,'modal',[670,55,220,45])){
        out.dataScreens++;
        mergeField(out,'academy',await academyOf(image),'アカデミー');
        const values=await numericRow(image,BASICS.map((_,j)=>[267+72.5*j,508,45,26]));
        BASICS.forEach((n,j)=>{if(values[j]!=null)modalBasicSamples[n].push(values[j]);});
        const result=await readAbilityCells(image,i+1);
        out.specials.push(...result.specials);out.supers.push(...result.supers);
        out.warnings.push(...result.warnings);
      }else{
        // Job and EXP live in the common header of every 能力アップ tab.
        const jobResult=await jobOf(image);
        const exp=await numericRow(image,EXPS.map((_,j)=>[981+60*j,228,49,21]));
        const knownTab=await matchesTemplate(image,'basic',[748,104,141,39]);
        let title='';if(!knownTab)title=normalize((await textAt(image,[40,10,360,60],false,true)).text);
        const enoughExp=exp.filter(v=>v!=null).length>=3;
        if(!knownTab&&!title.includes('能力アップ')&&!jobResult.job&&!enoughExp){out.warnings.push(`${i+1}枚目は対応画面を判別できませんでした。`);continue;}
        out.abilityUpScreens++;
        if(jobResult.candidate)out.warnings.push('ジョブの候補：'+jobResult.job+'（要確認）');
        mergeField(out,'job',jobResult.job,'ジョブ');
        EXPS.forEach((n,j)=>mergeField(out.exp,n,exp[j],n+'経験点'));
        // Basic stats are intentionally NOT read here. They come from 能力データ, which is stable across tabs.
      }
    }
    for(const n of BASICS){
      const samples=modalBasicSamples[n],counts=new Map();for(const v of samples)counts.set(v,(counts.get(v)||0)+1);
      const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]);out.basic[n]=ranked[0]?.[0]??null;
      if(ranked.length>1&&ranked[0][1]===ranked[1][1])out.warnings.push(n+'の読み取り値が画像間で一致しません。確認してください。');
    }
    // 双剣士専用通常攻撃は通常の特殊能力とは別管理。Lv1は academy_runtime.js の initialLevel で自動取得済み。
    out.specials=[...new Set(out.specials)];
    const superMap=new Map();for(const s of out.supers){const old=superMap.get(s.name);if(old&&old.level!=null&&s.level!=null&&old.level!==s.level){s.level=null;out.warnings.push(s.name+'のLvを確認してください。');}else if(old?.level!=null&&s.level==null)s.level=old.level;superMap.set(s.name,s);}out.supers=[...superMap.values()];
    for(const entry of out.supers)if(D.superResistances[entry.name]&&entry.level==null)out.warnings.push(entry.name+'のLvを読み取れませんでした。下の「取得済み超特殊能力」でLvを選んでください。');
    if(!out.abilityUpScreens)out.warnings.push('「能力アップ」画面がありません。ジョブと経験点を確認してください。');
    if(!out.dataScreens)out.warnings.push('「能力データ」画面がありません。アカデミー・基本能力・取得済み特殊能力を確認してください。');
    return out;
  }
  const options=(items,value)=>'<option value="">確認・選択してください</option>'+items.map(n=>`<option value="${escape(n)}" ${n===value?'selected':''}>${escape(n)}</option>`).join('');
  function showReview(data){
    review=data;const box=el('photoReview');box.hidden=false;
    box.innerHTML=`<h3>読み取り結果を確認</h3><p>空欄・誤読があれば修正してください。特殊能力は写っているものだけを読み取ります。</p>
      ${data.warnings.length?`<details class="photo-warning"><summary>確認が必要な項目（${data.warnings.length}件）</summary><p>「段目」は画像内で一番上の、枠全体が見える行から数えます。</p>${data.warnings.map(w=>`<p>${escape(w)}</p>`).join('')}</details>`:''}
      <div class="photo-review-grid"><label>アカデミー<select id="photoAcademy">${options(ACADEMIES,data.academy)}</select></label><label>ジョブ<select id="photoJob">${options(JOBS,data.job)}</select></label></div>
      <h3>所持経験点</h3><div class="photo-review-grid">${EXPS.map((n,i)=>`<label>${n}<input id="photoExp${i}" type="number" min="0" inputmode="numeric" value="${data.exp[n]??''}"></label>`).join('')}</div>
      <h3>基本能力</h3><p class="photo-note">「能力データ」画面の数値を使用しています。</p><div class="photo-review-grid">${BASICS.map((n,i)=>`<label>${n}<input id="photoBasic${i}" type="number" min="1" inputmode="numeric" value="${data.basic[n]??''}"></label>`).join('')}</div>
      <h3>取得済み特殊能力</h3><p id="photoOwnedSummary"></p><p class="photo-note">${data.job==='双剣士'?'<strong>双剣士専用 通常攻撃 Lv1：取得済み</strong><br>Lv2以降は通常の特殊能力とは別に、器用さ条件と経験点を満たして順番に取得します。':''}</p><details><summary>取得状態を確認・修正する</summary><div class="photo-specials">${D.special.map((s,i)=>({s,i})).filter(({s})=>normalize(s[1])!==normalize(DUAL_NORMAL_ATTACK)).map(({s,i})=>`<label><input type="checkbox" data-photo-special="${i}" ${data.specials.includes(s[1])?'checked':''}>${escape(s[1])}</label>`).join('')}</div></details>
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
  window.__PAWAADO_PHOTO_TEST__={academyOf,findSpecials,readImages,abilityCells,cellAbility,jobOf,jobFromText,pairStemFromText};
})();
