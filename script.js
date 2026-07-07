const D=window.PAWAADO_DATA;
const jobsByAcademy={};
D.academies.forEach(r=>{(jobsByAcademy[r[0]]??=[]).push(r[1])});
const academy=document.getElementById('academy'),job=document.getElementById('job');
Object.keys(jobsByAcademy).forEach(a=>academy.add(new Option(a,a)));
function updateJobs(){job.innerHTML='';jobsByAcademy[academy.value].forEach(j=>job.add(new Option(j,j)))}
academy.onchange=updateJobs;updateJobs();

const expNames=['筋力','敏捷','技術','知力','精神'];
document.getElementById('expInputs').innerHTML=expNames.map(n=>`<label>${n}<input type="number" min="0" value="0" id="exp_${n}"></label>`).join('');

const basicNames=['生命力','パワー','魔力','器用さ','耐久力','精神力'];
document.getElementById('basicInputs').innerHTML=basicNames.map(n=>`<div class="basic-row"><strong>${n}</strong><label>現在値<input type="number" min="1" value="1" id="basic_${n}"></label><label>コツLv<select id="bhint_${n}">${[0,1,2,3,4,5].map(x=>`<option>${x}</option>`).join('')}</select></label></div>`).join('');

function renderSkillName(name){
  return String(name).replace('○','<span class="mark">○</span>').replace('◎','<span class="mark">◎</span>');
}
const tbody=document.querySelector('#specialTable tbody');
tbody.innerHTML=D.special.map((s,i)=>`<tr><td><select class="hint" id="hint_${i}">${[0,1,2,3,4,5].map(x=>`<option>${x}</option>`).join('')}</select></td><td class="owned"><input type="checkbox" id="own_${i}"></td><td class="skill-name">${renderSkillName(s[1])}</td></tr>`).join('');

function jobGroupIndex(){
  if(['剣士','弓使い','重戦士'].includes(job.value)) return 8;
  if(['魔闘士','魔法使い'].includes(job.value)) return 9;
  return 10;
}
function fixedAddIndex(){
  if(['剣士','弓使い','重戦士'].includes(job.value)) return 12;
  if(['魔闘士','魔法使い'].includes(job.value)) return 13;
  return 14;
}
function skillScore(s, hp){
  const group=jobGroupIndex();
  const rate=Number(s[11]||0);
  if(rate){
    const fixed=Number(s[fixedAddIndex()]||0);
    return Math.round((fixed+hp*rate)*10)/10;
  }
  const v=s[group];
  if(v==="HP依存") return 0;
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
  const exp=expNames.map(n=>Number(document.getElementById('exp_'+n).value||0));
  const hp=currentHp();
  let candidates=[];
  D.special.forEach((s,i)=>{
    if(document.getElementById('own_'+i).checked)return;
    const req=s[2];
    if(req){
      const reqIndex=D.special.findIndex(x=>x[1]===req);
      if(reqIndex>=0 && !document.getElementById('own_'+reqIndex).checked)return;
    }
    const hint=Number(document.getElementById('hint_'+i).value);
    const costs=[s[3],s[4],s[5],s[6],s[7]].map(c=>costAfter(Number(c||0),hint,false));
    if(costs.every((c,ix)=>c<=exp[ix])){
      let sc=skillScore(s,hp);
      if(sc!==0) candidates.push({name:s[1],costs,score:sc,eff:sc/(costs.reduce((a,b)=>a+b,0)||1)});
    }
  });
  candidates.sort((a,b)=>b.eff-a.eff);
  document.getElementById('result').innerHTML='<ol>'+candidates.slice(0,20).map(c=>`<li><b>${c.name}</b>（目安査定 ${c.score} / 必要 ${c.costs.join('・')}）</li>`).join('')+'</ol>';
}
document.getElementById('calcBtn').onclick=calc;
document.getElementById('resetBtn').onclick=()=>{
  document.querySelectorAll('input').forEach(i=>{if(i.type==='checkbox')i.checked=false;else i.value=i.id.startsWith('basic_')?1:0});
  document.querySelectorAll('select.hint').forEach(s=>s.value=0);
  document.querySelectorAll('[id^=bhint_]').forEach(s=>s.value=0);
  document.getElementById('result').textContent='条件を入力して「計算する」を押してください。';
};
