from pathlib import Path
p=Path('pawaado_worker.js')
s=p.read_text(encoding='utf-8')

old_cache="""let mixedBasicOptionCache=new Map();
let mixedHpDeltaCache=new Map();
function clearMixedSearchCaches(){
  mixedBasicOptionCache.clear();
  mixedHpDeltaCache.clear();
}"""
new_cache="""let mixedBasicOptionCache=new Map();
let mixedHpDeltaCache=new Map();
let mixedSpecialTemplateCache=new Map();
function clearMixedSearchCaches(){
  mixedBasicOptionCache.clear();
  mixedHpDeltaCache.clear();
  mixedSpecialTemplateCache.clear();
}"""
if old_cache not in s: raise SystemExit('cache block not found')
s=s.replace(old_cache,new_cache,1)

start=s.index('function mixedSpecialActionsAtHp(st,exp,hp){')
out_marker='  const out=[];\n  for(const op0 of actions){'
out_pos=s.index(out_marker,start)
new_prefix=r'''function mixedSpecialTemplatesAtHp(hp){
  const key=String(hp);
  const cached=mixedSpecialTemplateCache.get(key);
  if(cached!==undefined) return cached;
  const templates=[];
  const used=new Set();
  for(let i=0;i<D.special.length;i++){
    if(used.has(i)) continue;
    const ui=upperIndex(i),li=lowerIndex(i);
    if(li>=0||ui<0) continue;
    used.add(i); used.add(ui);
    if(specialOwned(ui)) continue;
    const lowerBit=specialBit(i),upperBit=specialBit(ui);
    if(!specialOwned(i)){
      const lower=itemForSpecialIndex(i,hp,false);
      const upper=itemForSpecialIndex(ui,hp,true);
      const upperOnly=itemForSpecialIndex(ui,hp,false);
      if(lower) templates.push({op:{...lower,kind:'special'},mode:1,lowerBit,upperBit});
      if(upper) templates.push({op:{...upper,kind:'special'},mode:1,lowerBit,upperBit});
      if(upperOnly) templates.push({op:{...upperOnly,kind:'special'},mode:2,lowerBit,upperBit});
    }else{
      const upperOnly=itemForSpecialIndex(ui,hp,false);
      if(upperOnly) templates.push({op:{...upperOnly,kind:'special'},mode:3,lowerBit,upperBit});
    }
  }
  for(const names of mutualGroups){
    const idxs=names.map(n=>specialNameIndex.get(String(n))??-1).filter(i=>i>=0);
    idxs.forEach(i=>used.add(i));
    if(idxs.some(i=>specialOwned(i))) continue;
    let groupMask=EMPTY_BITS;
    for(const i of idxs) groupMask|=specialBit(i);
    for(const i of idxs){
      const op=itemForSpecialIndex(i,hp,false);
      if(op) templates.push({op:{...op,kind:'special'},mode:4,groupMask});
    }
  }
  for(let i=0;i<D.special.length;i++){
    if(used.has(i)||isUpperSpecial(i)||specialOwned(i)) continue;
    const op=itemForSpecialIndex(i,hp,false);
    if(op) templates.push({op:{...op,kind:'special'},mode:5,bit:specialBit(i)});
  }
  mixedSpecialTemplateCache.set(key,templates);
  return templates;
}
function mixedSpecialActionsAtHp(st,exp,hp){
  const actions=[];
  const active=st.bits??EMPTY_BITS;
  for(const t of mixedSpecialTemplatesAtHp(hp)){
    if(t.mode===1){
      if((active&(t.lowerBit|t.upperBit))!==EMPTY_BITS) continue;
    }else if(t.mode===2){
      if((active&t.lowerBit)===EMPTY_BITS||(active&t.upperBit)!==EMPTY_BITS) continue;
    }else if(t.mode===3){
      if((active&t.upperBit)!==EMPTY_BITS) continue;
    }else if(t.mode===4){
      if((active&t.groupMask)!==EMPTY_BITS) continue;
    }else if(t.mode===5){
      if((active&t.bit)!==EMPTY_BITS) continue;
    }
    actions.push(t.op);
  }

'''
s=s[:start]+new_prefix+s[out_pos:]

old_final=r'''  const all=normalActions.concat(hpActions);
  all.sort(mixedActionSort);

  // 同じ候補を重複登録しない。
  const deduped=[];
  const seen=new Set();
  for(const op of all){
    const sig=[
      op.kind,
      op.name||'',
      op.from??'',
      op.to??'',
      key(op.cost),
      bitsKey(op.bits??EMPTY_BITS),
      (op.items||EMPTY_ITEMS).map(x=>`${x.type}:${x.name}:${x.from??''}:${x.to??''}`).join('|')
    ].join('#');
    if(seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(op);
  }

  st._mixedActions=deduped;
  return deduped;'''
new_final=r'''  // 各生成経路は互いに一意なので、重い文字列signatureによるdedupは不要。
  // HP依存追加がなければnormalActionsは既にsort済み。
  const all=hpActions.length?normalActions.concat(hpActions):normalActions;
  if(hpActions.length) all.sort(mixedActionSort);
  st._mixedActions=all;
  return all;'''
if old_final not in s: raise SystemExit('candidate finalization block not found')
s=s.replace(old_final,new_final,1)

p.write_text(s,encoding='utf-8')
print('temporary template + lean-finalization patch applied')
