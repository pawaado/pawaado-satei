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
let isCalculating=false;

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
function lowerIndex(i){const req=D.special[i]?.[2]; if(!req)return -1; return D.special.findIndex(x=>x[1]===req);}
function upperIndex(i){const name=D.special[i]?.[1]; return D.special.findIndex(x=>x[2]===name);}
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
    if(group){group.forEach(n=>{const j=D.special.findIndex(x=>x[1]===n); if(j>=0 && j!==i){getSpecialState(j).own=0; applySkillVisual(j);}});}
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
function addCost(a,b){return a.map((v,i)=>v+b[i]);}
function leq(a,b){return a.every((v,i)=>v<=b[i]);}
function key(c){return c.join(',');}
function stateKey(st){return key(st.cost)+'|'+(st.life==null?'':st.life);}
function better(a,b){return !b || a.score>b.score || (a.score===b.score && a.items.length<b.items.length);}
function yieldToBrowser(){return new Promise(r=>setTimeout(r,0));}
function prune(states,limit=12000){
  // Phase9: 速度と精度のバランス。生命力/HP差を潰さないキーで状態を保持する。
  const arr=[...states.values()]

  .map(st=>({

    ...st,

    totalCost:st.cost.reduce((x,y)=>x+y,0)

  }))

  .sort((a,b)=>{

    if(b.score!==a.score) return b.score-a.score;

    return a.totalCost-b.totalCost;
  });
  const preLimit = Math.min(arr.length, Math.max(limit*2, limit+800));
  const src = arr.slice(0, preLimit);
  const keep=[];
  outer: for(const st of src){
    // 支配判定対象も上位に絞ることで、スマホでの長時間停止を防ぐ。
    const checkMax = Math.min(keep.length, 500);
    for(let i=0;i<checkMax;i++){
      const k=keep[i];
      if(leq(k.cost,st.cost) && k.score>=st.score) continue outer;
    }
    keep.push(st);
    if(keep.length>=limit) break;
  }
  const m=new Map(); keep.forEach(st=>m.set(stateKey(st),st)); return m;
}
function rowForValue(table,value){
  for(const r of table){
    const rg=parseRange(r[0]);
    if(rg && value>=rg.a && value<rg.b) return r;
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
  if(basicOwned[name]) return [{cost:[0,0,0,0,0],score:0,items:[],life: name==='生命力'?max:null}];
  const t=tableFor(name);
  const opts=[{cost:[0,0,0,0,0],score:0,items:[],life:name==='生命力'?cur:null}];
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
    if(leq(c,exp)) opts.push({
      cost:c.slice(),
      score:sc,
      items:[{type:'basic',name,from:cur,to:v,idx:basicNames.indexOf(name)}],
      life:name==='生命力'?v:null
    });
  }
  return opts;
}

