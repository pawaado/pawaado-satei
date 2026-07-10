(function(){
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const mutualGroups=[
  ['生存本能','闘争本能'],
  ['柔軟な体','頑丈な体'],
  ['無心の構え','護身の構え'],
  ['力学の理解','魔法の理解']
];
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1]);});
const academy=document.getElementById('academy');
const job=document.getElementById('job');
const specialList=document.getElementById('specialList');
const search=document.getElementById('skillSearch');
const basicOwned={}; basicNames.forEach(n=>basicOwned[n]=false);
const basicHints={}; basicNames.forEach(n=>basicHints[n]=0);
const specialState=new Map();
const specialNameIndex=new Map();
const specialReqIndex=new Map();
D.special.forEach((s,i)=>{
  specialNameIndex.set(String(s[1]),i);
  if(s[2]) specialReqIndex.set(String(s[2]),i);
});
let isCalculating=false;
const EMPTY_ITEMS=[];
const EMPTY_BITS=0n;
const specialBitCache=[];
function specialBit(i){
  if(specialBitCache[i]===undefined) specialBitCache[i]=(1n<<BigInt(i));
  return specialBitCache[i];
}
function specialItemsBits(items){
  let bits=EMPTY_BITS;
  if(!items||!items.length) return bits;
  for(const it of items){
    if(it && it.type==='special' && Number.isFinite(Number(it.idx))){
      bits |= specialBit(Number(it.idx));
    }
  }
  return bits;
}
const bitsKeyCache=new Map([[EMPTY_BITS,'0']]);
function bitsKey(bits){
  const value=bits||EMPTY_BITS;
  const cached=bitsKeyCache.get(value);
  if(cached!==undefined) return cached;

  const converted=value.toString(36);
  bitsKeyCache.set(value,converted);
  return converted;
}
function bitKeyOfState(st){
  return st.bitKey ?? bitsKey(st.bits ?? EMPTY_BITS);
}
function lifeKeyOfState(st){
  return st.life==null?'':Number(st.life).toString(36);
}
const scopeKeyCache=new Map();
function scopeKeyFor(life,bits){
  const lifePart=life==null?'':Number(life).toString(36);
  let byBits=scopeKeyCache.get(lifePart);
  if(!byBits){
    byBits=new Map();
    scopeKeyCache.set(lifePart,byBits);
  }

  const bitValue=bits??EMPTY_BITS;
  const cached=byBits.get(bitValue);
  if(cached!==undefined) return cached;

  const value=lifePart+'|'+bitsKey(bitValue);
  byBits.set(bitValue,value);
  return value;
}
function pruneScopeKey(st){
  if(st._pruneScopeKey) return st._pruneScopeKey;
  const v=scopeKeyFor(st.life,st.bits??EMPTY_BITS);
  st._pruneScopeKey=v;
  return v;
}
const mutualMaskByIndex=[];
function initSpecialBitMeta(){
  mutualGroups.forEach(g=>{
    let mask=EMPTY_BITS;
    g.forEach(n=>{
      const i=specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1;
      if(i>=0) mask|=specialBit(i);
    });
    g.forEach(n=>{
      const i=specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1;
      if(i>=0) mutualMaskByIndex[i]=mask & ~specialBit(i);
    });
  });
}
initSpecialBitMeta();
function conflictBitsFor(bits){
  let mask=EMPTY_BITS;
  for(let i=0;i<D.special.length;i++){
    const bit=specialBit(i);
    if((bits & bit)!==EMPTY_BITS) mask |= (mutualMaskByIndex[i]||EMPTY_BITS);
  }
  return mask;
}
const PROFILE={marks:new Map(),times:new Map()};
function pStart(k){PROFILE.marks.set(k,performance.now());}
function pEnd(k){const t=performance.now()-(PROFILE.marks.get(k)||performance.now());PROFILE.times.set(k,(PROFILE.times.get(k)||0)+t);}
function pReset(){PROFILE.marks.clear();PROFILE.times.clear();}
function pReport(){
  const rows=[...PROFILE.times.entries()].map(([k,v])=>`<tr><td>${k}</td><td>${(v/1000).toFixed(3)} 秒</td></tr>`);
  return rows.length?rows.join(""):'<tr><td colspan="2">計測なし</td></tr>';
}

function opt(label,value){return new Option(label,value??label)}
function academyRows(){return D.academies.filter(r=>r[0]===academy.value && r[1]===job.value)}
function hasAcademyJob(){return !!academy.value && !!job.value;}
function limits(){const r=academyRows()[0]; const m={}; basicNames.forEach((n,i)=>m[n]=r?Number(r[i+2]):null); return m;}
function initAcademies(){academy.innerHTML='';academy.add(opt('アカデミーを選択',''));Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));updateJobs();}
function updateJobs(){
  const jobs=jobsByAcademy[academy.value]||[];
  job.innerHTML=''; job.add(opt('ジョブを選択',''));
  jobs.forEach(j=>job.add(opt(j)));
  job.disabled=!academy.value;
  clearBasicState(); renderBasic(); renderSpecials();
}
academy.addEventListener('change',updateJobs);
job.addEventListener('change',()=>{clearBasicState();renderBasic();renderSpecials();});

function clearBasicState(){basicNames.forEach(n=>{basicOwned[n]=false; basicHints[n]=basicHints[n]||0;});}
function safeId(s){return String(s).replace(/[^a-zA-Z0-9_぀-ヿ㐀-鿿]/g,'_');}
function renderExp(){document.getElementById('expInputs').innerHTML=expNames.map(n=>`<div class="exp-row"><label>${n}</label><input type="number" min="0" max="1000" id="exp_${n}" inputmode="numeric" autocomplete="off"><div class="inline-error" id="err_exp_${safeId(n)}"></div></div>`).join('');}

