/* 査定効率ランキング：スキル系6系統／Lv別。ゲームデータ正本 data.js を直接参照。 */
(()=>{
  'use strict';
  const dataset=window.PAWAADO_DATA?.skillRankings;
  const baseView=document.getElementById('basicRankingView');
  const skillView=document.getElementById('skillRankingView');
  const modeButtons=[...document.querySelectorAll('[data-ranking-mode]')];
  const jobButtons=[...document.querySelectorAll('[data-skill-job]')];
  const root=document.getElementById('skillRankingRoot');
  if(!root || !baseView || !skillView || !dataset) return;

  const jobGroups={
    '剣士系統':['剣士','双剣士'], '重戦士系統':['重戦士'],
    '弓使い系統':['弓使い'], '魔法使い系統':['魔法使い'],
    '僧侶系統':['僧侶'], '魔闘士系統':['魔闘士']
  };
  const physicalJobs=new Set(['剣士','双剣士','重戦士','弓使い']);
  const superRules=window.PAWAADO_DATA?.superScoreRules||{};
  const hpRows=window.PAWAADO_DATA?.hp||[];
  const referenceHp=hpRows.reduce((hp,row)=>Number(row[0])<=90?Number(row[1]||0):hp,0);
  let currentGroup='剣士系統';
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(n,d=3)=>Number.isFinite(n)?(Math.abs(n-Math.round(n))<1e-9?String(Math.round(n)):n.toFixed(d).replace(/0+$/,'').replace(/\.$/,'')):'—';
  const totalCost=arr=>arr.reduce((a,n)=>a+Number(n||0),0);
  const expKeys=['筋力','敏捷','技術','知力','精神'];
  const typeClasses={'必殺技':'skill-category-finisher','アクションスキル':'skill-category-action','超特殊能力':'skill-category-super'};
  const levelLabels={single1:'Lv1',single2:'Lv2',single3:'Lv3'};
  // 画面に表示する査定効率（小数第3位）が同じ場合は、査定→必要経験点の順で比較。
  const visibleEfficiency=n=>Math.round(n*1000);

  function hpScore(skill,job,index){
    const rates=superRules[skill.name]?.hpRates;
    if(!Array.isArray(rates)||referenceHp<=0)return null;
    const now=Number(rates[index]),prior=index?Number(rates[index-1]):0;
    if(!Number.isFinite(now)||!Number.isFinite(prior))return null;
    let score=referenceHp*(now-prior);
    if(skill.name==='大真面目'&&physicalJobs.has(job)){
      const nowPhysical=Number(skill.levels[index].effect?.物理攻撃倍率||0);
      const beforePhysical=index?Number(skill.levels[index-1].effect?.物理攻撃倍率||0):0;
      score+=(nowPhysical-beforePhysical)*45;
    }
    return score;
  }
  function asRow(skill,job,index){
    const l=skill.levels[index],cost=l.cost.map(x=>Number(x||0));
    const exp=totalCost(cost),hp=Boolean(skill.hp);
    const score=hp?hpScore(skill,job,index):l.scores[job]?.[0];
    const canRank=exp>0&&typeof score==='number'&&Number.isFinite(score);
    const phase='single'+l.lv;
    const detail=skill.category==='超特殊能力'?Object.entries(l.effect||{}).map(([name,value])=>name+' '+(typeof value==='number'&&value>0?'+':'')+value+(typeof value==='number'?'%':'')).join('、'):'';
    return {name:skill.name,kind:skill.kind,category:skill.category,job,attribute:skill.attribute,
      phase,label:levelLabels[phase]||'Lv'+l.lv,exp,cost,score:canRank?score:null,rawScore:score,eff:canRank?score/exp:null,
      conditions:'Lv'+l.lv+': '+l.condition,detail,hp,resistance:Boolean(skill.resistance),tip:l.tip,
      unrankedReason:exp<=0?'必要経験点0／未確認':'査定の固定値が未確定'};
  }
  function getRows(){
    const jobs=jobGroups[currentGroup];
    const items=[],seen=new Map();
    for(const skill of dataset.skills){
      for(const job of jobs){
        if(!skill.jobs.includes(job))continue;
        for(let i=0;i<skill.levels.length;i++){
          const row=asRow(skill,job,i);
          const key=[skill.name,row.phase,row.cost.join(','),row.rawScore,skill.category].join('|');
          if(seen.has(key))continue;
          seen.set(key,row);
          items.push(row);
        }
      }
    }
    const ranked=items.filter(x=>x.eff!==null);
    const unranked=items.filter(x=>x.eff===null);
    ranked.sort((a,b)=>visibleEfficiency(b.eff)-visibleEfficiency(a.eff) ||
      b.score-a.score || a.exp-b.exp || a.name.localeCompare(b.name,'ja') ||
      a.label.localeCompare(b.label,'ja'));
    unranked.sort((a,b)=>a.name.localeCompare(b.name,'ja')||a.label.localeCompare(b.label,'ja'));
    return {ranked,unranked};
  }
  function tr(row,rank){
    const explain=`${row.conditions}${row.detail?' ／ '+row.detail:''}`;
    const vec=row.cost.map((v,i)=>`${expKeys[i]} ${v}`).join(' / ');
    const cssClass=[typeClasses[row.category]||''].filter(Boolean).join(' ');
    const notes=[row.hp?'<span class="ranking-note-tag">HP依存</span>':'',
      row.resistance?'<span class="ranking-note-tag">耐性影響</span>':''].filter(Boolean).join('');
    const levelText=levelLabels[row.phase]||row.label;
    const nameLength=[...row.name].length;
    const nameClass=nameLength>=13?'skill-extra-long-name':nameLength>=10?'skill-long-name':'';
    return `<tr class="${cssClass}${rank===null?' skill-rank-unranked':''}">
      <td class="skill-rank-num">${rank===null?'—':rank}</td>
      <td class="skill-name-cell"><details><summary aria-label="${escapeHTML(row.name)} ${escapeHTML(levelText)}の詳細">
        <span class="skill-name-line"><span class="skill-row-title ${nameClass}" title="${escapeHTML(row.name)}">${escapeHTML(row.name)}</span><span class="skill-level">${escapeHTML(levelText)}</span><span class="skill-caret" aria-hidden="true">▾</span></span>
        </summary><div class="skill-row-detail">
        <div class="skill-full-name">${escapeHTML(row.name)} ${escapeHTML(levelText)}</div>
        <div>${escapeHTML(explain)}</div><div>経験点：${escapeHTML(vec)}</div>
        ${row.unrankedReason&&rank===null?`<div>${escapeHTML(row.unrankedReason)}</div>`:''}
        ${row.tip?`<div>コツLv：${escapeHTML(row.tip)}（表示費用）</div>`:''}
        </div></details></td>
      <td class="skill-rank-eff">${row.eff===null?'—':fmt(row.eff,3)}</td>
      <td class="skill-rank-score">${row.rawScore==null?'—':fmt(row.rawScore,2)}</td>
      <td class="skill-rank-exp">${fmt(row.exp,0)}</td>
      <td class="skill-rank-note">${notes}</td>
      </tr>`;
  }
  function render(){
    const {ranked,unranked}=getRows();
    let html='<table class="skill-rank-table"><colgroup><col class="rank-col"><col class="name-col"><col class="eff-col"><col class="score-col"><col class="exp-col"><col class="note-col"></colgroup><thead><tr><th>順位</th><th>名称</th><th>査定効率</th><th>査定</th><th>必要経験点</th><th>備考</th></tr></thead><tbody>';
    ranked.forEach((row,i)=>html+=tr(row,i+1));
    if(unranked.length){html+=`<tr class="skill-separator"><td colspan="6">条件依存・査定未確定（順位対象外） ${unranked.length}件</td></tr>`;unranked.forEach(row=>html+=tr(row,null));}
    html+='</tbody></table>';
    root.innerHTML=ranked.length||unranked.length?html:'<div class="skill-empty">この条件に該当するスキルはありません。</div>';
    jobButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skillJob===currentGroup)));
  }
  modeButtons.forEach(btn=>btn.addEventListener('click',()=>{
    const skills=btn.dataset.rankingMode==='skills';
    skillView.hidden=!skills;baseView.hidden=skills;
    modeButtons.forEach(b=>{const selected=b===btn;b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));});
    if(skills)render();
  }));
  jobButtons.forEach(btn=>btn.addEventListener('click',()=>{currentGroup=btn.dataset.skillJob;render();}));
  if(new URLSearchParams(location.search).get('mode')==='skills')modeButtons.find(x=>x.dataset.rankingMode==='skills')?.click();
})();