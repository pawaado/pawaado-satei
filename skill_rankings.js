/* 査定効率ランキング：スキル系6系統／Lv.別・Lv.累計。ゲームデータ正本 data.js を直接参照。 */
(()=>{
  'use strict';
  const dataset=window.PAWAADO_DATA?.skillRankings;
  const baseView=document.getElementById('basicRankingView');
  const skillView=document.getElementById('skillRankingView');
  const modeButtons=[...document.querySelectorAll('[data-ranking-mode]')];
  const jobButtons=[...document.querySelectorAll('[data-skill-job]')];
  const levelButtons=[...document.querySelectorAll('[data-skill-level-mode]')];
  const root=document.getElementById('skillRankingRoot');
  if(!root || !baseView || !skillView || !dataset) return;

  const D=window.PAWAADO_DATA;
  // 読み仮名の正本は skill_master.js。読みのないカタカナ名は名称を使用。
  const skillKana=dataset.readings||{};
  const kanaCollator=new Intl.Collator('ja');
  const compareNames=(a,b)=>kanaCollator.compare(skillKana[a]||a,skillKana[b]||b)||kanaCollator.compare(a,b);
  const jobGroups=Object.fromEntries(
    ['剣士系統','重戦士系統','弓使い系統','魔法使い系統','僧侶系統','魔闘士系統']
      .map(family=>[family,Object.keys(D.jobFamilyByJob||{}).filter(job=>D.jobFamilyByJob[job]===family)])
  );
  const physicalJobs=new Set(['剣士','双剣士','重戦士','弓使い']);
  const superRules=window.PAWAADO_DATA?.superScoreRules||{};
  const hpRows=window.PAWAADO_DATA?.hp||[];
  const referenceHp=hpRows.reduce((hp,row)=>Number(row[0])<=90?Number(row[1]||0):hp,0);
  let currentGroup='剣士系統';
  let currentLevelMode='single';
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(n,d=3)=>Number.isFinite(n)?(Math.abs(n-Math.round(n))<1e-9?String(Math.round(n)):n.toFixed(d).replace(/0+$/,'').replace(/\.$/,'')):'—';
  const totalCost=arr=>arr.reduce((a,n)=>a+Number(n||0),0);
  const expKeys=['筋力','敏捷','技術','知力','精神'];
  const typeClasses={'必殺技':'skill-category-finisher','アクションスキル':'skill-category-action','超特殊能力':'skill-category-super'};
  const levelLabels={single1:'Lv.1',single2:'Lv.2',single3:'Lv.3'};
  // 比較条件：超特殊能力・固有の必殺技/アクションはコツLv1、汎用はコツなし。
  // 全段階の必要経験点は data.js の比較対象コツLvで直接確認済み。
  // 今後データのコツLvが一致しないものが追加されても逆算で推測せず、順位対象外とする。
  const targetTip=skill=>skill.category==='超特殊能力'||skill.kind==='固有'?1:0;
  function rankingCost(skill,level){
    const tip=targetTip(skill),sourceTip=Number(level.tip);
    if(sourceTip!==tip)return {cost:[0,0,0,0,0],tip,sourceTip,verified:false};
    return {cost:level.cost.map(v=>Number(v||0)),tip,sourceTip,verified:true};
  }
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
    const l=skill.levels[index],normalized=rankingCost(skill,l),cost=normalized.cost;
    const exp=totalCost(cost),hp=Boolean(skill.hp);
    const score=hp?hpScore(skill,job,index):D.skillJobScore(skill,l,job)?.[0];
    const canRank=exp>0&&typeof score==='number'&&Number.isFinite(score);
    const phase='single'+l.lv;
    const detail=skill.category==='超特殊能力'?Object.entries(l.effect||{}).map(([name,value])=>name+' '+(typeof value==='number'&&value>0?'+':'')+value+(typeof value==='number'?'%':'')).join('、'):'';
    return {name:skill.name,kind:skill.kind,hasAbilityLevels:skill.levels.length>1,category:skill.category,job,attribute:skill.attribute,
      phase,label:levelLabels[phase]||'Lv.'+l.lv,exp,cost,score:canRank?score:null,rawScore:score,eff:canRank?score/exp:null,
      conditions:'Lv.'+l.lv+': '+l.condition,detail,hp,resistance:Boolean(skill.resistance),
      tip:normalized.tip,sourceTip:l.tip,verifiedCost:normalized.verified,
      unrankedReason:!normalized.verified?'指定コツLvの必要経験点が未確認':exp<=0?'必要経験点0／未確認':'査定の固定値が未確定'};
  }
  // Lv.累計は1つのスキルを1行にまとめる。追加査定・追加経験点を全Lv.分合算し、
  // コツLv.が未確認の段階が1つでもあれば推測せず順位対象外にする。
  function asTotalRow(skill,job){
    const stages=skill.levels.map((_,index)=>asRow(skill,job,index));
    const cost=expKeys.map((_,i)=>stages.reduce((sum,row)=>sum+row.cost[i],0));
    const exp=totalCost(cost);
    const verified=stages.every(row=>row.verifiedCost);
    const scoresKnown=stages.every(row=>typeof row.rawScore==='number'&&Number.isFinite(row.rawScore));
    // 僧侶などの端数はLv.ごとに切り捨てず、追加査定のまま合算する。
    const score=scoresKnown?stages.reduce((sum,row)=>sum+row.rawScore,0):null;
    const canRank=verified&&scoresKnown&&exp>0;
    const maxLv=skill.levels[skill.levels.length-1].lv;
    return {...stages[stages.length-1],
      phase:'total',label:stages.length===1?'Lv.1':'Lv.1〜'+maxLv,
      cost,exp,score:canRank?score:null,rawScore:score,
      eff:canRank?score/exp:null,verifiedCost:verified,
      conditions:stages.map(row=>row.conditions).join('／'),
      detail:'',
      unrankedReason:!verified?'指定コツLvの必要経験点が未確認':exp<=0?'必要経験点0／未確認':'査定の固定値が未確定'};
  }
  function getRows(){
    const jobs=jobGroups[currentGroup];
    const items=[],seen=new Map();
    for(const skill of dataset.skills){
      for(const job of jobs){
        if(!D.skillJobEligible(skill,job))continue;
        const rows=currentLevelMode==='total'
          ?[asTotalRow(skill,job)]
          :skill.levels.map((_,i)=>asRow(skill,job,i));
        for(const row of rows){
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
      b.score-a.score || a.exp-b.exp || compareNames(a.name,b.name) ||
      a.label.localeCompare(b.label,'ja'));
    unranked.sort((a,b)=>compareNames(a.name,b.name)||a.label.localeCompare(b.label,'ja'));
    return {ranked,unranked};
  }
  function tr(row,rank){
    const explain=`${row.conditions}${row.detail?' ／ '+row.detail:''}`;
    const cssClass=[typeClasses[row.category]||''].filter(Boolean).join(' ');
    const notes=[row.hp?'<span class="ranking-note-tag">HP依存</span>':'',
      row.resistance?'<span class="ranking-note-tag">耐性影響</span>':''].filter(Boolean).join('');
    // 累計版はスキル名のみ。単独版は固有・超特と、能力Lv.を持つ双剣士の汎用を表示。
    const showLevel=currentLevelMode==='single'&&(row.kind!=='汎用'||row.hasAbilityLevels);
    const levelHtml=showLevel?'<span class="skill-level">'+escapeHTML(levelLabels[row.phase]||row.label)+'</span>':'';
    return `<tr class="${cssClass}${rank===null?' skill-rank-unranked':''}">
      <td class="skill-rank-num"><span class="skill-rank-index">${rank===null?'—':rank}</span></td>
      <td class="skill-name-cell"><span class="skill-name-line"><span class="skill-row-title" title="${escapeHTML(row.name)}">${escapeHTML(row.name)}</span>${levelHtml}</span></td>
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
    levelButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skillLevelMode===currentLevelMode)));
  }
  modeButtons.forEach(btn=>btn.addEventListener('click',()=>{
    const skills=btn.dataset.rankingMode==='skills';
    skillView.hidden=!skills;baseView.hidden=skills;
    modeButtons.forEach(b=>{const selected=b===btn;b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));});
    if(skills)render();
  }));
  jobButtons.forEach(btn=>btn.addEventListener('click',()=>{currentGroup=btn.dataset.skillJob;render();}));
  levelButtons.forEach(btn=>btn.addEventListener('click',()=>{currentLevelMode=btn.dataset.skillLevelMode;render();}));
  if(new URLSearchParams(location.search).get('mode')==='skills')modeButtons.find(x=>x.dataset.rankingMode==='skills')?.click();
})();