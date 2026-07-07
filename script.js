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

function opt(label,value){return new Option(label,value??label)}
function initAcademies(){
  academy.innerHTML='';
  Object.keys(jobsByAcademy).forEach(a=>academy.add(opt(a)));
  if(!academy.value && academy.options.length) academy.selectedIndex=0;
  updateJobs();
}
function updateJobs(){
  const jobs=jobsByAcademy[academy.value]||[];
  job.innerHTML='';
  jobs.forEach(j=>job.add(opt(j)));
  if(!job.value && job.options.length) job.selectedIndex=0;
  renderSpecials();
}
academy.addEventListener('change',updateJobs);
job.addEventListener('change',renderSpecials);

function renderExp(){
  document.getElementById('expInputs').innerHTML=expNames.map(n=>`<label>${n}<input type="number" min="0" value="0" id="exp_${n}" inputmode="numeric"></label>`).join('');
}
function renderBasic(){
  document.getElementById('basicInputs').innerHTML=basicNames.map(n=>`
    <div class="ability-row" data-basic="${n}">
      <button type="button" class="plus-btn" data-kind="basic" data-name="${n}">＋</button>
      <div class="ability-body">
        <span class="ability-name">${n}</span>
        <input class="ability-value" type="number" min="1" value="1" id="basic_${n}" inputmode="numeric">
      </div>
      <input type="hidden" id="bhint_${n}" value="0">
    </div>`).join('');
}
function renderSkillName(name){
  return String(name).replace(/○/g,'<span class="mark">○</span>').replace(/◎/g,'<span class="mark">◎</span>');
}
function visibleSpecial(s){
  const q=(search.value||'').trim().toLowerCase();
  if(!q) return true;
  return String(s[1]).toLowerCase().includes(q);
}
function renderSpecials(){
  const html=D.special.map((s,i)=>{
    if(!visibleSpecial(s)) return '';
    return `<div class="skill-row" data-index="${i}">
      <button type="button" class="plus-btn" data-kind="special" data-index="${i}">＋</button>
      <button type="button" class="skill-body" data-index="${i}"><span class="skill-name">${renderSkillName(s[1])}</span></button>
      <input type="hidden" id="hint_${i}" value="0">
      <input type="hidden" id="own_${i}" value="0">
    </div>`;
  }).join('');
  specialList.innerHTML=html || '<p class="muted">該当する特殊能力がありません。</p>';
  restoreSpecialState();
}

const specialState=new Map();
function saveSpecialState(){
  document.querySelectorAll('.skill-row').forEach(row=>{
    const i=row.dataset.index;
    const h=document.getElementById('hint_'+i);
    const o=document.getElementById('own_'+i);
    if(h&&o) specialState.set(i,{hint:h.value,own:o.value});
  });
}
function restoreSpecialState(){
  document.querySelectorAll('.skill-row').forEach(row=>{
    const i=row.dataset.index;
    const st=specialState.get(i);
    if(st){
      const h=document.getElementById('hint_'+i), o=document.getElementById('own_'+i);
      if(h)h.value=st.hint; if(o)o.value=st.own;
    }
    applySkillVisual(i);
  });
}
search.addEventListener('input',()=>{saveSpecialState();renderSpecials();});

function openHintPicker(anchor,current,callback){
  document.querySelectorAll('.hint-select').forEach(e=>e.remove());
  const sel=document.createElement('select');
  sel.className='hint-select';
  hintLevels.forEach(l=>sel.add(opt(`コツLv${l}`,String(l))));
  sel.value=String(current||0);
  document.body.appendChild(sel);
  const r=anchor.getBoundingClientRect();
  sel.style.left=Math.max(8,Math.min(window.innerWidth-128,r.left+window.scrollX))+'px';
  sel.style.top=(r.bottom+window.scrollY+4)+'px';
  sel.focus();
  sel.addEventListener('change',()=>{callback(Number(sel.value));sel.remove();});
  sel.addEventListener('blur',()=>setTimeout(()=>sel.remove(),150));
}
function setPlus(btn,level){
  btn.textContent=Number(level)>0?`Lv${level}`:'＋';
  btn.classList.toggle('has-hint',Number(level)>0);
}
function applySkillVisual(i){
  const row=document.querySelector(`.skill-row[data-index="${i}"]`);
  if(!row)return;
  const h=document.getElementById('hint_'+i)?.value||0;
  const o=document.getElementById('own_'+i)?.value||0;
  setPlus(row.querySelector('.plus-btn'),h);
  row.classList.toggle('owned',String(o)==='1');
}
function applyBasicVisual(name){
  const row=document.querySelector(`.ability-row[data-basic="${name}"]`);
  if(!row)return;
  const h=document.getElementById('bhint_'+name)?.value||0;
  setPlus(row.querySelector('.plus-btn'),h);
}

