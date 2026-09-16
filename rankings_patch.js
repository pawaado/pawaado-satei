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
    let resistanceNote=[...noteList.querySelectorAll('li')].find(li=>li.textContent.trim().startsWith('耐性に影響する特殊能力は'));
    if(!resistanceNote){
      resistanceNote=document.createElement('li');
      items[1]?.insertAdjacentElement('afterend',resistanceNote);
    }
    if(resistanceNote){
      resistanceNote.textContent='耐性に影響する特殊能力は、他の耐性に影響する特殊能力を持たず、単独取得した場合で計算しています。';
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .ranking-note-marker{
      display:inline-block;
      margin-left:.4em;
      color:#98651d;
      font-size:10px;
      font-weight:800;
      white-space:nowrap;
      vertical-align:middle;
    }
  `;
  document.head.appendChild(style);

  const root=document.getElementById('rankingRoot');
  const mark=()=>{
    if(!root) return;
    root.querySelectorAll('tr.special td.name-cell').forEach(cell=>{
      if(cell.dataset.noteMarkersReady==='1') return;
      let text=cell.textContent.trim();
      const hpDependent=text.includes('※HP依存');
      text=text.replace(/\s*※HP依存/g,'').replace(/\s*※耐性影響/g,'').trim();

      cell.textContent=text;
      if(hpDependent){
        const hp=document.createElement('span');
        hp.className='ranking-note-marker ranking-hp-marker';
        hp.textContent='※HP依存';
        cell.appendChild(hp);
      }

      if(resistanceImpactSkills.has(text)){
        const resistance=document.createElement('span');
        resistance.className='ranking-note-marker ranking-resistance-marker';
        resistance.textContent='※耐性影響';
        cell.appendChild(resistance);
      }
      cell.dataset.noteMarkersReady='1';
    });
  };

  if(root){
    new MutationObserver(()=>queueMicrotask(mark)).observe(root,{childList:true,subtree:true});
    queueMicrotask(mark);
  }
})();
