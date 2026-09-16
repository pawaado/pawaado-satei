from pathlib import Path

p=Path('pawaado_worker_resistance_v2.js')
s=p.read_text(encoding='utf-8')
start=s.index("    const resistanceEngine=`// --- resistance-aware scoring patch v2 ---")
end_marker="// --- end resistance-aware scoring patch v2 ---`;"
end=s.index(end_marker,start)+len(end_marker)

engine=r'''    const resistanceEngine=`// --- resistance-aware scoring patch v3 fast ---
let workerExtraResistances=[];
const RESISTANCE_SCORE_RATES=Object.freeze({
  '物理攻撃耐性':70,'魔法攻撃耐性':70,'必殺技耐性':33,'全体攻撃耐性':50,'単体攻撃耐性':70,
  '火属性耐性':70,'風属性耐性':70,'水属性耐性':70,'無属性耐性':70,'列攻撃耐性':50,
  'アクションスキル耐性':18,'ダメージ状態異常耐性':20,'弱体化状態異常耐性':20,'行動不能状態異常耐性':20
});
const staticResistanceScoreCache=new Map();
const affectedResistanceTypesCache=new Map();
const resistanceTypeScoreCache=new Map();
let resistanceRelevantMaskCache=null;
let resistanceTypeMetaCache=null;
let resistanceBaseRemainingCache=null;
// 既存loaderのpayload処理からclear()される互換facade。
const resistanceScoreCache={clear(){
  resistanceTypeScoreCache.clear();
  staticResistanceScoreCache.clear();
  affectedResistanceTypesCache.clear();
  resistanceBaseRemainingCache=null;
}};
const RESISTANCE_PAIR_SOURCES=Object.freeze([
  Object.freeze({lower:'物理防御○',upper:'物理防御◎',type:'物理攻撃耐性',lowerValue:2,upperValue:4,source:'物理防御'}),
  Object.freeze({lower:'魔法防御○',upper:'魔法防御◎',type:'魔法攻撃耐性',lowerValue:2,upperValue:4,source:'魔法防御'}),
  Object.freeze({lower:'ケガしにくさ○',upper:'ケガしにくさ◎',types:['物理攻撃耐性','魔法攻撃耐性'],lowerValue:1,upperValue:2,source:'ケガしにくさ'})
]);
const RESISTANCE_DIRECT_EFFECTS=Object.freeze({
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
const STATIC_RESISTANCE_EFFECTS=Object.freeze({
  '物理防御○':[['物理攻撃耐性',2]],'物理防御◎':[['物理攻撃耐性',2]],
  '魔法防御○':[['魔法攻撃耐性',2]],'魔法防御◎':[['魔法攻撃耐性',2]],
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
function truncateScore(value){
  if(!Number.isFinite(value)) return 0;
  const nearest=Math.round(value);
  if(Math.abs(value-nearest)<1e-9) return nearest;
  return Math.trunc(value);
}
function resistanceTypeMeta(){
  if(resistanceTypeMetaCache) return resistanceTypeMetaCache;
  const byType=new Map();
  const ensure=type=>{
    let meta=byType.get(type);
    if(!meta){meta={mask:EMPTY_BITS,sources:[]};byType.set(type,meta);}
    return meta;
  };
  for(const pair of RESISTANCE_PAIR_SOURCES){
    const li=specialNameIndex.get(pair.lower)??-1;
    const ui=specialNameIndex.get(pair.upper)??-1;
    const lb=li>=0?specialBit(li):EMPTY_BITS;
    const ub=ui>=0?specialBit(ui):EMPTY_BITS;
    const types=pair.types||[pair.type];
    for(const type of types){
      const meta=ensure(type);
      meta.mask|=lb|ub;
      meta.sources.push({kind:1,lb,ub,lo:pair.lowerValue,hi:pair.upperValue});
    }
  }
  for(const [name,effects] of Object.entries(RESISTANCE_DIRECT_EFFECTS)){
    const i=specialNameIndex.get(name)??-1;
    if(i<0) continue;
    const bit=specialBit(i);
    for(const [type,value] of effects){
      const meta=ensure(type);
      meta.mask|=bit;
      meta.sources.push({kind:0,bit,value:Number(value)});
    }
  }
  resistanceTypeMetaCache=byType;
  return byType;
}
function resistanceRelevantMask(){
  if(resistanceRelevantMaskCache!==null) return resistanceRelevantMaskCache;
  let mask=EMPTY_BITS;
  for(const meta of resistanceTypeMeta().values()) mask|=meta.mask;
  resistanceRelevantMaskCache=mask;
  return mask;
}
function resistanceBaseRemaining(){
  if(resistanceBaseRemainingCache) return resistanceBaseRemainingCache;
  const grouped=new Map();
  const add=(type,name,value)=>{
    let sources=grouped.get(type);
    if(!sources){sources=new Map();grouped.set(type,sources);}
    sources.set(name,Number(sources.get(name)||0)+Number(value));
  };
  if(job.value==='重戦士'){
    add('物理攻撃耐性','job:重戦士',2);
    add('魔法攻撃耐性','job:重戦士',2);
  }
  workerExtraResistances.forEach((row,index)=>add(row.type,'extra:'+String(row.name||index),row.value));
  const remaining=new Map();
  for(const [type,sources] of grouped){
    let r=1;
    for(const value of sources.values()) r*=1-Number(value)/100;
    remaining.set(type,r);
  }
  resistanceBaseRemainingCache=remaining;
  return remaining;
}
function resistanceTypeScoreForBits(type,bits){
  const meta=resistanceTypeMeta().get(type);
  const localBits=(bits??EMPTY_BITS)&(meta?.mask??EMPTY_BITS);
  let cache=resistanceTypeScoreCache.get(type);
  if(!cache){cache=new Map();resistanceTypeScoreCache.set(type,cache);}
  const cached=cache.get(localBits);
  if(cached!==undefined) return cached;
  let remaining=resistanceBaseRemaining().get(type)??1;
  if(meta){
    for(const src of meta.sources){
      let value=0;
      if(src.kind===1){
        if(src.ub!==EMPTY_BITS&&(localBits&src.ub)!==EMPTY_BITS) value=src.hi;
        else if(src.lb!==EMPTY_BITS&&(localBits&src.lb)!==EMPTY_BITS) value=src.lo;
      }else if((localBits&src.bit)!==EMPTY_BITS) value=src.value;
      if(value) remaining*=1-Number(value)/100;
    }
  }
  const displayed=ceilResistanceTenth((1-remaining)*100);
  const score=truncateScore(displayed*Number(RESISTANCE_SCORE_RATES[type]||0));
  cache.set(localBits,score);
  return score;
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
      total+=truncateScore(Number(value)*Number(RESISTANCE_SCORE_RATES[type]||0));
    }
  }
  staticResistanceScoreCache.set(cacheKey,total);
  return total;
}
function affectedResistanceTypesForItems(items,opRelevant){
  const cached=affectedResistanceTypesCache.get(opRelevant);
  if(cached) return cached;
  const set=new Set();
  for(const item of items||[]){
    if(item?.type!=='special') continue;
    const name=String(D.special?.[Number(item.idx)]?.[1]||item.name||'');
    for(const [type] of STATIC_RESISTANCE_EFFECTS[name]||[]) set.add(type);
  }
  const out=[...set];
  affectedResistanceTypesCache.set(opRelevant,out);
  return out;
}
function dynamicSpecialGainForBits(beforeBits,opBits,items,staticScore){
  const opRelevant=(opBits??EMPTY_BITS)&resistanceRelevantMask();
  if(opRelevant===EMPTY_BITS) return Number(staticScore||0);
  const nonResistance=Number(staticScore||0)-staticResistanceScoreForItems(items,opRelevant);
  const before=beforeBits??EMPTY_BITS;
  const after=before|opRelevant;
  let delta=0;
  for(const type of affectedResistanceTypesForItems(items,opRelevant)){
    delta+=resistanceTypeScoreForBits(type,after)-resistanceTypeScoreForBits(type,before);
  }
  return Math.round((nonResistance+delta)*10)/10;
}
// --- end resistance-aware scoring patch v2 ---`;'''

p.write_text(s[:start]+engine+s[end:],encoding='utf-8')
print('temporary v3 speed patch applied')
