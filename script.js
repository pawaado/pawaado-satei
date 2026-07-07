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
function initAcademies(){academy.innerHTML='';Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));if(!academy.value&&academy.options.length) academy.selectedIndex=0;updateJobs();}
function updateJobs(){const jobs=jobsByAcademy[academy.value]||[];job.innerHTML='';jobs.forEach(j=>job.add(opt(j)));if(!job.value&&job.options.length) job.selectedIndex=0;renderBasic();renderSpecials();}
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
function renderSkillName(name){return String(name).replace(/○/g,'<span class="mark">○</span>').replace(/◎/g,'<span class="mark">◎</span>');}
function visibleSpecial(s){const q=(search.value||'').trim().toLowerCase(); return !q || String(s[1]).toLowerCase().includes(q);}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!visibleSpecial(s)) return '';
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
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  setHintBtn(row.querySelector('.hint-btn'),basicHints[name]||0);
  row.classList.toggle('owned',!!basicOwned[name]);
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`); if(!row)return;
  const st=getSpecialState(i); setHintBtn(row.querySelector('.hint-btn'),st.hint); row.classList.toggle('owned',Number(st.own)===1);
}
function setSpecialOwned(i,on,chain=true){
  const st=getSpecialState(i); st.own=on?1:0; applySkillVisual(i);
  if(!chain) return;
  if(on){const li=lowerIndex(i); if(li>=0) setSpecialOwned(li,true,false);}
  else{const ui=upperIndex(i); if(ui>=0) setSpecialOwned(ui,false,false);}
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
    const inp=document.getElementById('basic_'+name); if(inp) inp.value=basicOwned[name]?limits()[name]:'';
    applyBasicVisual(name); return;
  }
  if(kind==='special-hint'){const i=Number(t.dataset.index); setSpecialHint(i,cycleHint(getSpecialState(i).hint)); return;}
  if(kind==='special-name'){toggleSpecial(Number(t.dataset.index)); return;}
});

function jobScoreIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function specialOwned(i){return getSpecialState(i).own===1;}
function specialHint(i){return Number(getSpecialState(i).hint||0);}
function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}
function costAfter(cost,hint,basic=false){const disc=basic?hint*0.02:({0:0,1:.5,2:.6,3:.7,4:.8,5:.9}[hint]||0); return Math.floor(cost*(1-disc));}
function currentHp(){let hp=50; const life=Number(document.getElementById('basic_生命力').value||1); for(const r of D.hp){if(life>=Number(r[0])) hp=Number(r[1]);} return hp;}
function parseRange(r){const m=String(r).match(/(\d+)→(\d+)/); return m?{a:Number(m[1]),b:Number(m[2])}:null;}
function tableFor(name){
  if(name==='生命力') return {cost:D.life,score:D.life};
  if(name==='パワー') return {cost:D.powerCost,score:['剣士','弓使い','重戦士'].includes(job.value)?D.powerPhysicalScore:D.powerMagicScore};
  if(name==='魔力') return {cost:D.magicCost,score:['魔闘士','魔法使い','僧侶'].includes(job.value)?D.magicMagicScore:D.magicPhysicalScore};
  if(name==='器用さ') return {cost:D.dexCost,score:D.dexScore};
  if(name==='耐久力') return {cost:D.staminaCost,score:D.staminaScore};
  if(name==='精神力') return {cost:D.mentalCost,score:D.mentalScore};
}
function basicCandidates(exp){
  const out=[]; const lim=limits();
  basicNames.forEach(name=>{
    if(basicOwned[name]) return;
    const cur=Number(document.getElementById('basic_'+name).value||1);
    const hint=Number(basicHints[name]||0);
    const t=tableFor(name); if(!t) return;
    for(const r of t.cost){
      const rg=parseRange(r[0]); if(!rg || rg.a<cur || rg.b>lim[name]) continue;
      const costs=[r[1],r[2],r[3],r[4],r[5]].map(c=>costAfter(Number(c||0),hint,true));
      if(costs.every((c,i)=>c<=exp[i])){out.push({name,range:r[0],idx:basicNames.indexOf(name),order:rg.a}); break;}
    }
  });
  return out.sort((a,b)=>a.idx-b.idx || a.order-b.order);
}
function specialCandidates(exp){
  const hp=currentHp(), out=[];
  D.special.forEach((s,i)=>{
    if(specialOwned(i)) return;
    const req=s[2]; if(req){const reqIndex=D.special.findIndex(x=>x[1]===req); if(reqIndex>=0 && !specialOwned(reqIndex)) return;}
    const hint=specialHint(i); const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
    if(costs.every((c,ix)=>c<=exp[ix]) && skillScore(s,hp)!==0) out.push({name:s[1],idx:i});
  });
  return out.sort((a,b)=>a.idx-b.idx);
}
function resultTable(items,kind){
  if(!items.length) return '<p>候補なし</p>';
  const rows=items.map(c=>`<tr><td>${kind==='basic'?`${c.name} ${c.range}`:renderSkillName(c.name)}</td></tr>`).join('');
  return `<table class="result-table"><tbody>${rows}</tbody></table>`;
}
function calc(){
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const basics=basicCandidates(exp); const specials=specialCandidates(exp);
  document.getElementById('result').innerHTML=`<div class="result-block"><h3>基本能力</h3>${resultTable(basics,'basic')}</div><div class="result-block"><h3>特殊能力</h3>${resultTable(specials,'special')}</div>`;
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