function renderBasic(){
  const wrap=document.getElementById('basicInputs');
  const lim=limits();
  const disabled=!hasAcademyJob();
  wrap.innerHTML=basicNames.map(n=>`
    <div class="ability-block">
      <div class="ability-row ${basicOwned[n]?'owned':''}" data-basic="${n}">
        <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}" ${disabled?'disabled':''}>＋</button>
        <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}" ${disabled?'disabled':''}><span class="ability-name-text">${n}</span></button>
        <input class="ability-value" type="number" min="1" ${lim[n]?`max="${lim[n]}"`:''} id="basic_${n}" inputmode="numeric" autocomplete="off" ${disabled?'disabled':''}>
      </div>
      <div class="inline-error" id="err_basic_${safeId(n)}"></div>
    </div>`).join('');
  basicNames.forEach(n=>applyBasicVisual(n));
}
function renderSkillName(name){
  const s=String(name);
  let rank=''; let base=s;
  if(s.endsWith('○')){base=s.slice(0,-1);rank='<span class="rank-symbol" aria-label="○">○</span>';}
  else if(s.endsWith('◎')){base=s.slice(0,-1);rank='<span class="rank-symbol" aria-label="◎">◎</span>';}
  return `<span class="skill-name-text">${base}${rank}</span>`;
}
function getSpecialState(i){const k=String(i); if(!specialState.has(k)) specialState.set(k,{hint:0,own:0}); return specialState.get(k);}
function isUpperSpecial(i){return String(D.special[i][1]).endsWith('◎');}
function lowerIndex(i){const req=D.special[i]?.[2]; if(!req)return -1; return specialNameIndex.has(String(req))?specialNameIndex.get(String(req)):-1;}
function upperIndex(i){const name=D.special[i]?.[1]; return specialReqIndex.has(String(name))?specialReqIndex.get(String(name)):-1;}
function pairIndex(i){const li=lowerIndex(i); if(li>=0)return li; return upperIndex(i);}
function specialOwned(i){return getSpecialState(i).own===1;}
function specialHint(i){return Number(getSpecialState(i).hint||0);}
function shouldShowSpecial(i){
  const name=String(D.special[i][1]);
  const q=(search.value||'').trim().toLowerCase();
  if(q) return name.toLowerCase().includes(q);
  if(!isUpperSpecial(i)) return true;
  const li=lowerIndex(i);
  return (li>=0 && specialOwned(li)) || specialOwned(i);
}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!shouldShowSpecial(i)) return '';
    const st=getSpecialState(i);
    return `<div class="skill-row ${Number(st.own)?'owned':''}" data-index="${i}">
      <button type="button" class="hint-btn" data-kind="special-hint" data-index="${i}">＋</button>
      <button type="button" class="name-btn" data-kind="special-name" data-index="${i}"><span>${renderSkillName(s[1])}</span></button>
    </div>`;
  }).join('');
  specialList.innerHTML=html;
  D.special.forEach((_,i)=>applySkillVisual(i));
}
search.addEventListener('input',renderSpecials);
function ownedLabel(on){return on ? '<span class="owned-label">✓取得済</span>' : ''}
function setHintBtn(btn,level){if(!btn)return; btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function cycleHint(v){return (Number(v)||0)>=5 ? 0 : (Number(v)||0)+1;}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  const lim=limits(); const disabled=!hasAcademyJob();
  setHintBtn(row.querySelector('.hint-btn'),basicHints[name]||0);
  row.classList.toggle('owned',!!basicOwned[name]);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span class="ability-name-text">${name}</span>${ownedLabel(!!basicOwned[name])}`;
  const inp=document.getElementById('basic_'+name);
  if(inp){
    inp.disabled=disabled || !!basicOwned[name];
    inp.classList.toggle('locked',!!basicOwned[name]);
    if(basicOwned[name] && lim[name]!=null) inp.value=lim[name];
  }
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`); if(!row)return;
  const st=getSpecialState(i); setHintBtn(row.querySelector('.hint-btn'),st.hint); row.classList.toggle('owned',Number(st.own)===1);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span>${renderSkillName(D.special[i][1])}</span>${ownedLabel(Number(st.own)===1)}`;
}
function baseNameOfSkill(i){return String(D.special[i][1]).replace(/[○◎]$/,'');}
function inMutualGroup(name){return mutualGroups.find(g=>g.includes(name));}
function setSpecialOwned(i,on,chain=true){
  const st=getSpecialState(i); st.own=on?1:0;
  if(on){
    const group=inMutualGroup(D.special[i][1]);
    if(group){group.forEach(n=>{const j=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(j>=0 && j!==i){getSpecialState(j).own=0; applySkillVisual(j);}});}
  }
  applySkillVisual(i);
  if(!chain){ renderSpecials(); return; }
  if(on){const li=lowerIndex(i); if(li>=0) setSpecialOwned(li,true,false);}
  else{const ui=upperIndex(i); if(ui>=0) setSpecialOwned(ui,false,false);}
  renderSpecials();
}
function setSpecialHint(i,level,chain=true){
  const st=getSpecialState(i); st.hint=Number(level)||0; applySkillVisual(i);
  if(chain){const p=pairIndex(i); if(p>=0) setSpecialHint(p,level,false);}
}
function toggleSpecial(i){setSpecialOwned(i,!(getSpecialState(i).own===1));}

document.addEventListener('dblclick',e=>{if(e.target.closest('button')) e.preventDefault();},{passive:false});
document.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t)return;
  if(isCalculating && t.id!=='calcBtn'){ e.preventDefault(); return; }
  const kind=t.dataset.kind;
  if(kind==='basic-hint'){const name=t.dataset.name; basicHints[name]=cycleHint(basicHints[name]); applyBasicVisual(name); return;}
  if(kind==='basic-name'){
    if(!hasAcademyJob()) return;
    const name=t.dataset.name; basicOwned[name]=!basicOwned[name];
    applyBasicVisual(name); return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});


function setInlineError(id,msg){const el=document.getElementById(id); if(el) el.textContent=msg||'';}
function validateExpField(name){
  const inp=document.getElementById('exp_'+name); if(!inp) return '';
  const v=inp.value;
  let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    if(!Number.isFinite(num) || num<0) msg='経験点は0以上の値を入力してください';
    else if(num>1000) msg='経験点は1000以下の値を入力してください';
  }
  setInlineError('err_exp_'+safeId(name),msg);
  inp.classList.toggle('input-error',!!msg);
  return msg;
}
function validateBasicField(name){
  const inp=document.getElementById('basic_'+name); if(!inp) return '';
  const lim=limits()[name]; const v=inp.value;
  let msg='';
  if(v!=='' && v!=null){
    const num=Number(v);
    if(!Number.isFinite(num) || num<1) msg='基本能力は1以上の値を入力してください';
    else if(lim!=null && num>lim) msg='入力した値は上限を超えています';
  }
  setInlineError('err_basic_'+safeId(name),msg);
  inp.classList.toggle('input-error',!!msg);
  return msg;
}
function validateAllInline(){expNames.forEach(validateExpField); basicNames.forEach(validateBasicField);}

document.addEventListener('input',e=>{
  if(isCalculating) return;
  const inp=e.target;
  if(!inp || !inp.id) return;
  if(inp.id.startsWith('exp_')){ validateExpField(inp.id.replace('exp_','')); return; }
  if(!inp.id.startsWith('basic_')) return;
  const name=inp.id.replace('basic_','');
  validateBasicField(name);
  const lim=limits()[name];
  if(lim!=null && inp.value!=='' && Number(inp.value)===lim){
    basicOwned[name]=true;
    applyBasicVisual(name);
  }else{
    basicOwned[name]=false;
    applyBasicVisual(name);
  }
});

function jobScoreIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}
function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:({0:0,1:.5,2:.6,3:.7,4:.8,5:.9}[hint]||0); return Math.floor(cost*(1-disc));}
function currentHpForLife(life){let hp=50; for(const r of D.hp){if(life>=Number(r[0])) hp=Number(r[1]);} return hp;}
function parseRange(r){const m=String(r).match(/(\d+)→(\d+)/); return m?{a:Number(m[1]),b:Number(m[2])}:null;}
function tableFor(name){
  if(name==='生命力') return {cost:D.life,score:D.life};
  if(name==='パワー') return {cost:D.powerCost,score:['剣士','弓使い','重戦士'].includes(job.value)?D.powerPhysicalScore:D.powerMagicScore};
  if(name==='魔力') return {cost:D.magicCost,score:['魔闘士','魔法使い','僧侶'].includes(job.value)?D.magicMagicScore:D.magicPhysicalScore};
  if(name==='器用さ') return {cost:D.dexCost,score:D.dexScore};
  if(name==='耐久力') return {cost:D.staminaCost,score:D.staminaScore};
  if(name==='精神力') return {cost:D.mentalCost,score:D.mentalScore};
}
function addCost(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2],a[3]+b[3],a[4]+b[4]];}
function leq(a,b){return a[0]<=b[0]&&a[1]<=b[1]&&a[2]<=b[2]&&a[3]<=b[3]&&a[4]<=b[4];}
function key(c){
  const n=((((c[0]*1001+c[1])*1001+c[2])*1001+c[3])*1001+c[4]);
  return String(n);
}
function stateKey(st){return key(st.cost)+'|'+scopeKeyFor(st.life,st.bits??EMPTY_BITS);}
function costSum(c){return c[0]+c[1]+c[2]+c[3]+c[4];}
function mergeItems(a,b){return !b.length?a:(!a.length?b:a.concat(b));}
function itemLenOf(st){return st?.itemLen ?? (st?.items?.length || 0);}
function makeState(cost,score,life,prev=null,choice=EMPTY_ITEMS,itemLen=null,bits=null){
  const ch=(choice&&choice.length)?choice:EMPTY_ITEMS;
  const chBits=bits!=null ? bits : specialItemsBits(ch);
  const prevBits=prev?.bits ?? EMPTY_BITS;
  const nextBits=prevBits|chBits;
  return {
    cost,
    score,
    life,
    prev,
    choice:ch,
    bits:nextBits,
    bitKey:bitsKey(nextBits),
    _pruneScopeKey:scopeKeyFor(life,nextBits),
    itemLen:itemLen ?? ((prev?itemLenOf(prev):0)+ch.length)
  };
}
function restoreItems(st){
  if(!st) return [];
  if(st.items) return st.items;

  const chunks=[];
  let cur=st;
  while(cur){
    if(cur.choice&&cur.choice.length) chunks.push(cur.choice);
    cur=cur.prev;
  }

  const out=[];
  for(let i=chunks.length-1;i>=0;i--){
    out.push(...chunks[i]);
  }
  st.items=out;
  return out;
}
function better(a,b){return !b || a.score>b.score || (a.score===b.score && itemLenOf(a)<itemLenOf(b));}
function yieldToBrowser(){return new Promise(r=>setTimeout(r,0));}
function prune(states,limit=12000){
  const mode=currentCalcMode();
  const arr=[...states.values()]
    .map(st=>{st.totalCost=costSum(st.cost); return st;})
    .sort((a,b)=>{
      if(b.score!==a.score) return b.score-a.score;
      return a.totalCost-b.totalCost;
    });

  function sameScope(a,b){
    return pruneScopeKey(a)===pruneScopeKey(b);
  }

  if(mode!=='high'){
    const preLimit=Math.min(arr.length,Math.floor(Math.max(limit*1.4,limit+500)));
    const src=arr.slice(0,preLimit);
    const keep=[];

    outer: for(const st of src){
      const checkMax=Math.min(keep.length,320);
      for(let i=0;i<checkMax;i++){
        const k=keep[i];

        // 正確性優先：
        // 生命力だけでなく、取得済み特殊能力bitも同じ状態だけを支配判定する。
          if(sameScope(k,st) && leq(k.cost,st.cost) && k.score>=st.score){
            continue outer;
        }
      }
      keep.push(st);
      if(keep.length>=limit) break;
    }

    const m=new Map();
    keep.forEach(st=>{
      delete st.totalCost;
      m.set(stateKey(st),st);
    });
    return m;
  }

  // 正確性優先版：
  // 同じ「生命力 + 特殊能力bit」の中だけで、低コスト・高査定の状態を支配判定する。
  // 生命力が同じでも取得済み特殊能力が違う状態は、今後の選択肢が違うため別物として残す。
  const preLimit=Math.min(arr.length,Math.max(limit*4,limit+2600));
  const src=arr.slice(0,preLimit);
  const avgExp=src.length?src.reduce((sum,st)=>sum+st.totalCost,0)/src.length:0;
  const EXACT_CHECK_LIMIT=avgExp>1500?1200:900;
  const BUCKET_SIZE=avgExp>1500?70:45;
  const BUCKET_KEEP_LIMIT=avgExp>1500?220:150;

  const keep=[];
  const skylineByScope=new Map();
  const buckets=new Map();

  function bucketKey(st){
    const c=st.cost;
    return Math.floor(c[0]/BUCKET_SIZE)+','+
      Math.floor(c[1]/BUCKET_SIZE)+','+
      Math.floor(c[2]/BUCKET_SIZE)+','+
      Math.floor(c[3]/BUCKET_SIZE)+','+
      Math.floor(c[4]/BUCKET_SIZE)+'|'+pruneScopeKey(st);
  }

  function nearbyBucketKeys(st){
    const c=st.cost;
    const base=[
      Math.floor(c[0]/BUCKET_SIZE),
      Math.floor(c[1]/BUCKET_SIZE),
      Math.floor(c[2]/BUCKET_SIZE),
      Math.floor(c[3]/BUCKET_SIZE),
      Math.floor(c[4]/BUCKET_SIZE)
    ];
    const scope=pruneScopeKey(st);
    const keys=[];
    for(let mask=0;mask<32;mask++){
      const b0=base[0]-((mask&1)?1:0);
      const b1=base[1]-((mask&2)?1:0);
      const b2=base[2]-((mask&4)?1:0);
      const b3=base[3]-((mask&8)?1:0);
      const b4=base[4]-((mask&16)?1:0);
      if(b0<0||b1<0||b2<0||b3<0||b4<0) continue;
      keys.push(b0+','+b1+','+b2+','+b3+','+b4+'|'+scope);
    }
    return keys;
  }

  function dominatedBySkyline(st){
    const list=skylineByScope.get(pruneScopeKey(st));
    if(!list) return false;
    const max=Math.min(list.length,EXACT_CHECK_LIMIT);
    for(let i=0;i<max;i++){
      const k=list[i];

      // 支配には「査定以上」かつ「総コスト以下」が最低条件。
      // 満たさない候補では5項目のコスト比較を行わない。
      if(k.score<st.score) break;
      if(k.totalCost>st.totalCost) continue;

      if(leq(k.cost,st.cost)){
        return true;
      }
    }
    return false;
  }

  function addToSkyline(st){
    const scope=pruneScopeKey(st);
    let list=skylineByScope.get(scope);
    if(!list){list=[]; skylineByScope.set(scope,list);}

    // arrは「査定の高い順、同査定なら総コストの低い順」で処理される。
    // そのため、後から来た状態が既存状態を支配して追い出すケースは実質発生しない。
    // ここで全件比較すると膨大な無駄になるため、登録だけ行う。
    list.push(st);
  }

  outer: for(const st of src){
    if(dominatedBySkyline(st)) continue;

    const keys=nearbyBucketKeys(st);
    for(const bk of keys){
      const list=buckets.get(bk);
      if(!list) continue;
      for(const k of list){

        // bucket内でも、支配の最低条件を満たさない候補は即スキップ。
        if(k.score<st.score) continue;
        if(k.totalCost>st.totalCost) continue;

          if(leq(k.cost,st.cost)){
            continue outer;
        }
      }
    }

    keep.push(st);
    addToSkyline(st);

    const bk=bucketKey(st);
    let list=buckets.get(bk);
    if(!list){list=[]; buckets.set(bk,list);}

    if(list.length<BUCKET_KEEP_LIMIT){
      list.push(st);
    }else{
      let worstIdx=0;
      let worst=list[0];
      for(let wi=1;wi<list.length;wi++){
        const cand=list[wi];
        if(cand.score<worst.score || (cand.score===worst.score && cand.totalCost>worst.totalCost)){
          worst=cand;
          worstIdx=wi;
        }
      }
      if(st.score>worst.score || (st.score===worst.score && st.totalCost<worst.totalCost)){
        list[worstIdx]=st;
      }
    }

    if(keep.length>=limit) break;
  }

  const m=new Map();
  keep.forEach(st=>{
    delete st.totalCost;
    m.set(stateKey(st),st);
  });
  return m;
}
const rangeRowCache=new WeakMap();
function rowsForTable(table){
  if(rangeRowCache.has(table)) return rangeRowCache.get(table);
  const rows=table.map(r=>({row:r,range:parseRange(r[0])})).filter(x=>x.range);
  rangeRowCache.set(table,rows);
  return rows;
}
function rowForValue(table,value){
  for(const x of rowsForTable(table)){
    if(value>=x.range.a && value<x.range.b) return x.row;
  }
  return null;
}
function basicCostVector(name,costRow,hint){
  // 生命力テーブルだけ、査定列を含むため必要経験点は3列目以降。
  // それ以外の基本能力は1列目以降が5種類の必要経験点。
  const raw = name==='生命力' ? [costRow[3],costRow[4],costRow[5],costRow[6],costRow[7]] : [costRow[1],costRow[2],costRow[3],costRow[4],costRow[5]];
  const nums = raw.map(x=>Number(x));
  if(nums.some(x=>!Number.isFinite(x))) return null;
  return nums.map(x=>costAfter(x,hint,true));
}
function basicOptions(name,exp){
  const lim=limits();
  const inp=document.getElementById('basic_'+name);
  const cur=Number(inp?.value||1);
  const hint=Number(basicHints[name]||0);
  const max=lim[name];
  if(basicOwned[name]) return [{cost:[0,0,0,0,0],score:0,items:EMPTY_ITEMS,itemLen:0,life: name==='生命力'?max:null,costSum:0,eff:0}];
  const t=tableFor(name);
  const opts=[{cost:[0,0,0,0,0],score:0,items:EMPTY_ITEMS,itemLen:0,life:name==='生命力'?cur:null,costSum:0,eff:0}];
  let c=[0,0,0,0,0], sc=0;
  let v=cur;
  while(max!=null && v<max){
    const costRow=rowForValue(t.cost,v);
    const scoreRow=rowForValue(t.score,v);
    if(!costRow || !scoreRow) break;
    const step=basicCostVector(name,costRow,hint);
    if(!step) break;
    c=addCost(c,step);
    sc += Number(scoreRow[2]||0);
    v += 1;
    if(leq(c,exp)){
      const cs=costSum(c);
      opts.push({
        cost:c.slice(),
        score:sc,
        items:[{type:'basic',name,from:cur,to:v,idx:basicNames.indexOf(name)}],
        itemLen:1,
        life:name==='生命力'?v:null,
        costSum:cs,
        eff:sc/(1+cs)
      });
    }
  }
  return opts;
}
function basicPlanEntry(name,exp){
  const opts=basicOptions(name,exp);
  let bestEff=0;
  let bestScore=0;
  for(const op of opts){
    if(op.eff>bestEff) bestEff=op.eff;
    if(op.score>bestScore) bestScore=op.score;
  }
  // 生命力はHP依存特殊能力に効くので、同効率なら少し早めに探索する。
  const priority=bestEff+(name==='生命力'?0.0001:0);
  return {name,opts,priority,bestScore};
}
function buildBasicStates(exp){
  const initialLife=Number(document.getElementById('basic_生命力')?.value||1);
  const init=makeState([0,0,0,0,0],0,initialLife,null,EMPTY_ITEMS,0,EMPTY_BITS);
  let states=new Map([[stateKey(init),init]]);

  // v4.5: 基礎能力は固定順ではなく、査定効率が高い能力から探索する。
  // 表示順は resultTable 側でゲーム順に戻すので、結果表示には影響しない。
  const plan=basicNames
    .map(name=>basicPlanEntry(name,exp))
    .sort((a,b)=>{
      if(b.priority!==a.priority) return b.priority-a.priority;
      return basicNames.indexOf(a.name)-basicNames.indexOf(b.name);
    });

  for(const entry of plan){
    const next=new Map();

    for(const st of states.values()){
      for(const op of entry.opts){
        const nc=addCost(st.cost,op.cost);
        if(!leq(nc,exp)) continue;

        const newScore=st.score+op.score;
        const newLife=op.life!==null?op.life:st.life;
        const k=key(nc)+'|'+(newLife==null?'':Number(newLife).toString(36));
        const old=next.get(k);
        const newItemLen=itemLenOf(st)+(op.itemLen ?? op.items.length);

        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))) continue;

        next.set(k,makeState(nc,newScore,newLife,st,op.items,newItemLen));
      }
    }

    if(!next.size) continue;
    states=next.size>6200 ? prune(next,6200) : next;
    if(!states.size) break;
  }

  return states;
}
const specialItemCache=new Map();
const specialGroupCache=new Map();
const filteredSpecialGroupCache=new Map();
const calcResultCache=new Map();
function clearCalcCaches(){
  specialItemCache.clear();
  specialGroupCache.clear();
  filteredSpecialGroupCache.clear();
}
function calcCacheKey(exp){
  const basicPart=basicNames.map(n=>{
    const v=document.getElementById('basic_'+n)?.value||'';
    return [n,v,basicOwned[n]?1:0,basicHints[n]||0].join(':');
  }).join('|');
  const specialPart=[...specialState.entries()]
    .filter(([,st])=>Number(st.hint||0)>0 || Number(st.own||0)>0)
    .sort((a,b)=>Number(a[0])-Number(b[0]))
    .map(([i,st])=>i+':'+(st.hint||0)+':'+(st.own||0))
    .join('|');
  return [academy.value,job.value,currentCalcMode(),key(exp),basicPart,specialPart].join('||');
}
function cloneResult(st){
  const items=restoreItems(st);
  return {
    cost:(st.cost||[0,0,0,0,0]).slice(),
    score:st.score||0,
    life:st.life??null,
    items:items.map(x=>({...x})),
    itemLen:itemLenOf(st),
    bits:st.bits ?? specialItemsBits(items),
    bitKey:st.bitKey ?? bitsKey(st.bits ?? specialItemsBits(items))
  };
}
function getCachedResult(cacheKey){
  const hit=calcResultCache.get(cacheKey);
  return hit?cloneResult(hit):null;
}
function setCachedResult(cacheKey,result){
  if(calcResultCache.size>30){
    const first=calcResultCache.keys().next().value;
    calcResultCache.delete(first);
  }
  calcResultCache.set(cacheKey,cloneResult(result));
}
function itemForSpecialIndex(i,hp,includeLower=false){
  const s=D.special[i]; if(!s) return null;
  const cacheKey=[i,hp,includeLower?1:0,specialHint(i),specialOwned(i)?1:0].join('|');
  if(specialItemCache.has(cacheKey)){
    return specialItemCache.get(cacheKey);
  }

  const score=skillScore(s,hp);
  if(score<=0){
    specialItemCache.set(cacheKey,null);
    return null;
  }

  const hint=specialHint(i);
  const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
  let totalCost=costs.slice();
  let totalScore=score;
  let items=[{type:'special',idx:i,name:s[1]}];

  if(includeLower){
    const li=lowerIndex(i);
    if(li>=0 && !specialOwned(li)){
      const lower=itemForSpecialIndex(li,hp,false);
      if(lower){
        totalCost=addCost(totalCost,lower.cost);
        totalScore+=lower.score;
        items=lower.items.concat(items);
      }
    }
  }

  const bits=specialItemsBits(items);
  const result={type:'choice',cost:totalCost,score:totalScore,items,itemLen:items.length,bits,bitKey:bitsKey(bits),conflictBits:conflictBitsFor(bits),idx:i,name:s[1]};
  specialItemCache.set(cacheKey,result);
  return result;
}
function specialChoiceGroups(hp){
  const used=new Set(); const groups=[];
  D.special.forEach((s,i)=>{
    if(used.has(i)) return;
    const ui=upperIndex(i);
    const li=lowerIndex(i);
    if(li>=0) return;
    if(ui>=0){
      used.add(i); used.add(ui);
      const opts=[];
      if(!specialOwned(i)){
        const lower=itemForSpecialIndex(i,hp,false); if(lower) opts.push(lower);
        if(!specialOwned(ui)){const upper=itemForSpecialIndex(ui,hp,true); if(upper) opts.push(upper);}
      }else if(!specialOwned(ui)){
        const upperOnly=itemForSpecialIndex(ui,hp,false); if(upperOnly) opts.push(upperOnly);
      }
      if(opts.length) groups.push({kind:'pair',base:baseNameOfSkill(i),opts});
    }
  });
  mutualGroups.forEach(g=>{
    const opts=[];
    const already=g.some(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); return i>=0 && specialOwned(i);});
    if(!already){
      g.forEach(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(i>=0 && !used.has(i) && !specialOwned(i)){const it=itemForSpecialIndex(i,hp,false); if(it) opts.push(it); used.add(i);}});
    }else{
      g.forEach(n=>{const i=(specialNameIndex.has(String(n))?specialNameIndex.get(String(n)):-1); if(i>=0) used.add(i);});
    }
    if(opts.length) groups.push({kind:'mutual',opts});
  });
  D.special.forEach((s,i)=>{
    if(used.has(i) || specialOwned(i)) return;
    if(isUpperSpecial(i)) return;
    const it=itemForSpecialIndex(i,hp,false); if(it) groups.push({kind:'single',opts:[it]});
  });
  return groups;
}
function specialChoiceGroupsCached(hp){
  const k=String(hp);
  if(specialGroupCache.has(k)) return specialGroupCache.get(k);

  // v4.5: 特殊能力候補はHPごとに事前整形・事前ソートしてキャッシュする。
  // 計算本体では原則ソートし直さず、フィルタだけ行う。
  const groups=specialChoiceGroups(hp)
    .map(g=>{
      const opts=g.opts.map(op=>{
        const cs=costSum(op.cost);
        const bits=op.bits ?? specialItemsBits(op.items);
        return {...op,bits,bitKey:op.bitKey ?? bitsKey(bits),conflictBits:op.conflictBits ?? conflictBitsFor(bits),costSum:cs,eff:op.score/(1+cs)};
      }).sort((a,b)=>{
        if(b.eff!==a.eff) return b.eff-a.eff;
        return b.score-a.score;
      });
      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce((m,o)=>Math.max(m,o.eff),0);
      return {...g,opts,maxScore,bestEfficiency};
    })
    .filter(g=>g.opts.length>0)
    .sort((a,b)=>{
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  specialGroupCache.set(k,groups);
  return groups;
}
function impossibleChoice(op,exp){return !leq(op.cost,exp);}
function specialChoiceGroupsForExpCached(hp,exp,preGroups=null){
  const cacheKey=String(hp)+'|'+key(exp);
  if(filteredSpecialGroupCache.has(cacheKey)){
    return filteredSpecialGroupCache.get(cacheKey);
  }

  const source=preGroups||specialChoiceGroupsCached(hp);
  const groups=source
    .map(g=>{
      const opts=g.opts.filter(op=>!impossibleChoice(op,exp));
      if(!opts.length) return null;

      const maxScore=opts.reduce((m,o)=>Math.max(m,o.score),0);
      const bestEfficiency=opts.reduce(
        (m,o)=>Math.max(m,o.eff ?? (o.score/(1+(o.costSum??costSum(o.cost))))),
        0
      );

      return {...g,opts,maxScore,bestEfficiency};
    })
    .filter(Boolean)
    .sort((a,b)=>{
      if(b.bestEfficiency!==a.bestEfficiency) return b.bestEfficiency-a.bestEfficiency;
      return b.maxScore-a.maxScore;
    });

  filteredSpecialGroupCache.set(cacheKey,groups);
  return groups;
}

function progressMessage(progress){
  if(!progress) return '計算中';
  const pct=Math.min(99,Math.floor(progress.done/progress.total*100));
  const d=progress.debug;
  if(d){
    return `計算中 ${pct}% / 候補:${d.candidate} 採用:${d.accept} UB:${d.ubCut} prune:${d.prune||0}`;
  }
  return `計算中 ${pct}%`;
}
function currentCalcMode(){
  return 'high';
}
function calcModeLabel(){
  return '高精度';
}
function renderCalcMode(){
  const btn=document.getElementById('calcBtn');
  if(!btn || document.getElementById('calcMode')) return;

  const wrap=document.createElement('div');
  wrap.className='calc-mode-wrap';
  wrap.innerHTML=`
    <label for="calcMode">計算モード</label>
    <select id="calcMode">
      <option value="high" selected>高精度（推奨）</option>
      <option value="normal">高速β（検証用）</option>
    </select>
  `;

  btn.parentNode.insertBefore(wrap,btn);
}
function groupEfficiency(g){
  return g.bestEfficiency ?? g.opts.reduce((m,o)=>Math.max(m,o.eff ?? (o.score/(1+(o.costSum??costSum(o.cost)))),0),0);
}
async function optimizeSpecialsForLife(baseStates, exp, hp, onProgress, progress, preGroups=null){
  let groups=specialChoiceGroupsForExpCached(hp,exp,preGroups);

  const totalExp=costSum(exp);
  const mode=currentCalcMode();

  // 知力余り対策：
  // 単純な査定効率順だけでなく、取得後の残経験点バランスが極端に崩れにくい候補を少し優先する。
  function balancePenalty(cost){
    let p=0;
    for(let i=0;i<5;i++){
      const remain=exp[i]-cost[i];
      p += remain*remain;
    }
    return p;
  }

  groups=groups.map(g=>{
    const opts=[...g.opts].sort((a,b)=>{
      if((b.eff||0)!==(a.eff||0)) return (b.eff||0)-(a.eff||0);
      if(b.score!==a.score) return b.score-a.score;
      return balancePenalty(a.cost)-balancePenalty(b.cost);
    });
    return {...g,opts};
  });

  // v4.5: 事前ソートと上界枝刈りを前提に、高精度は少しだけ保持数を絞る。
  const STATE_LIMIT=mode==='high'
    ? Math.max(2400,Math.min(6800,1700+Math.floor(totalExp*0.9)))
    : Math.max(700,Math.min(1800,500+Math.floor(totalExp*0.45)));
  // 高速化：
  // 正確性優先の修正で候補が増えるため、途中pruneの発火を少し遅らせる。
  // STATE_LIMIT自体は変えず、HARD_LIMITだけ広げてprune回数を減らす。
  const HARD_LIMIT=Math.floor(STATE_LIMIT*(mode==='high'?1.6:1.35));

  // ③ Upper Bound: 残りグループで取り得る最大査定を安全側に足し、
  // すでにベストへ届かない状態は早めにスキップする。
  const suffixMax=new Array(groups.length+1).fill(0);
  const suffixBestEff=new Array(groups.length+1).fill(0);
  for(let i=groups.length-1;i>=0;i--){
    suffixMax[i]=suffixMax[i+1]+(groups[i].maxScore||0);
    suffixBestEff[i]=Math.max(suffixBestEff[i+1],groupEfficiency(groups[i]));
  }

  function remainingCostSum(st){
    return (
      (exp[0]-st.cost[0])+
      (exp[1]-st.cost[1])+
      (exp[2]-st.cost[2])+
      (exp[3]-st.cost[3])+
      (exp[4]-st.cost[4])
    );
  }

  // Sprint: Upper Bound軽量化。
  // 残経験点は配列ではなく合計値だけで扱い、同じ条件のUpper Boundはキャッシュする。
  const upperBoundCache=new Map();
  function remainingScoreUpper(start,remainSum){
    const cacheKey=start+'|'+remainSum;
    if(upperBoundCache.has(cacheKey)) return upperBoundCache.get(cacheKey);

    const byGroup=suffixMax[start]||0;
    const byEfficiency=remainSum*(suffixBestEff[start]||0)*1.15;

    // 速度優先：
    // 効率上界を少し安全マージン付きで戻し、候補爆発を抑える。
    const v=byGroup<byEfficiency ? byGroup : byEfficiency;
    upperBoundCache.set(cacheKey,v);
    return v;
  }

  let states=new Map();

  for(const base of baseStates){
    if(!base) continue;
    const st=base;
    const k=stateKey(st);
    if(better(st,states.get(k))) states.set(k,st);
  }

  if(!states.size){
    return {items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
  }

  if(states.size>STATE_LIMIT) states=prune(states,STATE_LIMIT);
  let bestScore=-Infinity;
  for(const st of states.values()){
    if(st.score>bestScore) bestScore=st.score;
  }

  for(let gi=0;gi<groups.length;gi++){
    const group=groups[gi];
    const next=new Map(states);
    let iter=0;


    for(const st of states.values()){
      // この状態から残り全部を最高値で取っても届かないならスキップ。
      if(st.score+suffixMax[gi]<bestScore){
        if(progress?.debug) progress.debug.ubCut++;
        iter++;
        if(iter%2500===0) await yieldToBrowser();
        continue;
      }

      // 残経験点込みの上界でも届かないなら、より早く枝刈りする。
      const remainSum=st._remainSum ?? (st._remainSum=remainingCostSum(st));
      if(st.score+remainingScoreUpper(gi,remainSum)<bestScore){
        if(progress?.debug) progress.debug.ubCut++;
        iter++;
        if(iter%2500===0) await yieldToBrowser();
        continue;
      }

      const stBits=st.bits ?? EMPTY_BITS;

      for(const op of group.opts){
        if(progress?.debug) progress.debug.candidate++;
        const opBits=op.bits ?? specialItemsBits(op.items);
        if((stBits & opBits)!==EMPTY_BITS) continue;
        if((stBits & (op.conflictBits ?? EMPTY_BITS))!==EMPTY_BITS) continue;

        const nc=addCost(st.cost,op.cost);
        if(!leq(nc,exp)) continue;

        const newScore=st.score+op.score;
        const childRemainSum=remainSum-(op.costSum ?? costSum(op.cost));
        if(newScore+remainingScoreUpper(gi+1,childRemainSum)<bestScore){
          if(progress?.debug) progress.debug.ubCut++;
          continue;
        }
        if(newScore>bestScore) bestScore=newScore;

        // v5.0: 同一状態は生成直後に統合する。
        // items配列の結合は「採用される可能性がある状態」だけに限定する。
        const nextBits=stBits | opBits;
        const k=key(nc)+'|'+scopeKeyFor(st.life,nextBits);
        const old=next.get(k);
        const newItemLen=itemLenOf(st)+(op.itemLen ?? op.items.length);
        if(old && (old.score>newScore || (old.score===newScore && itemLenOf(old)<=newItemLen))){
          if(progress?.debug) progress.debug.dupCut++;
          continue;
        }

        const newState=makeState(nc,newScore,st.life,st,op.items,newItemLen,opBits);
        if(progress?.debug) progress.debug.accept++;
        next.set(k,newState);
      }

      if(next.size>HARD_LIMIT){
        if(progress?.debug){
          progress.debug.prune++;
        }
        const pruned=prune(next,STATE_LIMIT);
        next.clear();
        pruned.forEach((v,k)=>next.set(k,v));
      }

      iter++;
      if(iter%2500===0) await yieldToBrowser();
    }

    // 支配除外がほぼ発生しないため、状態数が上限を超えた時だけpruneする。
    if(next.size>STATE_LIMIT){
      if(progress?.debug) progress.debug.prune++;
      states=prune(next,STATE_LIMIT);
    }else{
      states=next;
    }
    for(const st of states.values()){
      if(st.score>bestScore) bestScore=st.score;
    }

    if(progress){
      progress.done++;
      onProgress?.(progressMessage(progress));
    }else{
      onProgress?.('計算中');
    }

    await yieldToBrowser();
  }

  let best=null;

  for(const st of states.values()){
    if(better(st,best)) best=st;
  }

  return best||{items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:null,bits:EMPTY_BITS};
}
async function optimizeAsync(exp,onProgress){
  await yieldToBrowser();
  onProgress?.('計算中 0%');

  const fallback={items:EMPTY_ITEMS,itemLen:0,score:0,cost:[0,0,0,0,0],life:Number(document.getElementById('basic_生命力')?.value||1)};

  pStart("基本能力生成");
  const basicMap=buildBasicStates(exp);
  pEnd("基本能力生成");
  const basicStates=[...basicMap.values()];

  if(!basicStates.length){
    onProgress?.('計算中 100%');
    return fallback;
  }

  await yieldToBrowser();

  const byLife=new Map();
  basicStates.forEach(st=>{
    const life=st.life||Number(document.getElementById('basic_生命力')?.value||1);
    const hp=currentHpForLife(life);
    if(!byLife.has(hp)) byLife.set(hp,[]);
    byLife.get(hp).push(st);
  });

  const tasks=[];
  let total=0;

  for(const [hp,statesRaw] of byLife.entries()){
    const baseMap=new Map();

    statesRaw.forEach(st=>{
      const k=stateKey(st);
      if(better(st,baseMap.get(k))) baseMap.set(k,st);
    });

    const states=[...(baseMap.size>6200 ? prune(baseMap,6200) : baseMap).values()];
    if(!states.length) continue;

    const groups=specialChoiceGroupsCached(hp);
    const groupCount=groups.filter(g=>g.opts.some(op=>!impossibleChoice(op,exp))).length || 1;

    total+=groupCount;
    tasks.push({hp,states,groupCount,groups});
  }

  if(!tasks.length){
    onProgress?.('計算中 100%');
    return fallback;
  }

  const progress={done:0,total:Math.max(1,total),start:Date.now(),debug:{candidate:0,accept:0,ubCut:0,dupCut:0,prune:0}};
  let best=null;

  for(const task of tasks){
    pStart("特殊能力探索");
    const cand=await optimizeSpecialsForLife(task.states,exp,task.hp,onProgress,progress,task.groups);
    pEnd("特殊能力探索");

    if(cand && better(cand,best)){
      best=cand;
    }

    await yieldToBrowser();
  }

  onProgress?.('計算中 100%');
  return best||fallback;
}
function resultTable(items,kind){
  let filtered=items.filter(x=>x.type===kind);
  if(kind==='special'){
    let chosenBits=EMPTY_BITS;
    filtered.forEach(x=>{ if(Number.isFinite(Number(x.idx))) chosenBits|=specialBit(Number(x.idx)); });
    filtered=filtered.filter(x=>{const ui=upperIndex(x.idx); return !(ui>=0 && (chosenBits & specialBit(ui))!==EMPTY_BITS);});
  }
  if(!filtered.length) return '<p>追加なし</p>';
  const sorted=filtered.sort((a,b)=>{
    if(kind==='basic') return (a.idx??0)-(b.idx??0);
    return (a.idx??0)-(b.idx??0);
  });
  const rows=sorted.map(c=>`<tr><td>${kind==='basic'?`${c.name} ${c.from}→${c.to}`:renderSkillName(c.name)}</td></tr>`).join('');
  return `<table class="result-table"><tbody>${rows}</tbody></table>`;
}
function validateInputs(){
  const errs=[];
  if(!academy.value){errs.push('アカデミー及びジョブを選択してください。'); return errs;}
  if(!job.value) errs.push('ジョブを選択してください。');
  expNames.forEach(n=>{
    const v=document.getElementById('exp_'+n)?.value;
    if(v==='' || v==null){errs.push(`${n}経験点を入力してください。`); return;}
    const num=Number(v);
    if(!Number.isFinite(num) || num<0) errs.push(`${n}経験点は0以上の値を入力してください。`);
    if(num>1000) errs.push(`${n}経験点は1000以下の値を入力してください。`);
  });
  const lim=limits();
  basicNames.forEach(n=>{
    const v=document.getElementById('basic_'+n)?.value;
    if(!basicOwned[n] && (v==='' || v==null)){errs.push(`${n}を入力してください。`); return;}
    if(v!=='' && v!=null){
      const num=Number(v);
      if(!Number.isFinite(num) || num<1) errs.push(`${n}は1以上の値を入力してください。`);
      if(lim[n]!=null && num>lim[n]) errs.push(`${n}は入力上限を超えています。`);
    }
  });
  return errs;
}
async function calc(){
  clearCalcCaches();
  pReset();
  validateAllInline();
  const result=document.getElementById('result');
  const errs=validateInputs();
  if(errs.length){result.innerHTML=`<div class="error-box">${errs.map(e=>`<p>⚠️ ${e}</p>`).join('')}</div>`; return;}
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const startTime=performance.now();
  const btn=document.getElementById('calcBtn');
  const cacheKey=calcCacheKey(exp);
  let lastProgressMessage='';
  let lastDetailedProgress='';
  isCalculating=true;
  document.body.classList.add('is-calculating');
  document.querySelectorAll('button,input,select').forEach(el=>{ if(el.id!=='calcBtn') el.disabled=true; });
  btn.disabled=true; btn.textContent='計算中';
  result.innerHTML='<p class="calculating">計算中</p>';
  try{
    let best=getCachedResult(cacheKey);
    if(best){
      btn.textContent='計算中 100%';
      lastProgressMessage='キャッシュ使用';
      lastDetailedProgress='キャッシュ使用';
    }else{
      best=await optimizeAsync(exp,(msg)=>{
        lastProgressMessage=msg;
        if(msg.includes('候補:') || msg.includes('UB:') || msg.includes('prune:')){
          lastDetailedProgress=msg;
        }
        btn.textContent=msg;
        result.innerHTML=`<p class="calculating">${msg}</p>`;
      });
    }
    pStart("結果復元");
    const bestItems=restoreItems(best);
    pEnd("結果復元");
    best.items=bestItems;
    setCachedResult(cacheKey,best);

    const elapsed=((performance.now()-startTime)/1000).toFixed(2);
    const remain=exp.map((v,i)=>v-(best.cost?.[i]||0));
    const remainHtml=`<div class="result-block"><h3>残経験点</h3><table class="result-table remain-table"><tbody>${expNames.map((n,i)=>`<tr><td>${n}</td><td>${remain[i]}</td></tr>`).join('')}</tbody></table></div>`;
    const debugHtml=`<div class="result-block"><h3>検証用ログ</h3><p>${lastDetailedProgress || lastProgressMessage || 'ログなし'}</p></div>`;
    const profileHtml=`<div class="result-block"><h3>プロファイル</h3><table class="result-table"><tbody>${pReport()}</tbody></table></div>`;
    const scoreText=Math.round(best.score||0).toLocaleString('ja-JP');
    result.innerHTML=`
