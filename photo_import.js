/* Screenshot import. OCR and image comparison run locally in the browser. */
(() => {
  'use strict';
  const D=window.PAWAADO_DATA;
  const BASICS=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
  const EXPS=['筋力','敏捷','技術','知力','精神'];
  const ACADEMIES=[...new Set(D.academies.map(r=>r[0]))];
  const JOBS=[...new Set(D.academies.map(r=>r[1]))];
  const PHOTO_ONLY_SUPER_NAMES=['剛力'];
  const SUPER_NAMES=[...new Set([...Object.keys(D.superResistances),...Object.keys(D.superPrerequisites),...PHOTO_ONLY_SUPER_NAMES])];
  const DUAL_NORMAL_ATTACK='通常攻撃(双剣士)';
  const REFERENCES=[['パワフルアカデミー','powerful'],['タテレスキュアアカデミー','tateless'],['カジナイトアカデミー','kaji'],['ブートレインアカデミー','bootrain']];

  // OCRだけに依存しないハイブリッド認識。
  // 提供済みの実ゲーム画像から、誤読しやすい文字列・数字を「黒画素の形」として登録している。
  // 未登録の能力は従来OCRへフォールバックするため、全能力の画像を事前登録する必要はない。
  const HYBRID_ABILITY_MASKS={
    '通常攻撃(双剣士)':'//////////i8HAAAAAAAGLAGAAAAAAAY5lML41AYdxDH4xvn/f5/gMdxA/f9/3+Aw6Ef9/z+f4DH8Z/z8P5/mM/R7/P47T8Yy2mO5/n+DBg=',
    '烈':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAAAAAAA/wAAAAAAAAH/AAAAAAAAAP8AAAAAAAAA5wAAAAgAAADOAAAACAAAAb8AAAAI=',
    '備え':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH+PgAAAAAAAbwAAAAAAAAD/n4AAAAAAAP+DgAAAAAAAf4cAAAAgAAB/n2AAACAAAHe74AAAI=',
    '安全運転':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/h437/AAAAH+f5fm8AAAAWbzh88AAAAB/n8/z/gAAADMPB/PcAAgAPg/H+9QACAB/n+/7/gAI=',
    '戦い抜く覚悟':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf4AD+BxvH+B/jMf4eH+7wH/I52Dgf7/Af5hjecB/P+B/mGf5wH8bwjubY/jwfx/if88n+Dg3n+I=',
    '対魔闘士○':'AAAAAAAAAAAAAAAAAAAAAAGMGAABAAAAAYz/P8ED8AAD/P8/wQO4AAD8/z/f9xgAA/z/L9/2CAABvP8/wQYYAgHM/z/BAxgCA9z9P8/j+AI=',
    '対魔法使い◎':'AAAAAAAAAAAAAAAAAAAAACGDAEAQAAcAMZ/n+f5gGYB/n+P7mGY5QB+f5mN8QzDAd5/n+3zDIAA3n+bRfMMggjmf5/FwealCe5/v+f55EII='
  };
  Object.assign(HYBRID_ABILITY_MASKS,{"お人よし":["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAQBAwAAAAD+BAHjAAAAAPsMAeMAAAAAfA4BAgAAAAD+Dg+CGAAwAbMfH+M4ADABtzuZ4/AAM=","AAAAAAAAAAAAAAAAAAAAAAACAEAQAAAAAA/gQBAwAAAAD7BAHjAAAAADgMAYIAAAAA/g4DAhgAAAD3Hh/CGAAwAbM7meMwADAB/nGfI/AAM=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgQBAwAAAAD/BAHjAAAAADIMAeMAAAAAfg4BAhgAAAD3Dh+CGAAwAbMbG+M4ADAB/3ufY/AAE="],"がむしゃら":"AAAAAAAAAAIAAAAAAAAAAgAEAAAAAAACAMwwGAAA+AID7PsYBIN4AgP0MRAH4wACAbbzEI/j+AIBlvMwzuPcAgGw8xnD4AwCA3D/H4PB+AI=","ガッツ":["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbAAEAAAAAADIEDzAAAAAA/zeN4AAAAAA3F43gAAAAAHMfgOAAAgAAYwMAwAACAABmBwHAAAI=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbAAEAAAAAABgGDbAAAAAA/xbNsAAAAAAzH8XgAAAAADMbgGAAAwAAcwOA4AADAABjAwHAAAM=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXAAMAAAAAADAECzAAAAAA/jWNYAAAAAA2N43gAAAAAGIXgOAAAgAAZgMAwAACAADmBwGAAAI="],"ケガしにくさ○":["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAuYGAGBg8A/CBgfw4/n4D8/EBwHD+xgZhsQGAwAzCBmGRGWDA/MIwwTEZQODMxjHDMfF8MMB+M=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAuYGAGBg8A/PBgfw4/n4D8/EBgOD8xgZhkQmAwDzCBmGRGWDA/MIwwzGZQGDARjHDMfF8OPx+M=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAuYGAGBgAA/PBgfw4/gAD8/EBgOD8IAZhkQmAwDwABmGRGWDA/AAwwzGZQGDAJDHDMfF8OPwAM="],"サイクロプスキラー":["AAAAAAAAAAAAAAAAAAAAAEgQgAAAIAAAbDHn37w48AD8ceTDHHgAAPzjJMEMcfPgaeJkwww08+BpoETGHPwwAhggx8Y+8DACECGHzDIQYAI=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbBGH3wAg8ABsMeffvHjwAPxjJMEEeNAAaONkwwwx8+BpoGTDDHwT4lggxMYe/DACGCHHzjYQYAI="],"トリックスター":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMDEADA+DIAAwMRWPz4fgADgzFZiBjGAAPjMVGYMLz+A3MxMBg4HAATAGAwMHwYABMAYGDhzHAAE=","バランス感覚":["AAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAG8/jAPx/n8AbD8eA/Ge/4DMf4RAYfz/gMx/gODj/n8AxgOBweH+fwnGBweD8fR/CYcODwc7/neI=","AAAAAAAAAAAAAAAAAAAAAAFAAAAAf57AGw/nAPx/v+ATAAOAGGcw4DMf4BgYfx/AMYBgeDD/n8IxgMDweA0fwmGDw8Hse5/CYMMDgcb/veI=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAHGsAbj+cA/H+/wBsAA4D4fz/gMx/gGBh/P8Azn+A4MP+YwjGAwPB4S5/CcYHD4Px/n8I="],"ヒーラー魂":["AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAACAYAAAAAAMAIBiAAfgAN8AgH8AAAAAHwCAfD/P8/3/AIBgP8Bz/P8AgGAAAOAA/wCAcwABwAH/AI=","AAAAAAAAAAAAAAAAAAAAAgAAAAAAAAACAAAAAAAAMAIBgAAfgAN8AgG8AB+AAHwCAfgAP8AH/AIBgP8/z/N8AgGAAAGAA/ACAYAAA4AH/AI=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAH8AD/AEBnAAfwAP8AQH8AB/AA/wBAeD/P8/z/AMBgH8Bz/P8AwGAAAOAA/wDAPwABwAD/AM="],"不滅":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH+w4AAAAAAAf5/gAAAAAAAcP4AAAAAAAD8doAAAAAAA/5/gAAAgAABJn8AAACAAAAg/4AAAI=","仲間思い":["AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmH+fwAAAAAH+f5/GYAAAA/5/n8RwAAAB+nefzDAAAAH+X4MMMAAgAf5fn02YACABmF+955gAI=","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmH+fwAAAAAH+f5/GYAAAAf5/n8RwAAAB/n+fxDAAAAH+X5/MMAAgAf5fn0w4ACAB+l+955gAI=","AAAAAAAAAAAAAAAAAAAAAAAJgAAAAAAAABmH+fxgAAAAH+f5/GYAAAAf5/n8QwAAAB/l+fzDAAAAH+X49MMAAgAf5fv+eYACABmF+/54AAI="],"体幹":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIMwAAAAAAANx/gAAAAAAB/n+AAAAAAAGcf4AAAAAAAb5/gAAAQAAA73+AAADAAAC+f4AAAM=","僧侶治療○":"AAAAAAAAAAAAAAAAAAAAAAGsfxMBwOAAAf5/O8/x+AAD/t8Wz/OcAAP+3z/P8wwAAf7fA8/zDAEB/l8fzzMMAwH+UTxP85gDAf5fN8/x+AE="});
  // 基本能力の数字はOCRを使わず、実画像の数字テンプレート比較だけで判定する。
  // 未登録・曖昧な字形は空欄＋警告にして、OCRへはフォールバックしない。
  const HYBRID_DIGIT_MASKS={
    '0':['H4H4P8OO8G4G4G4H4H4H4G8G8GO+H8BA','D4D4H8OOMG8H8H4H4D4D4H4H8GMGOOH8','BwBwH8PeOOMH8H8H8H8H8H8HOOPeH8D4','D4D4H8OOMGMHMH8D8D8D8D8DMHMGOOH8','D4D4P8OOMG8H8H4H4H4H4H4H8GMGOOH8','D4D4P8OO8G4G4G4H4H4H4H4H8GMGO+H8','DgDgP+/f8H8H8BwBwBwB8B8H8H/fP+D4'],
    '1':['APAPB/////APAPAPAPAPAPAPAPAPAPAP','APAPA/D/////A/A/A/A/A/A/A/A/A/AP','A8A8D/P/////A/A/A/A/A/A/A/A/A/A8','APAPB/////4P4PAPAPAPAPAPAPAPAPAP','A/A/A/P/////A/A/A/A/A/A/A/A/A/A/','APAPA/D///P/APAPAPAPAPAPAPAPAPAP','AMAMA/P/////A/A/A/A/A/A/A/A/A/AP','APAPB/H///APAPAPAPAPAPAPAPAPAPAP'],
    '2':['H8H8P+8P4DAPAPAPA+DwHgHgMA8A8A//','D4D4P++O8HAHAHAOB8D4HAOA8A+O////','B4B4H+OP8HAHAHAOA+D4HAOAMA+2////','D4D4P+MOMHAGAGAOA8D4HAHAOAMA+A//','H8H8P/MPIDADADAPAeD8HgHgPAMA/A//','H8H8P/8P4DADADAPAeD8HgHgPA8A/A//','H8H8P/8P4DADADAPA+D8HgHgMA8A/A//','BwBwP8MO8HAHAGAOA8DwHAMA8A8A///+','DwDwP88O8HAHAHAOB8D4HAOA8A8A///+','D4D4P++O8HAHAHAOB8D4HAOA8A8A////','D4D4P++O8HIHAHAOB8D4HAOA8A/2////','D4D4P++P8HIHAHAOB8D4PAOA8A/+////','D4D4P++/8HIHAPAOB8D4PAOA8A/+////','D4D4P+//8HIHAPA+B8H4PAOA8A//////','D4D4P+//8HIHAPA+B+H4PAOA8A//////'],
    '3':['HwHw/+4eAOAeA8H8AeAeAOAPwP8e/+Dg','D4D4P+OOEGAGAOD8D8AOAHADIH8PP+H8','D4D4H+OPEHAHAGB8B8APAHADID+HP+D8','H8H8P+MPAPAOAOAcD8AeAPAPADID8PP+','H8H8P+MOAOAOAOA8D8AeAPAPADIP8fP+','H8H8P+8PAPAOA8D8AeAeAPADIP8fP+Ag','P+P+//4PAHAPB+H+A/A/AHAHwH+P//Bw'],
    '4':['A8A8A8D8H8HcHcMcMc4c4e4e//A+AcAc','A8A8A8B8D8DMDMGMOMMM8O8O//A+AMAM','A8A8B8D8D8GMGMOMMM4M4848//B+AMAM','AcAcA8A8B8D8DMGMOMMM+e//P/AMAMAM','AcAcA8B8B8D8DMGMOMMM+e//P/AMAMAM','AcAcA8A8B8DsDMGMOMMM+e//P/AMAMAM','AYAYA8A8B8DsDMGMMMMM8c//P+AMAMAI','AYAYA8A8B8DsDMGMMMMM8e//P+AMAMAI','AYAYA8A8B8D8DMGMOMMM8e//P/AMAMAM','AcAcA8B8B8D8HMGcOcMc/+////AcAcAM','AcAcA8B8B8D8HcGcOcMc//////AcAcAM','AcAcA8B8B8D8HcGcOc8c//////AcAcAM','AMAMA8B8B8DMGMGMMM4M4O////AMAMAE','AMAMA8B8D8DMGMGMMM4M8+////AMAMAE','AMAMA8B8D8DMGMOMMM4M8+////AMAOAM','AMAMA+B+D+D+GOOOMO4O8+////AOAOAM','A8A8A+B+D+D+GOOOMO8O//////AOAOAM','A4A4B8B8D8D8GcOcMc8c/+///+AcAcAY','A4A4B8B8D8H8HcOcMc8c/+///+AcAcAc'],
    '5':['P+P+/+8A4A4A4A/+8PADADADAD4D8fP+','P+P+/+8A4A4A4A/+8PADADADAD4P8fP+','/+/+/+8A4A4A4A/+8eAPADADAD4P8eP8','/+/+/+4A4A4A4A/+8eAPADADAD4P8eP8','/+/+/+4A4A4A4A/88eAPADADAD4P8eP8','P+P+P+MA8A8A94/+8PAHADAD4H+PP+D4','P8P8P+MAMAIA4w/+8GAHADADIH8OP8D4','P+P+P+MAMA4A44/+8GAHADADIH8OP+D4','P+P+P+MAMA8A94/+8HAHADAD4H+OP+D4','P+P+P++A8A8A94/++PAHADAH8H+PP+H4','P+P+/++A8A8A98/++PAHAHAH8H+PP+H4','P+P+/+/+8A8A/8/++PAHAHAH8H+PP+H4','P+P+/+/+8A8A/8/++PAHAHAH8H+/P+H8'],
    '6':['D4D4H+OH8A4A4A/8/+8H4D4D8HOHP+D4','D8D8P+MG8A4A4A58/+8G4H4H4DMGOOH8','D8D8H+OH8C4A4w/+//8H4D4D8DOHP+D8','B4B4H+HGOAMAMA/8/++H8HMHOHPOH+B4','B4B4H+OOMA8A4A/8/e8G8H8HMGOOH8D4','D8D8H+MGMA4A4A58/+8H8D8D8DMHOOH8','D8D8H+MGMA4A58/+8H8H4D8DMHOOH8Aw'],
    '7':['////////AOA8A4B4BwDwDwDAHAHAHAGA','//////AeAcAcAcAwDwDgDgDgHgHAHAHA','//////AeAcA8A8AwDwDgHgHgHgHAHAPA'],
    '8':['B4B4H+GHOHOHHOD8H+PPOH8DMDOHH+D8','D8D8P+MGMGMGMGH8H8OO8H8H4D8HOHH+','H4H4P88O4G8OP8P88+8+4G4H4G8OP8BA','B4B4H+OGOHOGHOH8H+OP8H8D8HOPH+D4','D4D4P+MH8H8HOOH8P++P8H4D4D8HP+D4'],
    '9':['D4D4P++O8H4D4D8H+PP7ADADAH8OP+H4','DwDwH8OO8G8H8H8HPfH/ADAHAGMOP8D4','D4D4P+MGMH8D8DMDOPH/BzBzADAHOOH8']
  };
  const HYBRID_LEVEL_MASKS={
    '1':'B/B/HBOBwBwBPBPBHBHBBBBBBBBBB/AI',
    '2':'A/A/BjBBAIgMh4ARBzBCBMcPmAmA3/J+'
  };
  const HYBRID_JOB_MASKS={
    '剣士':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHnh4AAAAAAAAAAAAP/h4AAAAAAAAAAAAcehYAAAAAAAAAAAAbO/fgAAAAAAAAAAAYe4BgAAAAA8AAAAAe+wBgAAAAA4AAAAAau/fgAAAAAAAAAAAauhYAAAAAAAAAAAAc+/fgAAAAAAAAAAAZc/PgAAAAAAAAAAAf94BgAAAAAAAAAAAf///gAAAAAAAAAAAAAAAAAAAAA',
    '弓使い':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/v/AAAAAAAAAAAAMBv3vMAAAAAAAAAAP96A/eAAAAAAAAAAP9737bAAAAAAAAAAMByB7bAAAAA8AAAAJ/y17JAAAAA4AAAAYA6B79gAAAAAAAAAb+7379gAAAAAAAAAf+7P7dgAAAAAAAAAH97H4fgAAAAAAAAABj79t3AAAAAAAAAAB/P/vgAAAAAAAAAAAAAAAAAAAAA',
    '重戦士':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/f/B4AAAAAAAAAAP7//h4AAAAAAAAAAcH/XhYAAAAAAAAAAYA/X/fgAAAAAAAAAfP9BwBgAAAA8AAAAJN4XwBgAAAA4AAAAJN9b/fgAAAAAAAAAPP4ZhYAAAAAAAAAAYB97/fAAAAAAAAAAfP8g/PgAAAAAAAAAYA/94BgAAAAAAAAAf/n///AAAAAAAAAAAAAAAAAAAAA',
    '魔法使い':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/u8P/AAAAAAAAAAfv/3v/vMAAAAAAAAZZ536B/eAAAAAAAAbd/B737zAAAAAAAAaJ73yB7bAAAA8AAAb38Ay17bAAAA4AAAa0vv6B79gAAAAAAAa0vv7n79gAAAAAAAbD7N7P7dgAAAAAAAbW6B7H4/gAAAAAAAfw//65t3AAAAAAAAP/v///vgAAAAAAAAAAAAAAAAAAAA',
    '魔闘士':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///h4AAAAAAAAAAfv//h4AAAAAAAAAAZZ61hYAAAAAAAAAAbZ61/fgAAAAAAAAAaJ4xwBgAAAA8AAAAb379wBgAAAA4AAAAa17x/fgAAAAAAAAAa17VhYAAAAAAAAAAbD7V/fAAAAAAAAAAb37V/PgAAAAAAAAAfx/x4BgAAAAAAAAAP///f/AAAAAAAAAAAAAAAAAAAAA',
    '双剣士':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/nnh4AAAAAAAAAAf/v/h4AAAAAAAAAAYA8dhYAAAAAAAAAAe+zN/fgAAAAAAAAAa24dwBgAAAAAAAAAc189wBgAAAAAAAAAMx+9/fgAAAAAAAAAMZe9hYAAAAAAAAAAdx89/fAAAAAAAAAAbk7d/PgAAAAAAAAAf//94BgAAAAAAAAAO7//f/AAAAAAAAAAAAAAAAAAAAA',
    '僧侶':'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/P/AAAAAAAAAAAAP/v/gAAAAAAAAAAAMB7ZgAAAAAAAAAAAaW7dgAAAAAAAAAAASWzBgAAAAA+AAAAAaWzngAAAAA4AAAAAb/7ngAAAAAAAAAAAbB6BgAAAAAAAAAAALd69gAAAAAAAAAAALd6BgAAAAAAAAAAALB6dgAAAAAAAAAAAP///gAAAAAAAAAAAAAAAAAAAAA'
  };
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
    .photo-warning{color:#9d3019;font-weight:700}.photo-super-row{display:flex;gap:8px;align-items:center;margin:8px 0}.photo-super-row select{min-height:44px;font-size:16px;min-width:0}.photo-super-name{flex:1;width:0}.photo-super-level{width:84px;flex:none;text-align:center;padding-left:8px;padding-right:28px}.photo-remove-super{width:42px;flex:none;padding:4px}
    #photoReview[hidden]{display:none}#photoReview h3{margin-top:20px}.super-controls{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:8px;margin-bottom:10px}.super-note{font-size:13px}
    #applyPhotos{margin-top:14px;width:100%}.photo-confirm{display:flex;align-items:flex-start;gap:8px;margin-top:16px}.photo-confirm input{width:22px;height:22px;flex-shrink:0}
  `;document.head.appendChild(style);
  const el=id=>document.getElementById(id);
  let files=[,'H4H4/88O4G4G4H8PP/P/DGAGAG88P8BA'],urls=[],busy=false,worker=null,workerLanguage='jpn',review=null;
  const status=t=>{el('photoStatus').textContent=t;};
  const imageFrom=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('画像を開けませんでした。PNGまたはJPEGでお試しください。'));im.src=src;});

  const decodedMasks=new Map();
  function decodeMask(encoded,size){
    const key=encoded+'|'+size;if(decodedMasks.has(key))return decodedMasks.get(key);
    const raw=atob(encoded),out=new Uint8Array(size);
    let p=0;
    for(let i=0;i<raw.length&&p<size;i++){
      const byte=raw.charCodeAt(i);
      for(let bit=7;bit>=0&&p<size;bit--)out[p++]=(byte>>bit)&1;
    }
    decodedMasks.set(key,out);return out;
  }
  function canonicalCrop(image,rect){
    const [x,y,w,h]=rect,c=document.createElement('canvas');
    c.width=Math.round(w);c.height=Math.round(h);
    c.getContext('2d').drawImage(
      image,
      x*image.width/1536,y*image.height/706,w*image.width/1536,h*image.height/706,
      0,0,c.width,c.height
    );
    return c;
  }
  function inkMask(image,rect,blockX,blockY,threshold=100){
    const c=canonicalCrop(image,rect),ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;
    const outW=Math.floor(c.width/blockX),outH=Math.floor(c.height/blockY),out=new Uint8Array(outW*outH);
    for(let oy=0;oy<outH;oy++)for(let ox=0;ox<outW;ox++){
      let dark=0;
      for(let yy=0;yy<blockY;yy++)for(let xx=0;xx<blockX;xx++){
        const x=ox*blockX+xx,y=oy*blockY+yy,i=(y*c.width+x)*4;
        const lum=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
        if(lum<threshold)dark++;
      }
      out[oy*outW+ox]=dark?1:0;
    }
    return {mask:out,w:outW,h:outH};
  }
  function shiftedMaskDistance(a,b,w,h,maxDx=3,maxDy=2){
    let best=1;
    for(let dy=-maxDy;dy<=maxDy;dy++)for(let dx=-maxDx;dx<=maxDx;dx++){
      let diff=0,count=0;
      for(let y=0;y<h;y++){const by=y-dy;if(by<0||by>=h)continue;
        for(let x=0;x<w;x++){const bx=x-dx;if(bx<0||bx>=w)continue;diff+=a[y*w+x]!==b[by*w+bx];count++;}
      }
      if(count)best=Math.min(best,diff/count);
    }
    return best;
  }
  function abilityByImage(image,cell){
    const [x,y,w]=cell.rect;
    const sig=inkMask(image,[x+4,y+4,w-8,20],2,2,100);
    const ranked=Object.entries(HYBRID_ABILITY_MASKS).map(([name,encoded])=>{
      const variants=Array.isArray(encoded)?encoded:[encoded];
      return {name,d:Math.min(...variants.map(e=>shiftedMaskDistance(sig.mask,decodeMask(e,64*10),64,10,3,2)))};
    }).sort((a,b)=>a.d-b.d);
    const best=ranked[0],second=ranked[1];
    if(!best)return '';
    const limit=(best.name==='烈'||best.name==='備え')?.045:.07;
    return best.d<=limit&&(!second||second.d-best.d>=.015)?best.name:'';
  }
  function normalizeGlyph(mask,w,h,outW=12,outH=16){
    const out=new Uint8Array(outW*outH);
    for(let oy=0;oy<outH;oy++){const sy=Math.min(h-1,Math.floor(oy*h/outH));
      for(let ox=0;ox<outW;ox++){const sx=Math.min(w-1,Math.floor(ox*w/outW));out[oy*outW+ox]=mask[sy*w+sx];}
    }
    return out;
  }
  function maskDistance(a,b){let d=0;for(let i=0;i<a.length;i++)d+=a[i]!==b[i];return d/a.length;}
  function glyphComponents(image,rect,threshold=90){
    const c=canonicalCrop(image,rect),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const w=c.width,h=c.height,dark=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,lum=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);if(lum<threshold)dark[y*w+x]=1;}
    const seen=new Uint8Array(w*h),components=[];
    const stackX=[],stackY=[];
    for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
      const start=sy*w+sx;if(!dark[start]||seen[start])continue;
      seen[start]=1;stackX.push(sx);stackY.push(sy);
      let minX=sx,maxX=sx,minY=sy,maxY=sy,area=0,pixels=[];
      while(stackX.length){const x=stackX.pop(),y=stackY.pop();area++;pixels.push([x,y]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const k=yy*w+xx;if(dark[k]&&!seen[k]){seen[k]=1;stackX.push(xx);stackY.push(yy);}}
      }
      const cw=maxX-minX+1,ch=maxY-minY+1;if(cw<4||cw>18||ch<8||ch>22||area<15)continue;
      const local=new Uint8Array(cw*ch);for(const [x,y] of pixels)local[(y-minY)*cw+(x-minX)]=1;
      components.push({x:minX,y:minY,w:cw,h:ch,area,mask:local});
    }
    return components.sort((a,b)=>a.x-b.x);
  }
  function classifyGlyph(component,templates,limit=.18){
    const glyph=normalizeGlyph(component.mask,component.w,component.h);

    // このゲームの「5」と「3」は輪郭比較だけだと非常に近い。
    // 上半分左側に縦棒が残るのが5、右側に寄るのが3なので先に形状で分離する。
    const leftMid=(()=>{
      let hit=0,total=0;
      for(let y=3;y<8;y++)for(let x=0;x<4;x++){hit+=glyph[y*12+x];total++;}
      return total?hit/total:0;
    })();
    const rightMid=(()=>{
      let hit=0,total=0;
      for(let y=3;y<8;y++)for(let x=8;x<12;x++){hit+=glyph[y*12+x];total++;}
      return total?hit/total:0;
    })();
    if(component.w>=8 && leftMid>=.65 && rightMid<=.35 && Object.prototype.hasOwnProperty.call(templates,'5')) return '5';

    const ranked=Object.entries(templates).map(([value,encoded])=>{
      const variants=Array.isArray(encoded)?encoded:[encoded];
      return {value,d:Math.min(...variants.map(e=>maskDistance(glyph,decodeMask(e,12*16))))};
    }).sort((a,b)=>a.d-b.d);
    return ranked[0]&&ranked[0].d<=limit&&(!ranked[1]||ranked[1].d-ranked[0].d>=.025)?ranked[0].value:'';
  }
  function classifyBasicDigit(component){
    const glyph=normalizeGlyph(component.mask,component.w,component.h);

    const ranked=Object.entries(HYBRID_DIGIT_MASKS).map(([value,encoded])=>{
      const variants=Array.isArray(encoded)?encoded:[encoded];
      return {value,d:Math.min(...variants.map(e=>maskDistance(glyph,decodeMask(e,12*16))))};
    }).sort((a,b)=>a.d-b.d);

    if(!ranked[0])return '';

    // 5 と 3 だけは輪郭が近いので、テンプレート上位が3/5の時に限って
    // 上半分の左右バランスを補助判定に使う。6まで5扱いしないことが重要。
    if(['3','5'].includes(ranked[0].value)){
      const leftMid=(()=>{
        let hit=0,total=0;
        for(let y=3;y<8;y++)for(let x=0;x<4;x++){hit+=glyph[y*12+x];total++;}
        return total?hit/total:0;
      })();
      const rightMid=(()=>{
        let hit=0,total=0;
        for(let y=3;y<8;y++)for(let x=8;x<12;x++){hit+=glyph[y*12+x];total++;}
        return total?hit/total:0;
      })();
      if(component.w>=8&&leftMid>=.65&&rightMid<=.35)return '5';
    }

    // 曖昧なら推測せず空欄にする。基本能力ではOCRを使わない。
    if(ranked[0].d>.16)return '';
    if(ranked[1]&&ranked[1].d-ranked[0].d<.025)return '';
    return ranked[0].value;
  }

  function basicByImageStrict(image,index){
    const x=[270,342,415,488,560,632][index];
    const components=glyphComponents(image,[x,505,45,30],90)
      .filter(c=>c.y>=5&&c.h>=10&&c.area>=18)
      .sort((a,b)=>a.x-b.x);

    // 基本能力は1桁（例: 魔力5）から上限拡張後の3桁まであり得る。
    if(components.length<1||components.length>3)return null;
    const digits=components.map(classifyBasicDigit);
    return digits.every(Boolean)?Number(digits.join('')):null;
  }
  function levelByImage(image,cell){
    const [x,y]=cell.rect;
    // Lv数字はセル右下にあり、実画像では切り出し上端から約5〜7pxの位置に出る。
    // 以前の y>=15 条件で数字そのものを除外していたため、専用のlevelRectで右端の数字を拾う。
    const rect=cell.levelRect||[x+83,y+23,55,28];
    const components=glyphComponents(image,rect,100)
      .filter(c=>c.h>=10&&c.x>=8)
      .sort((a,b)=>a.x-b.x);
    if(!components.length)return null;
    const digit=components[components.length-1];
    const matched=classifyGlyph(digit,HYBRID_LEVEL_MASKS,.23);
    if(matched)return Number(matched);
    // テンプレートが僅かに外れても、このゲームのLv1/2は横幅が大きく異なるので補助判定する。
    if(digit.w<=11)return 1;
    if(digit.w>=12&&digit.w<=18)return 2;
    return null;
  }
  function visualJobByImage(image){
    const sig=inkMask(image,[670,20,192,32],2,2,100);
    const ranked=Object.entries(HYBRID_JOB_MASKS).map(([job,encoded])=>({
      job,d:shiftedMaskDistance(sig.mask,decodeMask(encoded,96*16),96,16,4,2)
    })).sort((a,b)=>a.d-b.d);
    const best=ranked[0],second=ranked[1];
    return best&&best.d<=.06&&(!second||second.d-best.d>=.02)?best.job:'';
  }

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
  function numericByImageStrict(image,rect,maxDigits=4){
    const components=glyphComponents(image,rect,90)
      .filter(c=>c.h>=10&&c.area>=18)
      .sort((a,b)=>a.x-b.x);
    if(components.length<1||components.length>maxDigits)return null;
    const digits=components.map(classifyBasicDigit);
    return digits.every(Boolean)?Number(digits.join('')):null;
  }
  async function numericRow(image,rects){
    const result=[];
    for(const rect of rects){
      // 経験点も基本能力と同じく実画像テンプレートを優先し、
      // 誤読しやすいOCRへの数値フォールバックはしない。
      const visual=numericByImageStrict(image,rect,4);
      result.push(visual);
    }
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
    const markText=s=>String(s).normalize('NFC').replace(/\s/g,'');
    const joined=rawTexts.map(markText).join('');
    if(/[◎①②③④⑤⑥⑦⑧⑨⑩@]/.test(joined))return '◎';
    const [x,y,w,h]=cell.rect;let sawCircle=/[○〇◯O]/.test(joined);
    for(const offset of [88,98]){
      const width=Math.min(48,w-offset);if(width<=10)continue;
      const t=(await textAt(image,[x+offset,y,width,h],false,false,true)).text;
      const n=markText(t);
      if(/[◎①②③④⑤⑥⑦⑧⑨⑩@]/.test(n))return '◎';
      if(/[○〇◯O]/.test(n))sawCircle=true;
    }
    return sawCircle?'○':'';
  }
  async function readAbilityCells(image,index){
    const result={specials:[],supers:[],warnings:[],dualAttackLevel:null};
    const cells=abilityCells(image);if(!cells.length)result.warnings.push(`${index}枚目：特殊能力の枠を読み取れませんでした。「取得状態を確認・修正する」で選び直してください。`);
    const missed=[],candidates=[];
    for(const cell of cells){
      // まず画像の形を照合し、誤読しやすい能力だけOCRより優先する。
      const visualName=abilityByImage(image,cell);
      if(visualName===DUAL_NORMAL_ATTACK){
        result.dualAttackLevel=Math.max(result.dualAttackLevel||0,1);
        if(window.__PHOTO_DEBUG__)console.log(index,cell.row,cell.col,'[image] '+visualName);
        continue;
      }

      let raw='',markHint='',parsed;
      if(visualName){
        raw='[image] '+visualName;
        parsed=cellAbility(visualName,'',cell.superCell);
      }else{
        const first=(await textAt(image,cell.rect,false,false,true)).text;
        const firstStem=pairStemFromText(first);
        let preliminary=cellAbility(first,'',cell.superCell),retry='';
        if(firstStem||preliminary.unknown.length||preliminary.candidate)retry=(await textAt(image,cell.rect,false,false,true,120)).text;
        const stem=firstStem||pairStemFromText(retry);
        markHint=stem?await abilityMarkHint(image,cell,[first,retry]):'';
        raw=first;parsed=cellAbility(first,markHint,cell.superCell);
        if(retry){
          const alternative=cellAbility(retry,markHint,cell.superCell);
          if(!alternative.unknown.length&&(parsed.unknown.length||!alternative.candidate)){raw=retry;parsed=alternative;}
        }
      }

      if(window.__PHOTO_DEBUG__)console.log(index,cell.row,cell.col,raw,markHint,cell.superCell);
      result.specials.push(...parsed.specials);
      for(const entry of parsed.supers){
        const visualLevel=levelByImage(image,cell);
        if(visualLevel!=null)entry.level=visualLevel;
        else{
          // 画像比較で取れない時だけOCRを補助に使う。Lv表示はセル右下にはみ出す。
          const [cx,cy]=cell.rect;
          const t=(await textAt(image,[cx+83,cy+25,55,35],true)).text;
          entry.level=/[12]$/.test(t)?Number(t.slice(-1)):null;
        }
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
    const visual=visualJobByImage(image);
    if(visual)return {job:visual,candidate:false,raw:'[image] '+visual};
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
    const out={academy:'',job:'',exp:{},basic:{},specials:[],supers:[],dualAttackLevel:null,warnings:[],dataScreens:0,abilityUpScreens:0};
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
        // 基本能力6種は画像比較のみ。OCRフォールバックはしない。
        const values=BASICS.map((_,j)=>basicByImageStrict(image,j));
        BASICS.forEach((n,j)=>{
          if(values[j]!=null)modalBasicSamples[n].push(values[j]);
          else out.warnings.push(`${i+1}枚目：${n}を画像比較で読み取れませんでした。基本能力を確認してください。`);
        });
        const result=await readAbilityCells(image,i+1);
        out.specials.push(...result.specials);out.supers.push(...result.supers);
        if(result.dualAttackLevel!=null)out.dualAttackLevel=Math.max(out.dualAttackLevel||0,result.dualAttackLevel);
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
    // 双剣士専用通常攻撃は通常の特殊能力とは別管理。
    // 専用Lv1の画像を拾えた場合はジョブ判定の補助にも使う。
    if(out.dualAttackLevel!=null){
      if(!out.job)out.job='双剣士';
      else if(out.job!=='双剣士')out.warnings.push('双剣士専用の通常攻撃を検出しました。ジョブを確認してください。');
    }
    if(out.job==='双剣士'&&out.dualAttackLevel==null)out.dualAttackLevel=1;
    out.specials=[...new Set(out.specials)];
    const superMap=new Map();
    for(const s of out.supers){
      const old=superMap.get(s.name);
      if(old?.level!=null && s.level==null){
        s.level=old.level;
      }else if(old?.level!=null && s.level!=null && old.level!==s.level){
        // 重複スクショで一方が誤判定してもLvを空欄に戻さない。
        // 先に確定できたLvを保持し、確認メッセージだけ出す。
        s.level=old.level;
        out.warnings.push(s.name+'のLv候補が画像間で一致しません。表示Lvを確認してください。');
      }
      superMap.set(s.name,s);
    }
    out.supers=[...superMap.values()];
    for(const entry of out.supers)if(entry.level==null)out.warnings.push(entry.name+'のLvを読み取れませんでした。下の「取得済み超特殊能力」でLvを確認してください。');
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
      <h3>取得済み特殊能力</h3><p id="photoOwnedSummary"></p><p class="photo-note">${data.job==='双剣士'?`<strong>双剣士専用 通常攻撃 Lv${data.dualAttackLevel||1}：取得済み</strong><br>通常の「通常攻撃○／◎」とは別能力です。Lv2以降は器用さ条件と経験点を満たして順番に取得します。`:''}</p><details><summary>取得状態を確認・修正する</summary><div class="photo-specials">${D.special.map((s,i)=>({s,i})).filter(({s})=>normalize(s[1])!==normalize(DUAL_NORMAL_ATTACK)).map(({s,i})=>`<label><input type="checkbox" data-photo-special="${i}" ${data.specials.includes(s[1])?'checked':''}>${escape(s[1])}</label>`).join('')}</div></details>
      <h3>取得済み超特殊能力</h3><p class="photo-note">上位能力に対応する◎・○は自動で取得済みにします。耐性のある能力はLvを選択してください。</p>
      <div id="photoSupers">${data.supers.map(s=>superRow(s)).join('')}</div><button id="photoAddSuper" class="secondary" type="button">＋超特殊能力を追加</button>
      <label class="photo-confirm"><input id="photoConfirmed" type="checkbox">特殊能力の続きも含め、読み取り結果を確認しました</label>
      <button id="applyPhotos" type="button">反映してコツを入力する</button>`;
    const summary=()=>{const names=[...box.querySelectorAll('[data-photo-special]:checked')].map(e=>D.special[Number(e.dataset.photoSpecial)][1]);el('photoOwnedSummary').textContent=names.join('／')||'取得済み能力なし（読み取り漏れがないか確認してください）';};summary();
    box.onchange=event=>{
      if(event.target.matches('.photo-super-name')){
        // Lvは査定に使わない上位能力でも、画像どおり確認できるよう常に表示する。
        event.target.closest('.photo-super-row').querySelector('.photo-super-level').disabled=false;
      }
      summary();
    };
    el('photoAddSuper').onclick=()=>el('photoSupers').insertAdjacentHTML('beforeend',superRow({}));
    el('photoSupers').onclick=e=>{if(e.target.matches('.photo-remove-super'))e.target.closest('.photo-super-row').remove();};
    el('applyPhotos').onclick=()=>{
      try{
        if(!el('photoConfirmed').checked)throw new Error('読み取り結果を確認し、チェックを入れてください。');
        const number=id=>el(id).value===''?null:Number(el(id).value);
        const result={academy:el('photoAcademy').value,job:el('photoJob').value,exp:Object.fromEntries(EXPS.map((n,i)=>[n,number('photoExp'+i)])),basic:Object.fromEntries(BASICS.map((n,i)=>[n,number('photoBasic'+i)])),specials:[...box.querySelectorAll('[data-photo-special]:checked')].map(e=>D.special[Number(e.dataset.photoSpecial)][1]),supers:[],dualAttackLevel:data.dualAttackLevel||(el('photoJob').value==='双剣士'?1:null)};
        for(const row of el('photoSupers').children){const name=row.querySelector('.photo-super-name').value,level=Number(row.querySelector('.photo-super-level').value);if(!name)throw new Error('超特殊能力の名前を選択してください。');const def=D.superResistances[name];if(def&&![1,2].includes(level))throw new Error('耐性のある超特殊能力のLvを選択してください。');if(result.supers.some(s=>s.name===name))throw new Error('超特殊能力が重複しています。');if(def?.job&&def.job!==result.job)throw new Error(name+'は'+def.job+'専用です。');result.supers.push({name,level:[1,2].includes(level)?level:null});}
        window.__PAWAADO_IMPORT_PHOTO__(result);
        status('反映しました。下のコツLvを入力して「計算する」を押してください。');
        el('basicCard').scrollIntoView({behavior:'smooth',block:'start'});
      }catch(error){status(error.message);}
    };
  }
  function superRow(s){return `<div class="photo-super-row"><select class="photo-super-name" aria-label="超特殊能力">${options(SUPER_NAMES,s.name)}</select><select class="photo-super-level" aria-label="超特殊能力のLv"><option value="">Lv</option><option value="1" ${s.level===1?'selected':''}>Lv1</option><option value="2" ${s.level===2?'selected':''}>Lv2</option></select><button type="button" class="secondary photo-remove-super" aria-label="削除">×</button></div>`;}
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
  window.__PAWAADO_PHOTO_TEST__={academyOf,findSpecials,readImages,abilityCells,cellAbility,jobOf,jobFromText,pairStemFromText,basicByImageStrict,classifyBasicDigit};
})();
