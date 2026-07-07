(function(){
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1]);});
const academy=document.getElementById('academy');
const job=document.getElementById('job');
const specialList=document.getElementById('specialList');
const search=document.getElementById('skillSearch');
const basicOwned={}; basicNames.forEach(n=>basicOwned[n]=false);
const basicHints={}; basicNames.forEach(n=>basicHints[n]=0);
const specialState=new Map();

function opt(label,value){return new Option(label,value??label)}
function academyRows(){return D.academies.filter(r=>r[0]===academy.value && r[1]===job.value)}
function limits(){const r=academyRows()[0]; const m={}; basicNames.forEach((n,i)=>m[n]=r?Number(r[i+2]):999); return m;}
function initAcademies(){academy.innerHTML='';academy.add(opt('アカデミーを選択',''));Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));updateJobs();}
function updateJobs(){const jobs=jobsByAcademy[academy.value]||[];job.innerHTML='';job.add(opt('ジョブを選択',''));jobs.forEach(j=>job.add(opt(j)));renderBasic();renderSpecials();}
academy.addEventListener('change',updateJobs); job.addEventListener('change',()=>{renderBasic();renderSpecials();});

function renderExp(){document.getElementById('expInputs').innerHTML=expNames.map(n=>`<div class="exp-row"><label>${n}</label><input type="number" min="0" id="exp_${n}" inputmode="numeric" autocomplete="off"></div>`).join('');}
function renderBasic(){
  const lim=limits();
  document.getElementById('basicInputs').innerHTML=basicNames.map(n=>`
    <div class="ability-row ${basicOwned[n]?'owned':''}" data-basic="${n}">
      <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}">＋</button>
      <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}">${n}</button>
      <input class="ability-value" type="number" min="1" max="${lim[n]}" id="basic_${n}" inputmode="numeric" autocomplete="off">
    </div>`).join('');
  basicNames.forEach(n=>{const inp=document.getElementById('basic_'+n); if(inp && basicOwned[n]) inp.value=lim[n]; applyBasicVisual(n);});
}
function renderSkillName(name){return String(name).replace(/○/g,'<span class="mark mark-circle">○</span>').replace(/◎/g,'<span class="mark mark-double">◎</span>');}
function isUpperSpecial(i){return String(D.special[i][1]).includes('◎');}
function shouldShowSpecial(i){
  const name=String(D.special[i][1]);
  const q=(search.value||'').trim().toLowerCase();
  if(q) return name.toLowerCase().includes(q);
  if(!isUpperSpecial(i)) return true;
  const li=lowerIndex(i);
  return (li>=0 && specialOwned(li)) || specialOwned(i);
}
function visibleSpecial(s,i){return shouldShowSpecial(i);}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!visibleSpecial(s,i)) return '';
    const st=specialState.get(String(i))||{hint:0,own:0};
    return `<div class="skill-row ${Number(st.own)?'owned':''}" data-index="${i}">
      <button type="button" class="hint-btn" data-kind="special-hint" data-index="${i}">＋</button>
      <button type="button" class="name-btn skill-name" data-kind="special-name" data-index="${i}">${renderSkillName(s[1])}</button>
    </div>`;
  }).join('');
  specialList.innerHTML=html || '<p>該当する特殊能力がありません。</p>';
  document.querySelectorAll('.skill-row').forEach(row=>applySkillVisual(Number(row.dataset.index)));
}
search.addEventListener('input',renderSpecials);

function getSpecialState(i){const k=String(i); if(!specialState.has(k)) specialState.set(k,{hint:0,own:0}); return specialState.get(k);}
function pairIndex(i){
  const name=String(D.special[i][1]);
  if(name.includes('◎')) return D.special.findIndex(s=>s[1]===name.replace(/◎/g,'○'));
  if(name.includes('○')) return D.special.findIndex(s=>s[1]===name.replace(/○/g,'◎'));
  return -1;
}
function lowerIndex(i){const name=String(D.special[i][1]); return name.includes('◎') ? D.special.findIndex(s=>s[1]===name.replace(/◎/g,'○')) : -1;}
function upperIndex(i){const name=String(D.special[i][1]); return name.includes('○') ? D.special.findIndex(s=>s[1]===name.replace(/○/g,'◎')) : -1;}
function setHintBtn(btn,level){if(!btn)return; btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function cycleHint(v){return (Number(v)||0)>=5 ? 0 : (Number(v)||0)+1;}
function ownedLabel(on){return on ? '<span class="owned-label">✓取得済</span>' : '';}
function setHintBtn(btn,level){if(!btn)return; btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function cycleHint(v){return (Number(v)||0)>=5 ? 0 : (Number(v)||0)+1;}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  const lim=limits();
  setHintBtn(row.querySelector('.hint-btn'),basicHints[name]||0);
  row.classList.toggle('owned',!!basicOwned[name]);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span>${name}</span>${ownedLabel(!!basicOwned[name])}`;
  const inp=document.getElementById('basic_'+name);
  if(inp){
    inp.disabled=!!basicOwned[name];
    inp.classList.toggle('locked',!!basicOwned[name]);
    if(basicOwned[name] && lim[name]!==999) inp.value=lim[name];
  }
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`); if(!row)return;
  const st=getSpecialState(i); setHintBtn(row.querySelector('.hint-btn'),st.hint); row.classList.toggle('owned',Number(st.own)===1);
  const btn=row.querySelector('.name-btn');
  btn.innerHTML=`<span>${renderSkillName(D.special[i][1])}</span>${ownedLabel(Number(st.own)===1)}`;
}
function setSpecialOwned(i,on,chain=true){
  const st=getSpecialState(i); st.own=on?1:0; applySkillVisual(i);
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

document.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t)return;
  const kind=t.dataset.kind;
  if(kind==='basic-hint'){const name=t.dataset.name; basicHints[name]=cycleHint(basicHints[name]); applyBasicVisual(name); return;}
  if(kind==='basic-name'){
    const name=t.dataset.name; basicOwned[name]=!basicOwned[name];
    applyBasicVisual(name); return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});

