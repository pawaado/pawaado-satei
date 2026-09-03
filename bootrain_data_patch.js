(function(root){
  const D=root && root.PAWAADO_DATA;
  if(!D || D.__bootrainDataPatched) return;

  Object.defineProperty(D,'__bootrainDataPatched',{value:true,writable:true,configurable:true,enumerable:false});

  const academyName='ブートレインアカデミー';
  const dualInternalJob='弓使い'; // UI上では「双剣士」と表示。既存計算では物理職として扱う。

  function upsertAcademy(job,limits){
    const row=[academyName,job].concat(limits);
    const idx=D.academies.findIndex(r=>r[0]===academyName && r[1]===job);
    if(idx>=0) D.academies[idx]=row;
    else D.academies.push(row);
  }

  function upsertRange(table,row){
    if(!Array.isArray(table)) return;
    const idx=table.findIndex(r=>String(r[0])===String(row[0]));
    if(idx>=0) table[idx]=row;
    else table.push(row);
  }

  // ブートレインアカデミー
  upsertAcademy('剣士',[105,105,60,90,95,95]);
  upsertAcademy('重戦士',[120,70,65,65,115,115]);
  upsertAcademy('魔法使い',[95,65,115,105,75,95]);
  upsertAcademy(dualInternalJob,[110,115,60,120,100,95]);

  // 最新アカデミーなので選択肢の一番上へ。
  const bootrainRows=D.academies.filter(r=>r[0]===academyName);
  const otherAcademyRows=D.academies.filter(r=>r[0]!==academyName);
  D.academies.splice(0,D.academies.length,...bootrainRows,...otherAcademyRows);

  // 生命力：査定値＝基礎HP増加量。
  // 既存100→105もHP増加（1あたり+90）と一致するよう査定値だけ補正する。
  const life100=D.life.find(r=>String(r[0])==='100→105');
  if(life100){
    life100[1]=450;
    life100[2]=90;
  }
  upsertRange(D.life,['105→109',360,90,100,0,0,30,90]);
  upsertRange(D.life,['109→110',125,125,100,0,0,30,90]);
  upsertRange(D.life,['110→119',810,90,100,0,0,30,90]);
  upsertRange(D.life,['119→120',125,125,100,0,0,30,90]);

  // 基礎HP（生命力査定と同値で増加）
  const hpMap=new Map((D.hp||[]).map(r=>[Number(r[0]),Number(r[1])]));
  let hp=hpMap.get(105);
  if(!Number.isFinite(hp)) hp=3120;
  const hpIncrements=[];
  for(let v=106;v<=109;v++) hpIncrements.push([v,90]);
  hpIncrements.push([110,125]);
  for(let v=111;v<=119;v++) hpIncrements.push([v,90]);
  hpIncrements.push([120,125]);
  for(const [value,inc] of hpIncrements){
    hp+=inc;
    hpMap.set(value,hp);
  }
  D.hp=[...hpMap.entries()].sort((a,b)=>a[0]-b[0]);

  // 魔力：110→115は魔法使い・魔闘士・僧侶のみで利用される魔法職査定。
  upsertRange(D.magicCost,['110→115',0,50,0,120,40]);
  upsertRange(D.magicMagicScore,['110→115',580,116]);

  // 器用さ：双剣士上限120対応。
  upsertRange(D.dexCost,['115→119',0,60,120,30,0]);
  upsertRange(D.dexCost,['119→120',0,60,120,30,0]);
  upsertRange(D.dexScore,['115→119',384,96]);
  upsertRange(D.dexScore,['119→120',108,108]);

  // 耐久力：105→115対応。
  upsertRange(D.staminaCost,['105→109',20,110,50,0,0]);
  upsertRange(D.staminaCost,['109→110',20,110,50,0,0]);
  upsertRange(D.staminaCost,['110→115',20,110,50,0,0]);
  upsertRange(D.staminaScore,['105→109',304,76]);
  upsertRange(D.staminaScore,['109→110',93,93]);
  upsertRange(D.staminaScore,['110→115',380,76]);

  // 精神力：100→115対応。
  upsertRange(D.mentalCost,['100→109',0,0,0,60,120]);
  upsertRange(D.mentalCost,['109→110',0,0,0,60,120]);
  upsertRange(D.mentalCost,['110→115',0,0,0,60,120]);
  upsertRange(D.mentalScore,['100→109',684,76]);
  upsertRange(D.mentalScore,['109→110',93,93]);
  upsertRange(D.mentalScore,['110→115',380,76]);

  // 双剣士専用「通常攻撃」の現在Lv入力用ダミー行。
  // 査定・コストは0にし、実際のLv2〜6計算はbootrain_patch.js側で行う。
  const dualSkillName='通常攻撃(双剣士)';
  let dualIndex=D.special.findIndex(s=>String(s[1])===dualSkillName);
  if(dualIndex<0){
    D.special.push([999,dualSkillName,null,0,0,0,0,0,0,0,0,0,0,0,0,'双剣士専用。Lv1は初期取得済で、Lv2以降を順番に取得する。']);
    dualIndex=D.special.length-1;
  }
  Object.defineProperty(D,'__dualAttackIndex',{value:dualIndex,writable:true,configurable:true,enumerable:false});
  Object.defineProperty(D,'__bootrainAcademyName',{value:academyName,writable:true,configurable:true,enumerable:false});
  Object.defineProperty(D,'__dualInternalJob',{value:dualInternalJob,writable:true,configurable:true,enumerable:false});
})(typeof window!=='undefined'?window:self);