<div class="result-block">
  <h3>基本能力</h3>
  ${resultTable(bestItems,'basic')}
</div>

<div class="result-block">
  <h3>特殊能力</h3>
  ${resultTable(bestItems,'special')}
</div>

<div class="result-block score-block">
  <h3>査定(参考値)</h3>
  <p class="score-value">${scoreText}</p>
</div>

${remainHtml}

${debugHtml}

${profileHtml}

<div class="result-block">
  <h3>計算時間</h3>
  <p>${elapsed} 秒</p>
</div>
`;
  }catch(err){
    const name=err?.name||'Error';
    const message=err?.message||'原因不明のエラーです';

    result.innerHTML=`<div class="error-box">
      <p>⚠️ 計算中にエラーが発生しました。</p>
      <p>${name}</p>
      <p>${message}</p>
    </div>`;

    console.error(err);
  }finally{
    isCalculating=false;
    document.body.classList.remove('is-calculating');
    document.querySelectorAll('button,input,select').forEach(el=>{ el.disabled=false; });
    job.disabled=!academy.value;
    basicNames.forEach(n=>applyBasicVisual(n));
    D.special.forEach((_,i)=>applySkillVisual(i));
    btn.disabled=false; btn.textContent='計算する';
  }
}
function resetAll(){
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value='';});

  academy.value='';
  updateJobs();

  Object.keys(basicOwned).forEach(k=>basicOwned[k]=false);
  Object.keys(basicHints).forEach(k=>basicHints[k]=0);

  specialState.clear();
  calcResultCache.clear();
  search.value='';

  renderBasic();
  renderSpecials();

  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}

document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
initAcademies(); renderExp(); renderBasic(); renderSpecials(); validateAllInline();
})();
