/* 査定効率ランキング：スキル系6系統／段階別。2026-10-28の統合マスターを使用。 */
(()=>{
  'use strict';
  const dataset=window.PAWAADO_SKILL_RANKING_DATA;
  const baseView=document.getElementById('basicRankingView');
  const skillView=document.getElementById('skillRankingView');
  const modeButtons=[...document.querySelectorAll('[data-ranking-mode]')];
  const jobButtons=[...document.querySelectorAll('[data-skill-job]')];
  const root=document.getElementById('skillRankingRoot');
  const summary=document.getElementById('skillRankingSummary');
  const category=document.getElementById('skillCategory');
  const phase=document.getElementById('skillPhase');
  const search=document.getElementById('skillSearch');
  const tipMode=document.getElementById('skillTipMode');
  if(!root || !baseView || !skillView || !dataset) return;

  const jobGroups={
    '剣士系統':['剣士','双剣士'], '重戦士系統':['重戦士'],
    '弓使い系統':['弓使い'], '魔法使い系統':['魔法使い'],
    '僧侶系統':['僧侶'], '魔闘士系統':['魔闘士']
  };
  const phases={single1:'Lv1単体',single2:'Lv2単体',single3:'Lv3単体',sum2:'Lv1＋2累計',sum3:'Lv1＋2＋3累計'};
  let currentGroup='剣士系統';
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(n,d=3)=>Number.isFinite(n)?(Math.abs(n-Math.round(n))<1e-9?String(Math.round(n)):n.toFixed(d).replace(/0+$/,'').replace(/\.$/,'')):'—';
  const totalCost=arr=>arr.reduce((a,n)=>a+Number(n||0),0);
  const expKeys=['筋力','敏捷','技術','知力','精神'];
  const categoryShort={'必殺技':'必殺','アクションスキル':'アクション','超特殊能力':'超特'};

  function getCost(skill,level){
    // 「一点集中」のコツLv2だけ実測あり。それ以外の費用は元のマスターのコツ状態を使用。
    if(skill.name==='一点集中' && tipMode.value==='tip2' && level.tips?.['2']) return level.tips['2'];
    return level.cost;
  }
  function asRow(skill,job,levelIndex,isCumulative){
    const l=skill.levels[levelIndex];
    const upto=isCumulative?skill.levels.slice(0,levelIndex+1):[l];
    const cost=Array(5).fill(0);
    for(const x of upto) getCost(skill,x).forEach((v,i)=>cost[i]+=Number(v||0));
    const exp=totalCost(cost);
    const score=isCumulative?l.scores[job]?.[1]:l.scores[job]?.[0];
    const hp=Boolean(skill.hp);
    const canRank=exp>0 && typeof score==='number' && Number.isFinite(score) && !hp;
    const key=(isCumulative?(l.lv===2?'sum2':'sum3'):'single'+l.lv);
    const conditions=upto.map(x=>`Lv${x.lv}: ${x.condition}`).join(' ／ ');
    const detail=skill.category==='超特殊能力'?upto.map(x=>{
      const parts=Object.entries(x.effect||{}).map(([name,value])=>`${name} ${typeof value==='number'&&value>0?'+':''}${value}${typeof value==='number'?'%':''}`);
      return `Lv${x.lv}：${parts.join('、')||'効果記録なし'}`;
    }).join(' ／ '):'';
    const hint=(skill.hp?'※HP依存':skill.resistance?'※耐性影響':'');
    return {name:skill.name,kind:skill.kind,category:skill.category,job,attribute:skill.attribute,phase:key,label:phases[key]||`Lv${l.lv}`,exp,cost,score:canRank?score:null,rawScore:score,eff:canRank?score/exp:null,
      conditions,detail,hint,tip:upto.map(x=>x.tip).join('、'),unrankedReason:hp?'HP依存のため基礎HP・取得状況で査定が変わります':(exp<=0?'必要経験点0／未確認':'査定の固定値が未確定')};
  }
  function getRows(){
    const jobs=jobGroups[currentGroup];
    const categoryFilter=category.value, phaseFilter=phase.value, keyword=search.value.trim().toLowerCase();
    const items=[],seen=new Set();
    for(const skill of dataset.skills){
      if(categoryFilter!=='all' && skill.category!==categoryFilter)continue;
      if(keyword && !(skill.name+' '+skill.category+' '+(skill.attribute||'')).toLowerCase().includes(keyword))continue;
      for(const job of jobs){
        if(!skill.jobs.includes(job))continue;
        for(let i=0;i<skill.levels.length;i++){
          const choices=[false];if(i>0)choices.push(true);
          for(const cum of choices){
            const row=asRow(skill,job,i,cum);
            if(phaseFilter!=='all' && row.phase!==phaseFilter)continue;
            // 剣士・双剣士で同一費用・同一査定の同一技は重複行にしない。
            const k=[skill.name,row.phase,row.cost.join(','),row.rawScore,skill.category].join('|');
            if(seen.has(k))continue;
            seen.add(k);
            if(currentGroup==='剣士系統' && skill.jobs.includes('剣士') && skill.jobs.includes('双剣士'))row.job='剣士・双剣士';
            items.push(row);
          }
        }
      }
    }
    const ranked=items.filter(x=>x.eff!==null);
    const unranked=items.filter(x=>x.eff===null);
    ranked.sort((a,b)=>b.eff-a.eff||b.score-a.score||a.name.localeCompare(b.name,'ja')||a.label.localeCompare(b.label,'ja'));
    unranked.sort((a,b)=>a.name.localeCompare(b.name,'ja')||a.label.localeCompare(b.label,'ja'));
    return {ranked,unranked};
  }
  function tr(row,rank){
    const tags=[categoryShort[row.category]||row.category,row.label,row.job,row.attribute?row.attribute+'属性':null].filter(Boolean);
    const explain=`${row.conditions}${row.detail?' ／ '+row.detail:''}`;
    const vec=row.cost.map((v,i)=>`${expKeys[i]} ${v}`).join(' / ');
    return `<tr class="${rank===null?'skill-rank-unranked':''}">
      <td class="skill-rank-num">${rank===null?'—':rank}</td>
      <td class="skill-name-cell"><details><summary><span class="skill-row-title">${escapeHTML(row.name)}${row.hint?` <span class="skill-hint">${escapeHTML(row.hint)}</span>`:''}</span>
        <span class="skill-tagline">${tags.map(t=>`<span class="skill-tag">${escapeHTML(t)}</span>`).join('')}</span>
        <span class="skill-metrics">必要点 ${fmt(row.exp,0)} ／ 査定 ${row.rawScore==null?'条件依存':fmt(row.rawScore,2)}</span></summary>
        <div class="skill-row-detail"><div>${escapeHTML(explain)}</div><div>経験点：${escapeHTML(vec)}</div>
        ${row.unrankedReason&&rank===null?`<div>${escapeHTML(row.unrankedReason)}</div>`:''}
        ${row.tip?`<div>コツLv：${escapeHTML(row.tip)}（表示費用）</div>`:''}</div></details></td>
      <td class="skill-rank-eff">${row.eff===null?'—':fmt(row.eff,3)}</td></tr>`;
  }
  function render(){
    const {ranked,unranked}=getRows();
    summary.textContent=`${currentGroup}：査定効率を計算できるもの ${ranked.length}件${unranked.length?` ／ 条件依存・算定不可 ${unranked.length}件`:''}`;
    let html='<table class="skill-rank-table"><colgroup><col class="rank-col"><col><col class="eff-col"></colgroup><thead><tr><th>順位</th><th>スキル・取得段階</th><th>査定効率</th></tr></thead><tbody>';
    ranked.forEach((row,i)=>html+=tr(row,i+1));
    if(unranked.length){html+=`<tr class="skill-separator"><td colspan="3">条件依存・査定未確定（順位対象外） ${unranked.length}件</td></tr>`;unranked.forEach(row=>html+=tr(row,null));}
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
  [category,phase,tipMode].forEach(el=>el?.addEventListener('change',render));
  search?.addEventListener('input',render);
  if(new URLSearchParams(location.search).get('mode')==='skills')modeButtons.find(x=>x.dataset.rankingMode==='skills')?.click();
})();