/* PowerAd resistance-aware worker loader v2 */
(() => {
  'use strict';

  const queued=[];
  self.onmessage=event=>queued.push(event);

  const replaceOnce=(source,needle,replacement,label)=>{
    const index=source.indexOf(needle);
    if(index<0) throw new Error(`耐性対応パッチの適用に失敗しました: ${label}`);
    return source.slice(0,index)+replacement+source.slice(index+needle.length);
  };

  (async()=>{
    const response=await fetch('./pawaado_worker.js?v=20260921-total-score-floor-1',{cache:'default'});
    if(!response.ok) throw new Error(`計算Workerの読み込みに失敗しました (${response.status})`);
    let source=await response.text();

    const resistanceEngine=`// --- resistance-aware scoring patch v2 ---
let workerExtraResistances=[];
const RESISTANCE_SCORE_RATES=Object.freeze({
  '物理攻撃耐性':70,'魔法攻撃耐性':70,'必殺技耐性':33,'全体攻撃耐性':50,'単体攻撃耐性':70,
  '火属性耐性':70,'風属性耐性':70,'水属性耐性':70,'無属性耐性':70,'列攻撃耐性':50,
  'アクションスキル耐性':18,'ダメージ状態異常耐性':20,'弱体化状態異常耐性':20,'行動不能状態異常耐性':20
});
const resistanceScoreCache=new Map();
const staticResistanceScoreCache=new Map();
let resistanceRelevantMaskCache=null;
const RESISTANCE_PAIR_SOURCES=Object.freeze([
  Object.freeze({lower:'物理防御○',upper:'物理防御◎',type:'物理攻撃耐性',lowerValue:2,upperValue:4,source:'物理防御'}),
  Object.freeze({lower:'魔法防御○',upper:'魔法防御◎',type:'魔法攻撃耐性',lowerValue:2,upperValue:4,source:'魔法防御'}),
  Object.freeze({lower:'ケガしにくさ○',upper:'ケガしにくさ◎',types:['物理攻撃耐性','魔法攻撃耐性'],lowerValue:1,upperValue:2,source:'ケガしにくさ'})
]);
const RESISTANCE_DIRECT_EFFECTS=Object.freeze({
  '局所防衛':[['単体攻撃耐性',1]],
  '再生学':[['アクションスキル耐性',4]],
  '生命管理':[['ダメージ状態異常耐性',2]],
  '体幹':[['物理攻撃耐性',1]],
  '魔力制御':[['魔法攻撃耐性',1]],
  '柔軟な体':[['物理攻撃耐性',4]],
  '無心の構え':[['魔法攻撃耐性',4]],
  '火耐性':[['火属性耐性',2]],
  '風耐性':[['風属性耐性',2]],
  '水耐性':[['水属性耐性',2]],
  '無耐性':[['無属性耐性',2]],
  'がむしゃら':[['物理攻撃耐性',-2],['魔法攻撃耐性',-2]],
  '防御態勢':[['単体攻撃耐性',2]],
  '備え':[['列攻撃耐性',2]],
  '広い視野':[['全体攻撃耐性',2]],
  '見切り':[['アクションスキル耐性',4]],
  '危機察知':[['必殺技耐性',4]],
  '力学の理解':[['物理攻撃耐性',4]],
  '魔法の理解':[['魔法攻撃耐性',4]],
  '免疫強化':[['ダメージ状態異常耐性',2]],
  '意志':[['弱体化状態異常耐性',2]],
  'ガッツ':[['行動不能状態異常耐性',2]],
  'ヒーラー魂':[['物理攻撃耐性',-1]],
  'バランス感覚':[['列攻撃耐性',2]],
  '立て直し':[['必殺技耐性',2]],
  '冷静沈着':[['魔法攻撃耐性',2]],
  '戦況分析':[['全体攻撃耐性',2]]
});
// data.jsの査定から単独取得時の耐性部分だけを外し、実際の耐性増減分に差し替える。
// ◎は○取得後の追加分なので、静的査定からは追加分だけを差し引く。
const STATIC_RESISTANCE_EFFECTS=Object.freeze({
  '物理防御○':[['物理攻撃耐性',2]],'物理防御◎':[['物理攻撃耐性',2]],
  '魔法防御○':[['魔法攻撃耐性',2]],'魔法防御◎':[['魔法攻撃耐性',2]],
  '局所防衛':[['単体攻撃耐性',1]],
  '再生学':[['アクションスキル耐性',4]],
  '生命管理':[['ダメージ状態異常耐性',2]],
  '体幹':[['物理攻撃耐性',1]],'魔力制御':[['魔法攻撃耐性',1]],
  '柔軟な体':[['物理攻撃耐性',4]],'無心の構え':[['魔法攻撃耐性',4]],
  '火耐性':[['火属性耐性',2]],'風耐性':[['風属性耐性',2]],'水耐性':[['水属性耐性',2]],'無耐性':[['無属性耐性',2]],
  'がむしゃら':[['物理攻撃耐性',-2],['魔法攻撃耐性',-2]],
  'ケガしにくさ○':[['物理攻撃耐性',1],['魔法攻撃耐性',1]],
  'ケガしにくさ◎':[['物理攻撃耐性',1],['魔法攻撃耐性',1]],
  '防御態勢':[['単体攻撃耐性',2]],'備え':[['列攻撃耐性',2]],'広い視野':[['全体攻撃耐性',2]],
  '見切り':[['アクションスキル耐性',4]],'危機察知':[['必殺技耐性',4]],
  '力学の理解':[['物理攻撃耐性',4]],'魔法の理解':[['魔法攻撃耐性',4]],
  '免疫強化':[['ダメージ状態異常耐性',2]],'意志':[['弱体化状態異常耐性',2]],'ガッツ':[['行動不能状態異常耐性',2]],
  'ヒーラー魂':[['物理攻撃耐性',-1]],'バランス感覚':[['列攻撃耐性',2]],'立て直し':[['必殺技耐性',2]],
  '冷静沈着':[['魔法攻撃耐性',2]],'戦況分析':[['全体攻撃耐性',2]]
});
function hasResistanceEffectName(name){
  return Object.prototype.hasOwnProperty.call(STATIC_RESISTANCE_EFFECTS,String(name||''));
}
function resistanceRelevantMask(){
  if(resistanceRelevantMaskCache!==null) return resistanceRelevantMaskCache;
  let mask=EMPTY_BITS;
  for(const name of Object.keys(STATIC_RESISTANCE_EFFECTS)){
    const index=specialNameIndex.get(name)??-1;
    if(index>=0) mask|=specialBit(index);
  }
  resistanceRelevantMaskCache=mask;
  return mask;
}
function normalizeExtraResistances(rows){
  const out=[];
  for(let i=0;i<(Array.isArray(rows)?rows.length:0);i++){
    const row=rows[i]||{};
    const type=String(row.type||'');
    const value=Number(row.value);
    if(!Object.prototype.hasOwnProperty.call(RESISTANCE_SCORE_RATES,type)||!Number.isFinite(value)||value===0) continue;
    out.push({name:String(row.name||('追加耐性'+(i+1))),type,value});
  }
  return out;
}
function ceilResistanceTenth(percent){
  if(!Number.isFinite(percent)) return 0;
  const scaled=percent*10;
  const nearest=Math.round(scaled);
  if(Math.abs(scaled-nearest)<1e-9) return nearest/10;
  return Math.ceil(scaled)/10;
}
function addResistanceSource(byType,type,sourceName,value){
  if(!Object.prototype.hasOwnProperty.call(RESISTANCE_SCORE_RATES,type)) return;
  if(!Number.isFinite(Number(value))||Number(value)===0) return;
  let sources=byType.get(type);
  if(!sources){sources=new Map();byType.set(type,sources);}
  const key=String(sourceName);
  sources.set(key,Number(sources.get(key)||0)+Number(value));
}
function resistanceSourcesForBits(bits){
  const byType=new Map();
  const activeBits=bits??EMPTY_BITS;

  // 重戦士は職業デフォルトで物理・魔法攻撃耐性を各2%所持。
  if(job.value==='重戦士'){
    addResistanceSource(byType,'物理攻撃耐性','job:重戦士',2);
    addResistanceSource(byType,'魔法攻撃耐性','job:重戦士',2);
  }

  // 超特殊能力そのものの査定は加算せず、既に所持している耐性としてのみ使う。
  workerExtraResistances.forEach((row,index)=>{
    addResistanceSource(byType,row.type,'extra:'+String(row.name||index),row.value);
  });

  for(const pair of RESISTANCE_PAIR_SOURCES){
    const lowerIndex=specialNameIndex.get(pair.lower)??-1;
    const upperIndex=specialNameIndex.get(pair.upper)??-1;
    const upper=upperIndex>=0&&mixedIsAcquired(upperIndex,activeBits);
    const lower=lowerIndex>=0&&mixedIsAcquired(lowerIndex,activeBits);
    if(!upper&&!lower) continue;
    const value=upper?pair.upperValue:pair.lowerValue;
    const types=pair.types||[pair.type];
    for(const type of types) addResistanceSource(byType,type,'special:'+pair.source,value);
  }

  for(const [name,effects] of Object.entries(RESISTANCE_DIRECT_EFFECTS)){
    const index=specialNameIndex.get(name)??-1;
    if(index<0||!mixedIsAcquired(index,activeBits)) continue;
    for(const [type,value] of effects) addResistanceSource(byType,type,'special:'+name,value);
  }
  return byType;
}
function resistanceScoreForBits(bits){
  // 耐性に無関係な特殊能力ビットは捨ててキャッシュを共有する。
  const cacheKey=(bits??EMPTY_BITS)&resistanceRelevantMask();
  if(resistanceScoreCache.has(cacheKey)) return resistanceScoreCache.get(cacheKey);
  let total=0;
  const byType=resistanceSourcesForBits(cacheKey);
  for(const [type,sources] of byType){
    let remaining=1;
    for(const value of sources.values()) remaining*=1-Number(value)/100;
    const rawPercent=(1-remaining)*100;
    const displayed=ceilResistanceTenth(rawPercent);
    total+=displayed*Number(RESISTANCE_SCORE_RATES[type]||0);
  }
  resistanceScoreCache.set(cacheKey,total);
  return total;
}
function staticResistanceScoreForItems(items,relevantBits=null){
  const cacheKey=relevantBits===null
    ? (specialItemsBits(items||[])&resistanceRelevantMask())
    : relevantBits;
  const cached=staticResistanceScoreCache.get(cacheKey);
  if(cached!==undefined) return cached;
  let total=0;
  for(const item of items||[]){
    if(item?.type!=='special') continue;
    const name=String(D.special?.[Number(item.idx)]?.[1]||item.name||'');
    for(const [type,value] of STATIC_RESISTANCE_EFFECTS[name]||[]){
      total+=Number(value)*Number(RESISTANCE_SCORE_RATES[type]||0);
    }
  }
  staticResistanceScoreCache.set(cacheKey,total);
  return total;
}
function dynamicSpecialGainForBits(beforeBits,opBits,items,staticScore){
  const relevantMask=resistanceRelevantMask();
  const opRelevant=(opBits??EMPTY_BITS)&relevantMask;
  // 耐性影響能力を含まない候補は従来査定をそのまま返す。
  if(opRelevant===EMPTY_BITS) return Number(staticScore||0);
  const nonResistance=Number(staticScore||0)-staticResistanceScoreForItems(items,opRelevant);
  const before=resistanceScoreForBits(beforeBits??EMPTY_BITS);
  const after=resistanceScoreForBits((beforeBits??EMPTY_BITS)|opRelevant);
  return nonResistance+(after-before);
}
// --- end resistance-aware scoring patch v2 ---`;

    source=replaceOnce(
      source,
      `let cancelRequested=false;\n`,
      `let cancelRequested=false;\n\n${resistanceEngine}\n`,
      'insert resistance engine v2'
    );

    source=replaceOnce(
      source,
      `function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){const fixed=Number(s[fixedAddIndex()]||0); return fixed+hp*rate;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}`,
      `function skillScore(s,hp){const rate=Number(s[11]||0); if(rate){let fixed=Number(s[fixedAddIndex()]||0); if(String(s[1])==='癒やしの心'&&job.value==='僧侶') fixed=90; return fixed+hp*rate;} const v=s[jobScoreIndex()]; if(v==='HP依存') return 0; return Number(v||0);}`,
      '癒しの心 score correction'
    );

    source=replaceOnce(
      source,
      `  if(score<=0){\n`,
      `  if(score<=0 && !hasResistanceEffectName(String(s[1]))){\n`,
      'allow dynamic resistance candidates'
    );

    source=replaceOnce(
      source,
`    const cs=op0.costSum??costSum(op0.cost);
    const eff=Number(op0.score||0)/Math.max(1,cs);
    out.push({
      ...op0,
      kind:'special',
      bits:opBits,
      costSum:cs,
      gain:Number(op0.score||0),
      efficiency:eff,
      isHpDependent:specialOptionIsHpDependent(op0)
    });`,
`    const cs=op0.costSum??costSum(op0.cost);
    const gain=dynamicSpecialGainForBits(st.bits??EMPTY_BITS,opBits,op0.items,Number(op0.score||0));
    if(gain<=0) continue;
    const eff=gain/Math.max(1,cs);
    out.push({
      ...op0,
      kind:'special',
      bits:opBits,
      costSum:cs,
      gain,
      score:gain,
      efficiency:eff,
      isHpDependent:specialOptionIsHpDependent(op0)
    });`,
      'dynamic special gain v2'
    );

    source=replaceOnce(
      source,
`    specialPart
  ]);`,
`    specialPart,
    (payload.extraResistances||[]).map(row=>[String(row?.name||''),String(row?.type||''),Number(row?.value||0)])
  ]);`,
      'worker config cache key'
    );

    source=replaceOnce(
      source,
`  const nextConfigKey=__workerPayloadConfigKey(payload);
`,
`  workerExtraResistances=normalizeExtraResistances(payload.extraResistances||[]);
  resistanceScoreCache.clear();
  const nextConfigKey=__workerPayloadConfigKey(payload);
`,
      'worker payload resistance input'
    );

    (0,eval)(source+'\n//# sourceURL=pawaado_worker.resistance-v2-patched.js');
    const handler=self.onmessage;
    for(const event of queued.splice(0)){
      if(typeof handler==='function') await handler.call(self,event);
    }
  })().catch(error=>{
    self.postMessage({
      type:'error',
      name:error?.name||'ResistancePatchError',
      message:error?.message||String(error)
    });
  });
})();
