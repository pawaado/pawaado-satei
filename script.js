(function(){
const D=window.PAWAADO_DATA;
const expNames=['筋力','敏捷','技術','知力','精神'];
const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
const hintLevels=[0,1,2,3,4,5];
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1]);});
const academy=document.getElementById('academy');
const job=document.getElementById('job');
const specialList=document.getElementById('specialList');
const search=document.getElementById('skillSearch');
const basicOwned={}; basicNames.forEach(n=>basicOwned[n]=false);

function opt(label,value){return new Option(label,value??label)}
function academyRows(){return D.academies.filter(r=>r[0]===academy.value && r[1]===job.value)}
function limits(){const r=academyRows()[0]; const m={}; basicNames.forEach((n,i)=>m[n]=r?Number(r[i+2]):999); return m;}
function initAcademies(){
  academy.innerHTML='';
  Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));
  if(!academy.value && academy.options.length) academy.selectedIndex=0;
  updateJobs();
}
function updateJobs(){
  const jobs=jobsByAcademy[academy.value]||[];
  job.innerHTML=''; jobs.forEach(j=>job.add(opt(j)));
  if(!job.value && job.options.length) job.selectedIndex=0;
  renderBasic(); renderSpecials();
}
academy.addEventListener('change',updateJobs);
job.addEventListener('change',()=>{renderBasic();renderSpecials();});

function renderExp(){
  document.getElementById('expInputs').innerHTML=expNames.map(n=>`<div class="exp-row"><label>${n}</label><input type="number" min="0" id="exp_${n}" inputmode="numeric"></div>`).join('');
}
function renderBasic(){
  const lim=limits();
  document.getElementById('basicInputs').innerHTML=basicNames.map(n=>`
    <div class="ability-row ${basicOwned[n]?'owned':''}" data-basic="${n}">
      <button type="button" class="owned-btn" data-kind="basic-owned" data-name="${n}">${basicOwned[n]?'済':'未'}</button>
      <button type="button" class="hint-btn" data-kind="basic-hint" data-name="${n}">＋</button>
      <button type="button" class="name-btn" data-kind="basic-name" data-name="${n}">${n}</button>
      <input class="ability-value" type="number" min="1" max="${lim[n]}" id="basic_${n}" inputmode="numeric">
      <input type="hidden" id="bhint_${n}" value="0">
    </div>`).join('');
  basicNames.forEach(n=>{const inp=document.getElementById('basic_'+n); if(inp) inp.value=basicOwned[n]?lim[n]:''; applyBasicVisual(n);});
}
function renderSkillName(name){
  return String(name).replace(/○/g,'<span class="mark">○</span>').replace(/◎/g,'<span class="mark">◎</span>');
}
function visibleSpecial(s){
  const q=(search.value||'').trim().toLowerCase();
  return !q || String(s[1]).toLowerCase().includes(q);
}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!visibleSpecial(s)) return '';
    return `<div class="skill-row" data-index="${i}">
      <button type="button" class="owned-btn" data-kind="special-owned" data-index="${i}">未</button>
      <button type="button" class="hint-btn" data-kind="special-hint" data-index="${i}">＋</button>
      <button type="button" class="name-btn skill-name" data-kind="special-name" data-index="${i}">${renderSkillName(s[1])}</button>
      <input type="hidden" id="hint_${i}" value="0"><input type="hidden" id="own_${i}" value="0">
    </div>`;
  }).join('');
  specialList.innerHTML=html || '<p>該当する特殊能力がありません。</p>';
  restoreSpecialState();
}
const specialState=new Map();
function saveSpecialState(){
  document.querySelectorAll('.skill-row').forEach(row=>{
    const i=row.dataset.index, h=document.getElementById('hint_'+i), o=document.getElementById('own_'+i);
    if(h&&o) specialState.set(i,{hint:h.value,own:o.value});
  });
}
function restoreSpecialState(){
  document.querySelectorAll('.skill-row').forEach(row=>{
    const i=row.dataset.index, st=specialState.get(String(i));
    if(st){document.getElementById('hint_'+i).value=st.hint; document.getElementById('own_'+i).value=st.own;}
    applySkillVisual(i);
  });
}
search.addEventListener('input',()=>{saveSpecialState();renderSpecials();});
function openHintPicker(anchor,current,callback){
  document.querySelectorAll('.hint-select').forEach(e=>e.remove());
  const sel=document.createElement('select'); sel.className='hint-select';
  hintLevels.forEach(l=>sel.add(opt(`コツLv${l}`,String(l)))); sel.value=String(current||0);
  document.body.appendChild(sel);
  const r=anchor.getBoundingClientRect();
  sel.style.left=Math.max(8,Math.min(window.innerWidth-128,r.left+window.scrollX))+'px';
  sel.style.top=(r.bottom+window.scrollY+4)+'px'; sel.focus();
  sel.addEventListener('change',()=>{callback(Number(sel.value));sel.remove();});
  sel.addEventListener('blur',()=>setTimeout(()=>sel.remove(),150));
}
function setHintBtn(btn,level){btn.textContent=Number(level)>0?`Lv${level}`:'＋'; btn.classList.toggle('has-hint',Number(level)>0);}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`); if(!row)return;
  const h=document.getElementById('bhint_'+name)?.value||0; setHintBtn(row.querySelector('.hint-btn'),h);
  row.classList.toggle('owned',!!basicOwned[name]); row.querySelector('.owned-btn').textContent=basicOwned[name]?'済':'未';
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`); if(!row)return;
  const h=document.getElementById('hint_'+i)?.value||0, o=document.getElementById('own_'+i)?.value||0;
  setHintBtn(row.querySelector('.hint-btn'),h); row.classList.toggle('owned',String(o)==='1'); row.querySelector('.owned-btn').textContent=String(o)==='1'?'済':'未';
}
function setSpecialOwned(i,on){
  const hidden=document.getElementById('own_'+i); if(hidden) hidden.value=on?'1':'0';
  const st=specialState.get(String(i))||{hint:'0',own:'0'}; st.own=on?'1':'0'; specialState.set(String(i),st); applySkillVisual(i);
  if(on){
    const name=String(D.special[i][1]);
    if(name.includes('◎')){
      const lower=name.replace(/◎/g,'○');
      const j=D.special.findIndex(s=>s[1]===lower);
      if(j>=0) setSpecialOwned(j,true);
    }
  }
}
function toggleSpecial(i){const now=specialOwned(i); setSpecialOwned(i,!now);}

