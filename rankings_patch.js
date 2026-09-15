(() => {
  'use strict';
  const D=window.PAWAADO_DATA;
  if(!D) return;

  const resistanceImpactSkills=new Set([
    '物理防御○','物理防御◎','魔法防御○','魔法防御◎','体幹','魔力制御','柔軟な体','無心の構え',
    '火耐性','風耐性','水耐性','無耐性','がむしゃら','ケガしにくさ○','ケガしにくさ◎','防御態勢',
    '備え','広い視野','見切り','危機察知','力学の理解','魔法の理解','免疫強化','意志','ガッツ',
    'ヒーラー魂','バランス感覚','立て直し','冷静沈着','戦況分析'
  ]);

  const healingHeart=(D.special||[]).find(row=>String(row?.[1])==='癒やしの心');
  if(healingHeart){
    healingHeart[14]=90;
    healingHeart[15]='剣士等・魔法職は基礎HP×1%。僧侶は90+基礎HP×1%。小数第2位四捨五入';
  }

  const noteList=document.querySelector('.notes ul');
  if(noteList){
    const items=[...noteList.querySelectorAll('li')];
    if(items[1]) items[1].textContent='基本能力の小数点以下の査定が不明であることなどから、実際の査定効率と異なる可能性があります。';
    if(![...noteList.querySelectorAll('li')].some(li=>li.textContent.includes('他の耐性に影響する特殊能力等を持たない状態'))){
      const li=document.createElement('li');
      li.textContent='耐性に影響する特殊能力は、他の耐性に影響する特殊能力等を持たない状態で単独取得した場合で計算しています。';
      items[1]?.insertAdjacentElement('afterend',li);
    }
  }

  const style=document.createElement('style');
  style.textContent='.ranking-resistance-marker{display:inline-block;margin-left:.4em;color:#98651d;font-size:10px;font-weight:800;white-space:nowrap}';
  document.head.appendChild(style);

  const root=document.getElementById('rankingRoot');
  const mark=()=>{
    if(!root) return;
    root.querySelectorAll('tr.special td.name-cell').forEach(cell=>{
      if(cell.querySelector('.ranking-resistance-marker')) return;
      const text=cell.textContent.trim();
      const name=[...resistanceImpactSkills].find(skill=>text===skill || text.startsWith(skill+' '));
      if(!name) return;
      const marker=document.createElement('span');
      marker.className='ranking-resistance-marker';
      marker.textContent='※耐性影響';
      cell.appendChild(marker);
    });
  };
  if(root){
    new MutationObserver(()=>queueMicrotask(mark)).observe(root,{childList:true,subtree:true});
    queueMicrotask(mark);
  }
})();