function buildBasicStates(exp){
  const initialLife=Number(document.getElementById('basic_生命力')?.value||1);

  let states=new Map([[key([0,0,0,0,0])+'|'+initialLife,{cost:[0,0,0,0,0],score:0,items:[],life:initialLife}]]);

  basicNames.forEach(name=>{

    const opts=basicOptions(name,exp);

    const next=new Map();

    for(const st of states.values()){

      for(const op of opts){

        const nc=addCost(st.cost,op.cost);

        if(!leq(nc,exp)) continue;

        const ns={

          cost:nc,

          score:st.score+op.score,

          items:st.items.concat(op.items),

          life:op.life!==null?op.life:st.life

        };

        const k=stateKey(ns);

        if(better(ns,next.get(k))) next.set(k,ns);

      }

    }

    if(!next.size) return;

    states=prune(next,3600);

  });

  return states;
}
function itemForSpecialIndex(i,hp,includeLower=false){
  const s=D.special[i]; if(!s) return null;
  const score=skillScore(s,hp); if(score<=0) return null;
  const hint=specialHint(i); const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
  let totalCost=costs.slice(); let totalScore=score; let items=[{type:'special',idx:i,name:s[1]}];
  if(includeLower){
    const li=lowerIndex(i);
    if(li>=0 && !specialOwned(li)){
      const lower=itemForSpecialIndex(li,hp,false);
      if(lower){totalCost=addCost(totalCost,lower.cost); totalScore+=lower.score; items=lower.items.concat(items);}
    }
  }
  return {type:'choice',cost:totalCost,score:totalScore,items,idx:i,name:s[1]};
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
    const already=g.some(n=>{const i=D.special.findIndex(x=>x[1]===n); return i>=0 && specialOwned(i);});
    if(!already){
      g.forEach(n=>{const i=D.special.findIndex(x=>x[1]===n); if(i>=0 && !used.has(i) && !specialOwned(i)){const it=itemForSpecialIndex(i,hp,false); if(it) opts.push(it); used.add(i);}});
    }else{
      g.forEach(n=>{const i=D.special.findIndex(x=>x[1]===n); if(i>=0) used.add(i);});
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
function impossibleChoice(op,exp){return !leq(op.cost,exp);}

function progressMessage(progress){

  if(!progress) return '計算中';

  const pct=Math.min(99,Math.floor(progress.done/progress.total*100));

  return `計算中 ${pct}%`;
}
function groupEfficiency(g){

  return g.opts.reduce((m,o)=>{

    const costSum=o.cost.reduce((a,b)=>a+b,0);

    return Math.max(m,o.score/(1+costSum));

  },0);
}
async function optimizeSpecialsForLife(baseStates, exp, hp, onProgress, progress, preGroups=null){

  let groups=(preGroups||specialChoiceGroups(hp))

    .map(g=>({

      ...g,

      opts:g.opts

        .filter(op=>!impossibleChoice(op,exp))

        .sort((a,b)=>{

          const ea=a.score/(1+a.cost.reduce((x,y)=>x+y,0));

          const eb=b.score/(1+b.cost.reduce((x,y)=>x+y,0));

          return eb-ea;

        })

    }))

    .filter(g=>g.opts.length>0)

    .sort((a,b)=>groupEfficiency(b)-groupEfficiency(a));

  const totalExp=exp.reduce((a,b)=>a+b,0);

  const STATE_LIMIT=Math.max(1000,Math.min(3000,900+Math.floor(totalExp*0.65)));

  const HARD_LIMIT=Math.floor(STATE_LIMIT*1.35);

  let states=new Map();

  for(const base of baseStates){

    if(!base) continue;

    const st={...base,items:(base.items||[]).slice()};

    const k=stateKey(st);

    if(better(st,states.get(k))) states.set(k,st);

  }

  if(!states.size){

    return {items:[],score:0,cost:[0,0,0,0,0],life:null};

  }

  states=prune(states,STATE_LIMIT);

  for(const group of groups){

    const snapshot=[...states.values()].sort((a,b)=>b.score-a.score);

    const next=new Map(states);

    let iter=0;

    for(const st of snapshot){

      for(const op of group.opts){

        const nc=addCost(st.cost,op.cost);

        if(!leq(nc,exp)) continue;

        const ns={

          cost:nc,

          score:st.score+op.score,

          items:st.items.concat(op.items),

          life:st.life

        };

        const k=stateKey(ns);

        if(better(ns,next.get(k))) next.set(k,ns);

      }

      if(next.size>HARD_LIMIT){

        const pruned=prune(next,STATE_LIMIT);

        next.clear();

        pruned.forEach((v,k)=>next.set(k,v));

      }

      iter++;

      if(iter%500===0) await yieldToBrowser();

    }

    states=prune(next,STATE_LIMIT);

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

  return best||{items:[],score:0,cost:[0,0,0,0,0],life:null};

}

async function optimizeAsync(exp,onProgress){

  await yieldToBrowser();

  onProgress?.('計算中 0%');

  const fallback={items:[],score:0,cost:[0,0,0,0,0],life:Number(document.getElementById('basic_生命力')?.value||1)};

  const basicMap=buildBasicStates(exp);

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

    const states=[...prune(baseMap,3200).values()];

    if(!states.length) continue;

    const groups=specialChoiceGroups(hp);

    const groupCount=groups.filter(g=>g.opts.some(op=>!impossibleChoice(op,exp))).length || 1;

    total+=groupCount;

    tasks.push({hp,states,groupCount,groups});

  }

  if(!tasks.length){

    onProgress?.('計算中 100%');

    return fallback;

  }

  const progress={done:0,total:Math.max(1,total),start:Date.now()};

  let best=null;

  for(const task of tasks){

    const cand=await optimizeSpecialsForLife(task.states,exp,task.hp,onProgress,progress,task.groups);

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
    const chosenIdx=new Set(filtered.map(x=>x.idx));
    filtered=filtered.filter(x=>{const ui=upperIndex(x.idx); return !(ui>=0 && chosenIdx.has(ui));});
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
  validateAllInline();
  const result=document.getElementById('result');
  const errs=validateInputs();
  if(errs.length){result.innerHTML=`<div class="error-box">${errs.map(e=>`<p>⚠️ ${e}</p>`).join('')}</div>`; return;}
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const btn=document.getElementById('calcBtn');
  isCalculating=true;
  document.body.classList.add('is-calculating');
  document.querySelectorAll('button,input,select').forEach(el=>{ if(el.id!=='calcBtn') el.disabled=true; });
  btn.disabled=true; btn.textContent='計算中';
  result.innerHTML='<p class="calculating">計算中</p>';
  try{
    const best=await optimizeAsync(exp,(msg)=>{btn.textContent=msg; result.innerHTML=`<p class="calculating">${msg}</p>`;});
    const remain=exp.map((v,i)=>v-(best.cost?.[i]||0));
    const remainHtml=`<div class="result-block"><h3>残経験点</h3><table class="result-table remain-table"><tbody>${expNames.map((n,i)=>`<tr><td>${n}</td><td>${remain[i]}</td></tr>`).join('')}</tbody></table></div>`;
    const scoreText=(Math.round((best.score||0)*10)/10).toLocaleString('ja-JP');
    result.innerHTML=`<div class="result-block score-block"><h3>参考査定</h3><p class="score-value">${scoreText}</p></div><div class="result-block"><h3>基本能力</h3>${resultTable(best.items,'basic')}</div><div class="result-block"><h3>特殊能力</h3>${resultTable(best.items,'special')}</div>${remainHtml}`;
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
    // 計算後も入力値・取得済状態は保持する。再描画で入力欄を空にしない。
    basicNames.forEach(n=>applyBasicVisual(n));
    D.special.forEach((_,i)=>applySkillVisual(i));
    btn.disabled=false; btn.textContent='計算する';
  }
}
function resetAll(){
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value='';});
  Object.keys(basicOwned).forEach(k=>basicOwned[k]=false);
  Object.keys(basicHints).forEach(k=>basicHints[k]=0);
  specialState.clear(); search.value=''; renderBasic(); renderSpecials();
  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}
document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
initAcademies(); renderExp(); renderBasic(); renderSpecials(); validateAllInline();
})();