document.addEventListener('click',e=>{
  const t=e.target.closest('button'); if(!t)return;
  const kind=t.dataset.kind;
  if(kind==='basic-hint'){
    const name=t.dataset.name, h=document.getElementById('bhint_'+name);
    openHintPicker(t,h.value,lv=>{h.value=lv;applyBasicVisual(name);}); return;
  }
  if(kind==='basic-owned'||kind==='basic-name'){
    const name=t.dataset.name; basicOwned[name]=!basicOwned[name];
    const lim=limits(); const inp=document.getElementById('basic_'+name);
    if(basicOwned[name] && inp) inp.value=lim[name];
    applyBasicVisual(name); return;
  }
  if(kind==='special-hint'){
    const i=t.dataset.index, h=document.getElementById('hint_'+i);
    openHintPicker(t,h.value,lv=>{h.value=lv;specialState.set(String(i),{hint:h.value,own:document.getElementById('own_'+i).value});applySkillVisual(i);}); return;
  }
  if(kind==='special-owned'||kind==='special-name') toggleSpecial(Number(t.dataset.index));
});

function jobScoreIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 8; if(['魔闘士','魔法使い'].includes(job.value)) return 9; return 10;}
function fixedAddIndex(){if(['剣士','弓使い','重戦士'].includes(job.value)) return 12; if(['魔闘士','魔法使い'].includes(job.value)) return 13; return 14;}
function specialOwned(i){const el=document.getElementById('own_'+i); const st=specialState.get(String(i)); return el ? el.value==='1' : !!(st&&st.own==='1');}
function specialHint(i){const el=document.getElementById('hint_'+i); const st=specialState.get(String(i)); return Number(el ? el.value : (st?st.hint:0));}
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
function scoreForRange(scoreTable,range){
  let total=0; const R=parseRange(range); if(!R) return 0;
  scoreTable.forEach(r=>{const q=parseRange(r[0]); if(!q) return; if(q.a>=R.a && q.b<=R.b) total+=Number(r[1]||0);});
  return total || Number((scoreTable.find(r=>r[0]===range)||[])[1]||0);
}
function basicCandidates(exp){
  const out=[]; const lim=limits();
  basicNames.forEach(name=>{
    if(basicOwned[name]) return;
    const cur=Number(document.getElementById('basic_'+name).value||1);
    const hint=Number(document.getElementById('bhint_'+name).value||0);
    const t=tableFor(name); if(!t) return;
    for(const r of t.cost){
      const rg=parseRange(r[0]); if(!rg || rg.a<cur || rg.b>lim[name]) continue;
      const costs=[r[1],r[2],r[3],r[4],r[5]].map(c=>costAfter(Number(c||0),hint,true));
      if(costs.every((c,i)=>c<=exp[i])){out.push({name:`${name} ${r[0]}`,costs,idx:basicNames.indexOf(name),order:rg.a}); break;}
    }
  });
  return out;
}
function specialCandidates(exp){
  const hp=currentHp(), out=[];
  D.special.forEach((s,i)=>{
    if(specialOwned(i)) return;
    const req=s[2]; if(req){const reqIndex=D.special.findIndex(x=>x[1]===req); if(reqIndex>=0 && !specialOwned(reqIndex)) return;}
    const hint=specialHint(i); const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
    if(costs.every((c,ix)=>c<=exp[ix]) && skillScore(s,hp)!==0) out.push({name:s[1],costs,idx:i});
  }); return out;
}
function calc(){
  saveSpecialState();
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const basics=basicCandidates(exp); const specials=specialCandidates(exp);
  const bhtml=basics.length?'<ol>'+basics.map(c=>`<li><b>${c.name}</b></li>`).join('')+'</ol>':'候補なし';
  const shtml=specials.length?'<ol>'+specials.map(c=>`<li><b>${renderSkillName(c.name)}</b></li>`).join('')+'</ol>':'候補なし';
  document.getElementById('result').innerHTML=`<div class="result-block"><h3>基本能力</h3>${bhtml}</div><div class="result-block"><h3>特殊能力</h3>${shtml}</div>`;
}
function resetAll(){
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value=''});
  document.querySelectorAll('input[type="hidden"]').forEach(i=>i.value=0);
  Object.keys(basicOwned).forEach(k=>basicOwned[k]=false);
  specialState.clear(); search.value=''; renderBasic(); renderSpecials();
  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}
document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);
initAcademies(); renderExp(); renderBasic(); renderSpecials();
})();
