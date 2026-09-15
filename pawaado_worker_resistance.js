/* PowerAd resistance-aware worker loader */
(() => {
  'use strict';
  const queued=[];
  self.onmessage=event=>queued.push(event);

  const replaceOnce=(source,needle,replacement,label)=>{
    const index=source.indexOf(needle);
    if(index<0) throw new Error(`耐性対応パッチの適用に失敗しました: ${label}`);
    if(source.indexOf(needle,index+needle.length)>=0) throw new Error(`耐性対応パッチの適用箇所が複数あります: ${label}`);
    return source.slice(0,index)+replacement+source.slice(index+needle.length);
  };

  (async()=>{
    const response=await fetch('./pawaado_worker.js?v=20260916-resistance-base-1',{cache:'no-store'});
    if(!response.ok) throw new Error(`計算Workerの読み込みに失敗しました (${response.status})`);
    let source=await response.text();

    source=replaceOnce(source,
`let cancelRequested=false;\n`,
`let cancelRequested=false;\n\n// --- resistance-aware scoring patch ---\nlet workerExtraResistances=[];\nconst RESISTANCE_SCORE_RATES=Object.freeze({\n  '物理攻撃耐性':70,'魔法攻撃耐性':70,'必殺技耐性':33,'全体攻撃耐性':50,'単体攻撃耐性':70,\n  '火属性耐性':70,'風属性耐性':70,'水属性耐性':70,'無属性耐性':70,'列攻撃耐性':50,\n  'アクションスキル耐性':18,'ダメージ状態異常耐性':20,'弱体化状態異常耐性':20,'行動不能状態異常耐性':20\n});\nconst ATTACK_RECOVERY_SCORE_RATES=Object.freeze({\n  physical:Object.freeze({physicalAttack:45,magicAttack:0,hpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),\n  magic:Object.freeze({physicalAttack:0,magicAttack:45,hpRecovery:0,normalAttackHpRecovery:0,actionRecovery:0,rowHpRecovery:0,finisherHpRecovery:0}),\n  priest:Object.freeze({physicalAttack:0,magicAttack:4.5,hpRecovery:45,normalAttackHpRecovery:13,actionRecovery:12,rowHpRecovery:33,finisherHpRecovery:22})\n});\nconst RESISTANCE_PAIR_SOURCES=Object.freeze([\n  Object.freeze({lower:'物理防御○',upper:'物理防御◎',type:'物理攻撃耐性',lowerValue:2,upperValue:4,source:'物理防御'}),\n  Object.freeze({lower:'魔法防御○',upper:'魔法防御◎',type:'魔法攻撃耐性',lowerValue:2,upperValue:4,source:'魔法防御'}),\n  Object.freeze({lower:'ケガしにくさ○',upper:'ケガしにくさ◎',types:['物理攻撃耐性','魔法攻撃耐性'],lowerValue:1,upperValue:2,source:'ケガしにくさ'})\n]);\nconst RESISTANCE_DIRECT_EFFECTS=Object.freeze({\n  '体幹':[['物理攻撃耐性',1]],\n  '魔力制御':[['魔法攻撃耐性',1]],\n  '柔軟な体':[['物理攻撃耐性',4]],\n  '無心の構え':[['魔法攻撃耐性',4]],\n  '火耐性':[['火属性耐性',2]],\n  '風耐性':[['風属性耐性',2]],\n  '水耐性':[['水属性耐性',2]],\n  '無耐性':[['無属性耐性',2]],\n  'がむしゃら':[['物理攻撃耐性',-2],['魔法攻撃耐性',-2]],\n  '防御態勢':[['単体攻撃耐性',2]],\n  '備え':[['列攻撃耐性',2]],\n  '広い視野':[['全体攻撃耐性',2]],\n  '見切り':[['アクションスキル耐性',4]],\n  '危機察知':[['必殺技耐性',4]],\n  '力学の理解':[['物理攻撃耐性',4]],\n  '魔法の理解':[['魔法攻撃耐性',4]],\n  '免疫強化':[['ダメージ状態異常耐性',2]],\n  '意志':[['弱体化状態異常耐性',2]],\n  'ガッツ':[['行動不能状態異常耐性',2]],\n  'ヒーラー魂':[['物理攻撃耐性',-1]],\n  'バランス感覚':[['列攻撃耐性',2]],\n  '立て直し':[['必殺技耐性',2]],\n  '冷静沈着':[['魔法攻撃耐性',2]],\n  '戦況分析':[['全体攻撃耐性',2]]\n});\n// 現行data.jsの固定査定から差し引く「単独取得時の耐性部分」。◎は○からの増分だけを持つ。\nconst STATIC_RESISTANCE_EFFECTS=Object.freeze({\n  '物理防御○':[['物理攻撃耐性',2]],'物理防御◎':[['物理攻撃耐性',2]],\n  '魔法防御○':[['魔法攻撃耐性',2]],'魔法防御◎':[['魔法攻撃耐性',2]],\n  '体幹':[['物理攻撃耐性',1]],'魔力制御':[['魔法攻撃耐性',1]],\n  '柔軟な体':[['物理攻撃耐性',4]],'無心の構え':[['魔法攻撃耐性',4]],\n  '火耐性':[['火属性耐性',2]],'風耐性':[['風属性耐性',2]],'水耐性':[['水属性耐性',2]],'無耐性':[['無属性耐性',2]],\n  'がむしゃら':[['物理攻撃耐性',-2],['魔法攻撃耐性',-2]],\n  'ケガしにくさ○':[['物理攻撃耐性',1],['魔法攻撃耐性',1]],\n  'ケガしにくさ◎':[['物理攻撃耐性',1],['魔法攻撃耐性',1]],\n  '防御態勢':[['単体攻撃耐性',2]],'備え':[['列攻撃耐性',2]],'広い視野':[['全体攻撃耐性',2]],\n  '見切り':[['アクションスキル耐性',4]],'危機察知':[['必殺技耐性',4]],\n  '力学の理解':[['物理攻撃耐性',4]],'魔法の理解':[['魔法攻撃耐性',4]],\n  '免疫強化':[['ダメージ状態異常耐性',2]],'意志':[['弱体化状態異常耐性',2]],'ガッツ':[['行動不能状態異常耐性',2]],\n  'ヒーラー魂':[['物理攻撃耐性',-1]],'バランス感覚':[['列攻撃耐性',2]],'立て直し':[['必殺技耐性',2]],\n  '冷静沈着':[['魔法攻撃耐性',2]],'戦況分析':[['全体攻撃耐性',2]]\n});\nfunction hasResistanceEffectName(name){\n  return Object.prototype.hasOwnProperty.call(STATIC_RESISTANCE_EFFECTS,String(name||''));\n}\nfunction normalizeExtraResistances(rows){\n  const out=[];\n  for(let i=0;i<(Array.isArray(rows)?rows.length:0);i++){\n    const row=rows[i]||{};\n    const type=String(row.type||'');\n    const value=Number(row.value);\n    if(!Object.prototype.hasOwnProperty.call(RESISTANCE_SCORE_RATES,type)||!Number.isFinite(value)||value===0) continue;\n    out.push({name:String(row.name||('追加耐性'+(i+1))),type,value});\n  }\n  return out;\n}\nfunction ceilResistanceTenth(percent){\n  if(!Number.isFinite(percent)) return 0;\n  const scaled=percent*10;\n  const nearest=Math.round(scaled);\n  if(Math.abs(scaled-nearest)<1e-9) return nearest/10;\n  return Math.ceil(scaled)/10;\n}\nfunction truncateScore(value){\n  if(!Number.isFinite(value)) return 0;\n  const nearest=Math.round(value);\n  if(Math.abs(value-nearest)<1e-9) return nearest;\n  return Math.trunc(value);\n}\nfunction addResistanceSource(byType,type,source,value){\n  if(!Object.prototype.hasOwnProperty.call(RESISTANCE_SCORE_RATES,type)) return;\n  if(!Number.isFinite(Number(value))||Number(value)===0) return;\n  let sources=byType.get(type);\n  if(!sources){sources=new Map();byType.set(type,sources);}\n  const key=String(source);\n  sources.set(key,Number(sources.get(key)||0)+Number(value));\n}\nfunction resistanceSourcesForBits(bits){\n  const byType=new Map();\n  const activeBits=bits??EMPTY_BITS;\n\n  if(job.value==='重戦士'){\n    addResistanceSource(byType,'物理攻撃耐性','job:重戦士',2);\n    addResistanceSource(byType,'魔法攻撃耐性','job:重戦士',2);\n  }\n\n  workerExtraResistances.forEach((row,index)=>{\n    addResistanceSource(byType,row.type,'extra:'+String(row.name||index),row.value);\n  });\n\n  for(const pair of RESISTANCE_PAIR_SOURCES){\n    const lowerIndex=specialNameIndex.get(pair.lower)??-1;\n    const upperIndex=specialNameIndex.get(pair.upper)??-1;\n    const upper=upperIndex>=0&&mixedIsAcquired(upperIndex,activeBits);\n    const lower=lowerIndex>=0&&mixedIsAcquired(lowerIndex,activeBits);\n    if(!upper&&!lower) continue;\n    const value=upper?pair.upperValue:pair.lowerValue;\n    const types=pair.types||[pair.type];\n    for(const type of types) addResistanceSource(byType,type,'special:'+pair.source,value);\n  }\n\n  for(const [name,effects] of Object.entries(RESISTANCE_DIRECT_EFFECTS)){\n    const index=specialNameIndex.get(name)??-1;\n    if(index<0||!mixedIsAcquired(index,activeBits)) continue;\n    for(const [type,value] of effects){\n      addResistanceSource(byType,type,'special:'+name,value);\n    }\n  }\n  return byType;\n}\nfunction resistanceScoreForBits(bits){\n  let total=0;\n  const byType=resistanceSourcesForBits(bits);\n  for(const [type,sources] of byType){\n    let remaining=1;\n    for(const value of sources.values()) remaining*=1-Number(value)/100;\n    const rawPercent=(1-remaining)*100;\n    const displayed=ceilResistanceTenth(rawPercent);\n    total+=truncateScore(displayed*Number(RESISTANCE_SCORE_RATES[type]||0));\n  }\n  return total;\n}\nfunction staticResistanceScoreForItems(items){\n  let total=0;\n  for(const item of items||[]){\n    if(item?.type!=='special') continue;\n    const name=String(D.special?.[Number(item.idx)]?.[1]||item.name||'');\n    for(const [type,value] of STATIC_RESISTANCE_EFFECTS[name]||[]){\n      total+=truncateScore(Number(value)*Number(RESISTANCE_SCORE_RATES[type]||0));\n    }\n  }\n  return total;\n}\nfunction dynamicSpecialGainForBits(beforeBits,opBits,items,staticScore){\n  const nonResistance=Number(staticScore||0)-staticResistanceScoreForItems(items);\n  const before=resistanceScoreForBits(beforeBits??EMPTY_BITS);\n  const after=resistanceScoreForBits((beforeBits??EMPTY_BITS)|(opBits??EMPTY_BITS));\n  return Math.round((nonResistance+(after-before))*10)/10;\n}\n// --- end resistance-aware scoring patch ---\n`,
'insert resistance engine');

    source=replaceOnce(source,
`function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}`,
`function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){let fixed=Number(s[fixedAddIndex()]||0); if(String(s[1])==='癒やしの心'&&job.value==='僧侶') fixed=90; return Math.round((fixed+hp*rate)*10)/10;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}`,
'癒しの心 score correction');

    source=replaceOnce(source,
`  if(score<=0){\n`,
`  if(score<=0 && !hasResistanceEffectName(String(s[1]))){\n`,
'allow dynamic resistance candidates');

    source=replaceOnce(source,
`    const cs=op0.costSum??costSum(op0.cost);\n    const eff=Number(op0.score||0)/Math.max(1,cs);\n    out.push({\n      ...op0,\n      kind:'special',\n      bits:opBits,\n      costSum:cs,\n      gain:Number(op0.score||0),\n      efficiency:eff,\n      isHpDependent:specialOptionIsHpDependent(op0)\n    });`,
`    const cs=op0.costSum??costSum(op0.cost);\n    const gain=dynamicSpecialGainForBits(st.bits??EMPTY_BITS,opBits,op0.items,Number(op0.score||0));\n    if(gain<=0) continue;\n    const eff=gain/Math.max(1,cs);\n    out.push({\n      ...op0,\n      kind:'special',\n      bits:opBits,\n      costSum:cs,\n      gain,\n      score:gain,\n      efficiency:eff,\n      isHpDependent:specialOptionIsHpDependent(op0)\n    });`,
'dynamic special gain');

    source=replaceOnce(source,
`    specialPart\n  ]);`,
`    specialPart,\n    (payload.extraResistances||[]).map(row=>[String(row?.name||''),String(row?.type||''),Number(row?.value||0)])\n  ]);`,
'worker config cache key');

    source=replaceOnce(source,
`  const nextConfigKey=__workerPayloadConfigKey(payload);\n`,
`  workerExtraResistances=normalizeExtraResistances(payload.extraResistances||[]);\n  const nextConfigKey=__workerPayloadConfigKey(payload);\n`,
'worker payload resistance input');

    (0,eval)(source+'\n//# sourceURL=pawaado_worker.resistance-patched.js');
    const handler=self.onmessage;
    for(const event of queued.splice(0)){
      if(typeof handler==='function') await handler.call(self,event);
    }
  })().catch(error=>{
    self.postMessage({
      type:'error',
      name:error?.name||'ResistancePatchError',
      message:error?.message||'耐性対応Workerの初期化に失敗しました。'
    });
  });
})();
