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
let mixedLimitsCache=null;
let mixedHpDependentMetaCache=null;
function clearMixedSearchCaches(){
  mixedBasicOptionCache.clear();
  mixedHpDeltaCache.clear();
  mixedSpecialTemplateCache.clear();
  mixedLimitsCache=null;
}
function mixedLimits(){
  if(mixedLimitsCache===null) mixedLimitsCache=limits();
  return mixedLimitsCache;
}"""
if old_cache not in s: raise SystemExit('cache block not found')
s=s.replace(old_cache,new_cache,1)

# Within mixed search, limits() is invariant for a calculation.
mixed_start=s.index('// v9.9: 本番用クリーン版')
idx=s.index('const lim=limits();',mixed_start)
s=s[:idx]+s[idx:].replace('const lim=limits();','const lim=mixedLimits();',1)
idx=s.index('const lim=limits();',idx+1)
s=s[:idx]+s[idx:].replace('const lim=limits();','const lim=mixedLimits();',1)

old_key="""function mixedStateKey(st){
  return key(st.cost)+'|'+mixedLevelsKey(st.levels)+'|'+bitsKey(st.bits??EMPTY_BITS)+'|d'+(st.dualLevel==null?'':Number(st.dualLevel).toString(36));
}"""
new_key="""function mixedStateKey(st){
  if(st._mixedStateKey!==undefined&&st._mixedStateKey!==null) return st._mixedStateKey;
  const value=key(st.cost)+'|'+mixedLevelsKey(st.levels)+'|'+bitsKey(st.bits??EMPTY_BITS)+'|d'+(st.dualLevel==null?'':Number(st.dualLevel).toString(36));
  st._mixedStateKey=value;
  return value;
}"""
if old_key not in s: raise SystemExit('mixedStateKey block not found')
s=s.replace(old_key,new_key,1)

# HP dependent delta only depends on the handful of HP-dependent special bits.
hp_start=s.index('function mixedHpDeltaForBits(')
hp_end=s.index('function mixedBasicActions(',hp_start)
new_hp=r'''function mixedHpDependentMeta(){
  if(mixedHpDependentMetaCache) return mixedHpDependentMetaCache;
  const indices=[];
  let mask=EMPTY_BITS;
  for(let i=0;i<D.special.length;i++){
    if(!Number(D.special[i]?.[11]||0)) continue;
    indices.push(i);
    mask|=specialBit(i);
  }
  mixedHpDependentMetaCache={indices,mask};
  return mixedHpDependentMetaCache;
}
function mixedHpDeltaForBits(bits,oldHp,newHp){
  if(oldHp===newHp) return 0;
  const meta=mixedHpDependentMeta();
  const relevantBits=(bits??EMPTY_BITS)&meta.mask;
  const cacheKey=`${bitsKey(relevantBits)}|${oldHp}|${newHp}`;
  if(mixedHpDeltaCache.has(cacheKey)) return mixedHpDeltaCache.get(cacheKey);
  let delta=0;
  for(const i of meta.indices){
    if(!mixedIsAcquired(i,relevantBits)) continue;
    const skill=D.special[i];
    delta+=skillScore(skill,newHp)-skillScore(skill,oldHp);
  }
  const result=Math.round(delta*10)/10;
  mixedHpDeltaCache.set(cacheKey,result);
  return result;
}
'''
s=s[:hp_start]+new_hp+s[hp_end:]

# Cache HP-specific special templates, then filter only by the state's acquired bits.
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

# Avoid temporary cost arrays in hot feasibility checks.
old_special="""    const nc=addCost(st.cost,op0.cost);
    if(!leq(nc,exp)) continue;

    const cs=op0.costSum??costSum(op0.cost);"""
new_special="""    if(st.cost[0]+op0.cost[0]>exp[0]||st.cost[1]+op0.cost[1]>exp[1]||
       st.cost[2]+op0.cost[2]>exp[2]||st.cost[3]+op0.cost[3]>exp[3]||
       st.cost[4]+op0.cost[4]>exp[4]) continue;

    const cs=op0.costSum??costSum(op0.cost);"""
if old_special not in s: raise SystemExit('special feasibility block not found')
s=s.replace(old_special,new_special,1)
old_basic="""      const nc=addCost(st.cost,op.cost);
      if(!leq(nc,exp)) continue;

      let gain=op.score;"""
new_basic="""      if(st.cost[0]+op.cost[0]>exp[0]||st.cost[1]+op.cost[1]>exp[1]||
         st.cost[2]+op.cost[2]>exp[2]||st.cost[3]+op.cost[3]>exp[3]||
         st.cost[4]+op.cost[4]>exp[4]) continue;

      let gain=op.score;"""
if old_basic not in s: raise SystemExit('basic feasibility block not found')
s=s.replace(old_basic,new_basic,1)

# Replace candidate assembly with an equivalent version that avoids duplicate filtering and a second sort
# in the common no-life-candidate path.
cand_start=s.index('function mixedCandidateActions(st,exp){')
cand_end=s.index('function mixedProjectedScore(',cand_start)
new_candidate=r'''function mixedCandidateActions(st,exp){
  if(st._mixedActions) return st._mixedActions;

  const basicActions=mixedBasicActions(st,exp);
  const currentHp=currentHpForLife(st.levels[0]);
  const currentSpecials=mixedSpecialActionsAtHp(st,exp,currentHp);
  const normalActions=basicActions.slice();
  const currentHpActions=[];
  for(const op of currentSpecials){
    if(op.isHpDependent) currentHpActions.push(op);
    else normalActions.push(op);
  }
  const dualAction=mixedDualAction(st,exp);
  if(dualAction) normalActions.push(dualAction);
  normalActions.sort(mixedActionSort);

  const branch=MIXED_BRANCH_NORMAL;
  const lifeTopActions=[];
  for(let i=0;i<normalActions.length&&i<branch;i++){
    const op=normalActions[i];
    if(op.kind==='basic'&&op.name==='生命力') lifeTopActions.push(op);
  }

  let all;
  if(!lifeTopActions.length){
    if(!currentHpActions.length){
      all=normalActions;
    }else{
      const merged=normalActions.concat(currentHpActions);
      merged.sort(mixedActionSort);
      const selectedHp=new Set();
      for(let i=0;i<merged.length&&i<branch;i++){
        if(merged[i].isHpDependent) selectedHp.add(merged[i]);
      }
      if(!selectedHp.size){
        all=normalActions;
      }else{
        all=[];
        for(const op of merged){
          if(!op.isHpDependent||selectedHp.has(op)) all.push(op);
        }
      }
    }
  }else{
    const hpActions=[];
    for(const lifeOp of lifeTopActions){
      const futureHp=currentHpForLife(lifeOp.to);
      const futureState={...st,levels:st.levels.slice()};
      futureState.levels[0]=lifeOp.to;
      const futureSpecials=mixedSpecialActionsAtHp(futureState,exp,futureHp)
        .filter(op=>op.isHpDependent);
      const setCandidates=[];
      for(const hpOp of futureSpecials){
        const combinedCost=addCost(st.cost,addCost(lifeOp.cost,hpOp.cost));
        if(!leq(combinedCost,exp)) continue;
        setCandidates.push(mixedBuildLifeHpSetAction(st,lifeOp,hpOp));
      }
      if(setCandidates.length){
        const comparison=normalActions.concat(setCandidates);
        comparison.sort(mixedActionSort);
        for(let i=0;i<comparison.length&&i<branch;i++){
          if(comparison[i].kind==='life_hp_set') hpActions.push(comparison[i]);
        }
      }
    }
    all=hpActions.length?normalActions.concat(hpActions):normalActions;
    if(hpActions.length) all.sort(mixedActionSort);
  }

  st._mixedActions=all;
  return all;
}
'''
s=s[:cand_start]+new_candidate+s[cand_end:]

p.write_text(s,encoding='utf-8')
print('temporary optimized candidate/HP patch applied')