document.addEventListener('input',e=>{
  const inp=e.target;
  if(!inp || !inp.id || !inp.id.startsWith('basic_')) return;
  const name=inp.id.replace('basic_','');
  const lim=limits()[name];
  if(lim!==999 && inp.value!=='' && Number(inp.value)>=lim){
    basicOwned[name]=true;
    applyBasicVisual(name);
  }else{
    basicOwned[name]=false;
    applyBasicVisual(name);
  }
});

function jobScoreIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function specialOwned(i){return getSpecialState(i).own===1;}
function specialHint(i){return Number(getSpecialState(i).hint||0);}
function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}
function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:({0:0,1:.5,2:.6,3:.7,4:.8,5:.9}[hint]||0); return Math.floor(cost*(1-disc));}
function currentHpForLife(life){let hp=50; for(const r of D.hp){if(life>=Number(r[0])) hp=Number(r[1]);} return hp;}
function currentHp(){const life=Number(document.getElementById('basic_生命力').value||1); return currentHpForLife(life);}
function parseRange(r){const m=String(r).match(/(\d+)→(\d+)/); return m?{a:Number(m[1]),b:Number(m[2])}:null;}
function tableFor(name){
  if(name==='生命力') return {cost:D.life,score:D.life};
  if(name==='パワー') return {cost:D.powerCost,score:['剣士','弓使い','重戦士'].includes(job.value)?D.powerPhysicalScore:D.powerMagicScore};
  if(name==='魔力') return {cost:D.magicCost,score:['魔闘士','魔法使い','僧侶'].includes(job.value)?D.magicMagicScore:D.magicPhysicalScore};
  if(name==='器用さ') return {cost:D.dexCost,score:D.dexScore};
  if(name==='耐久力') return {cost:D.staminaCost,score:D.staminaScore};
  if(name==='精神力') return {cost:D.mentalCost,score:D.mentalScore};
}
function scoreForRange(scoreTable,range){const r=scoreTable.find(x=>x[0]===range); return r?Number(r[1]||0):0;}
function addCost(a,b){return a.map((v,i)=>v+b[i]);}
function leq(a,b){return a.every((v,i)=>v<=b[i]);}
function key(c){return c.join(',');}
function better(a,b){return !b || a.score>b.score || (a.score===b.score && a.items.length<b.items.length);}
function prune(states){
  const arr=[...states.values()].sort((a,b)=>a.cost.reduce((s,x)=>s+x,0)-b.cost.reduce((s,x)=>s+x,0));
  const keep=[];
  outer: for(const st of arr){
    for(const k of keep){ if(leq(k.cost,st.cost) && k.score>=st.score) continue outer; }
    keep.push(st);
  }
  const m=new Map(); keep.forEach(st=>m.set(key(st.cost),st)); return m;
}
function basicOptions(name,exp){
  const lim=limits(); const cur=Number(document.getElementById('basic_'+name).value||1); const hint=Number(basicHints[name]||0);
  if(basicOwned[name]) return [{cost:[0,0,0,0,0],score:0,items:[],life: name==='生命力'?lim[name]:null}];
  const t=tableFor(name); const opts=[{cost:[0,0,0,0,0],score:0,items:[],life:name==='生命力'?cur:null}];
  let c=[0,0,0,0,0], sc=0, last=cur;
  for(const r of t.cost){
    const rg=parseRange(r[0]); if(!rg) continue;
    if(rg.a < cur) continue;
    if(rg.a > last && last!==cur) break;
    if(rg.b>lim[name]) continue;
    const step=[r[1],r[2],r[3],r[4],r[5]].map(x=>costAfter(Number(x||0),hint,true));
    c=addCost(c,step); sc += scoreForRange(t.score,r[0]); last=rg.b;
    if(leq(c,exp)) opts.push({cost:c.slice(),score:sc,items:[{type:'basic',name,from:cur,to:rg.b,idx:basicNames.indexOf(name)}],life:name==='生命力'?rg.b:null});
  }
  return opts;
}
function buildBasicStates(exp){
  let states=new Map([[key([0,0,0,0,0]),{cost:[0,0,0,0,0],score:0,items:[],life:Number(document.getElementById('basic_生命力').value||1)}]]);
  basicNames.forEach(name=>{
    const opts=basicOptions(name,exp); const next=new Map();
    for(const st of states.values()){
      for(const op of opts){
        const nc=addCost(st.cost,op.cost); if(!leq(nc,exp)) continue;
        const ns={cost:nc,score:st.score+op.score,items:st.items.concat(op.items),life: op.life!==null?op.life:st.life};
        const k=key(nc); if(better(ns,next.get(k))) next.set(k,ns);
      }
    }
    states=prune(next);
  });
  return states;
}
function availableSpecialItems(hp){
  const items=[];
  D.special.forEach((s,i)=>{
    if(specialOwned(i)) return;
    const score=skillScore(s,hp); if(score<=0) return;
    const hint=specialHint(i); const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
    items.push({type:'special',idx:i,name:s[1],req:s[2],cost:costs,score});
  });
  return items;
}
function addSpecialsForState(base,exp){
  const hp=currentHpForLife(base.life||Number(document.getElementById('basic_生命力').value||1));
  const all=availableSpecialItems(hp);
  // ○/◎の前提を守るため、ゲーム表示順に処理。◎は○が既取得または同じ計算内で選ばれた場合だけ候補に入る。
  let states=new Map([[key(base.cost),{...base,chosen:new Set(),items:base.items.slice()}]]);
  all.forEach(item=>{
    const next=new Map(states);
    for(const st of states.values()){
      if(item.req){
        const reqIdx=D.special.findIndex(x=>x[1]===item.req);
        if(reqIdx>=0 && !specialOwned(reqIdx) && !st.chosen.has(reqIdx)) continue;
      }
      const nc=addCost(st.cost,item.cost); if(!leq(nc,exp)) continue;
      const chosen=new Set(st.chosen); chosen.add(item.idx);
      const ns={cost:nc,score:st.score+item.score,items:st.items.concat([{type:'special',idx:item.idx,name:item.name}]),life:st.life,chosen};
      const k=key(nc); if(better(ns,next.get(k))) next.set(k,ns);
    }
    states=prune(next);
  });
  let best=null; for(const st of states.values()) if(better(st,best)) best=st; return best||base;
}
function optimize(exp){
  let best=null;
  const basicStates=buildBasicStates(exp);
  for(const st of basicStates.values()){
    const candidate=addSpecialsForState(st,exp);
    if(better(candidate,best)) best=candidate;
  }
  return best||{items:[],score:0,cost:[0,0,0,0,0]};
}
function resultTable(items,kind){
  let filtered=items.filter(x=>x.type===kind);
  if(kind==='special'){
    const chosenIdx=new Set(filtered.map(x=>x.idx));
    filtered=filtered.filter(x=>{
      const ui=upperIndex(x.idx);
      return !(ui>=0 && chosenIdx.has(ui));
    });
  }
  if(!filtered.length) return '<p>追加なし</p>';
  const sorted=kind==='basic'?filtered.sort((a,b)=>a.idx-b.idx):filtered.sort((a,b)=>a.idx-b.idx);
  const rows=sorted.map(c=>`<tr><td>${kind==='basic'?`${c.name} ${c.from}→${c.to}`:renderSkillName(c.name)}</td></tr>`).join('');
  return `<table class="result-table"><tbody>${rows}</tbody></table>`;
}
function validateInputs(){
  const errs=[];
  if(!academy.value){errs.push('アカデミー及びジョブを選択してください。'); return errs;}
  if(!job.value) errs.push('ジョブを選択してください。');
  expNames.forEach(n=>{const v=document.getElementById('exp_'+n)?.value; if(v==='' || v==null) errs.push(`${n}経験点を入力してください。`);});
  basicNames.forEach(n=>{const v=document.getElementById('basic_'+n)?.value; if(!basicOwned[n] && (v==='' || v==null)) errs.push(`${n}を入力してください。`);});
  return errs;
}
function calc(){
  const result=document.getElementById('result');
  const errs=validateInputs();
  if(errs.length){result.innerHTML=`<div class="error-box">${errs.map(e=>`<p>⚠️ ${e}</p>`).join('')}</div>`; return;}
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const btn=document.getElementById('calcBtn');
  btn.disabled=true; btn.textContent='計算中…';
  result.innerHTML='<p class="calculating">計算中…少し待ってな。</p>';
  setTimeout(()=>{
    try{
      const best=optimize(exp);
      result.innerHTML=`<div class="result-block"><h3>基本能力</h3>${resultTable(best.items,'basic')}</div><div class="result-block"><h3>特殊能力</h3>${resultTable(best.items,'special')}</div>`;
    }catch(err){
      result.innerHTML='<div class="error-box"><p>⚠️ 計算中にエラーが発生しました。</p></div>';
      console.error(err);
    }finally{
      btn.disabled=false; btn.textContent='計算する';
    }
  },30);
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
initAcademies(); renderExp(); renderBasic(); renderSpecials();
})();