document.addEventListener('click',e=>{
  const plus=e.target.closest('.plus-btn');
  if(plus){
    if(plus.dataset.kind==='basic'){
      const name=plus.dataset.name;
      const hidden=document.getElementById('bhint_'+name);
      openHintPicker(plus,hidden.value,lv=>{hidden.value=lv;applyBasicVisual(name);});
    }else{
      const i=plus.dataset.index;
      const hidden=document.getElementById('hint_'+i);
      openHintPicker(plus,hidden.value,lv=>{hidden.value=lv;specialState.set(i,{hint:hidden.value,own:document.getElementById('own_'+i).value});applySkillVisual(i);});
    }
    e.preventDefault(); return;
  }
  const skill=e.target.closest('.skill-body');
  if(skill){
    const i=skill.dataset.index;
    const own=document.getElementById('own_'+i);
    own.value=own.value==='1'?'0':'1';
    specialState.set(i,{hint:document.getElementById('hint_'+i).value,own:own.value});
    applySkillVisual(i);
  }
});

function jobScoreIndex(){
  if(['剣士','弓使い','重戦士'].includes(job.value)) return 8;
  if(['魔闘士','魔法使い'].includes(job.value)) return 9;
  return 10;
}
function fixedAddIndex(){
  if(['剣士','弓使い','重戦士'].includes(job.value)) return 12;
  if(['魔闘士','魔法使い'].includes(job.value)) return 13;
  return 14;
}
function specialOwned(i){
  const el=document.getElementById('own_'+i);
  const st=specialState.get(String(i));
  return el ? el.value==='1' : !!(st&&st.own==='1');
}
function specialHint(i){
  const el=document.getElementById('hint_'+i);
  const st=specialState.get(String(i));
  return Number(el ? el.value : (st?st.hint:0));
}
function skillScore(s,hp){
  const rate=Number(s[11]||0);
  if(rate){
    const fixed=Number(s[fixedAddIndex()]||0);
    return Math.round((fixed+hp*rate)*10)/10;
  }
  const v=s[jobScoreIndex()];
  if(v==='HP依存') return 0;
  return Number(v||0);
}
function costAfter(cost,hint,basic=false){
  const disc=basic?hint*0.02:({0:0,1:.5,2:.6,3:.7,4:.8,5:.9}[hint]||0);
  return Math.floor(cost*(1-disc));
}
function currentHp(){
  let hp=50;
  const life=Number(document.getElementById('basic_生命力').value||1);
  for(const r of D.hp){if(life>=Number(r[0])) hp=Number(r[1]);}
  return hp;
}
function calc(){
  saveSpecialState();
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const hp=currentHp();
  const candidates=[];
  D.special.forEach((s,i)=>{
    if(specialOwned(i)) return;
    const req=s[2];
    if(req){
      const reqIndex=D.special.findIndex(x=>x[1]===req);
      if(reqIndex>=0 && !specialOwned(reqIndex)) return;
    }
    const hint=specialHint(i);
    const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
    if(costs.every((c,ix)=>c<=exp[ix])){
      const sc=skillScore(s,hp);
      if(sc!==0) candidates.push({name:s[1],costs,score:sc,eff:sc/(costs.reduce((a,b)=>a+b,0)||1)});
    }
  });
  candidates.sort((a,b)=>b.eff-a.eff);
  document.getElementById('result').innerHTML=candidates.length
    ? '<ol>'+candidates.slice(0,30).map(c=>`<li><b>${c.name}</b>（目安査定 ${c.score} / 必要 ${c.costs.join('・')}）</li>`).join('')+'</ol>'
    : '取得できる候補がありません。';
}
function resetAll(){
  document.querySelectorAll('input[type="number"]').forEach(i=>{i.value=i.id.startsWith('basic_')?1:0});
  document.querySelectorAll('input[type="hidden"]').forEach(i=>i.value=0);
  specialState.clear();
  search.value='';
  renderSpecials();
  basicNames.forEach(applyBasicVisual);
  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
}
document.getElementById('calcBtn').addEventListener('click',calc);
document.getElementById('resetBtn').addEventListener('click',resetAll);
document.getElementById('topResetBtn').addEventListener('click',resetAll);

initAcademies();
renderExp();
renderBasic();
renderSpecials();
basicNames.forEach(applyBasicVisual);
})();
