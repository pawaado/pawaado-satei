from pathlib import Path
import re

VERSION='20260904-dual-stack-2'

p=Path('academy_runtime.js')
s=p.read_text()

start=s.index('    function dualRow(){')
end=s.index("    document.addEventListener('click',event=>{", start)

new_block = '''    function dualBaseRow(){return document.querySelector(`.skill-row[data-index="${DUAL_INDEX}"]`);}
    function clearDualLevelRows(){document.querySelectorAll('.dual-attack-row[data-dual-level]').forEach(row=>row.remove());}

    function renderDualRows(){
      const base=dualBaseRow();
      if(!base) return;
      clearDualLevelRows();
      // data.js上のダミー行は計算用識別子としてだけ残し、画面では専用Lv行に置き換える。
      base.style.display='none';
      if(!isDual()) return;

      const maxShown=Math.min(DUAL.maxLevel,dualLevel>=DUAL.maxLevel?DUAL.maxLevel:dualLevel+1);
      let anchor=base;
      for(let level=DUAL.initialLevel+1;level<=maxShown;level++){
        const owned=level<=dualLevel;
        const row=document.createElement('div');
        row.className=`skill-row dual-attack-row${owned?' owned':''}`;
        row.dataset.dualLevel=String(level);
        row.innerHTML=`
          <button type="button" class="hint-btn dual-hint-btn" data-dual-action="hint" aria-label="通常攻撃のコツレベルを設定する">${dualHint>0?`Lv${dualHint}`:'＋'}</button>
          <button type="button" class="name-btn dual-level-label" data-dual-action="acquire" aria-label="通常攻撃Lv${level}${owned?'の取得済みを解除する':'を取得する'}">
            <span class="dual-level-text"><span>${DUAL.skillName}</span><span class="dual-level-badge">Lv${level}</span></span>${owned?'<span class="owned-label">✓取得済</span>':''}
          </button>
          <div class="dual-level-error" role="alert" aria-live="polite">${(!owned && level===dualLevel+1)?dualError:''}</div>`;
        anchor.insertAdjacentElement('afterend',row);
        anchor=row;
      }
    }

    function setDualLevel(next){
      dualLevel=Math.max(DUAL.initialLevel,Math.min(DUAL.maxLevel,Number(next)||DUAL.initialLevel));
      dualError='';
      renderDualRows();
    }
    function tryAcquireLevel(level){
      const target=Number(level);
      if(target<=dualLevel){
        // 下位Lvを解除したら、その上位Lvもまとめて解除する。
        setDualLevel(target-1);
        return;
      }
      if(target!==dualLevel+1 || target>DUAL.maxLevel) return;
      const req=requiredDex(target);
      const dex=dexValue();
      if(dex<req){
        dualError=`取得条件を満たしていません（器用さ${req}以上が必要です）。`;
        renderDualRows();
        return;
      }
      setDualLevel(target);
    }

'''
s=s[:start]+new_block+s[end:]

old='''      const row=button.closest(`.skill-row[data-index="${DUAL_INDEX}"]`);
      if(row){
        event.preventDefault();event.stopImmediatePropagation();
        const action=button.dataset.dualAction;
        if(action==='hint'){cycleDualHint();dualError='';renderDualRow();}
        else if(action==='acquire') tryAcquireNext();
        return;
      }'''
new='''      const row=button.closest('.dual-attack-row[data-dual-level]');
      if(row){
        event.preventDefault();event.stopImmediatePropagation();
        const action=button.dataset.dualAction;
        const level=Number(row.dataset.dualLevel||0);
        if(action==='hint'){
          cycleDualHint();dualError='';renderDualRows();
        }else if(action==='acquire'){
          tryAcquireLevel(level);
        }
        return;
      }'''
assert old in s, 'dual click handler anchor not found'
s=s.replace(old,new,1)

s=s.replace('renderDualRow();','renderDualRows();')

old='''    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      queueMicrotask(()=>{queued=false;syncJobLabel();syncTheme();renderDualRows();});
    });
    const specialList=document.getElementById('specialList');
    // specialList直下の再描画だけを監視する。subtree監視は双剣士行自身の更新を拾って無限ループになるため使わない。
    if(specialList) observer.observe(specialList,{childList:true});'''
new='''    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      queueMicrotask(()=>{
        queued=false;
        observer.disconnect();
        syncJobLabel();syncTheme();renderDualRows();
        if(specialList) observer.observe(specialList,{childList:true});
      });
    });
    const specialList=document.getElementById('specialList');
    // 通常の特殊能力一覧が再描画された時だけ拾い、専用Lv行の再構築中は監視を止める。
    if(specialList) observer.observe(specialList,{childList:true});'''
assert old in s, 'observer anchor not found'
s=s.replace(old,new,1)

s=re.sub(r'academy_runtime\.js\?v=[^\'\"]+',f'academy_runtime.js?v={VERSION}',s)
p.write_text(s)

p=Path('index.html')
s=p.read_text()
s=re.sub(r'academy_runtime\.js\?v=[^\"]+',f'academy_runtime.js?v={VERSION}',s)
p.write_text(s)

s=Path('academy_runtime.js').read_text()
assert 'function renderDualRows()' in s
assert 'data-dual-level' in s
assert 'setDualLevel(target-1)' in s
assert 'tryAcquireLevel(level)' in s
assert 'renderDualRow();' not in s
assert 'observer.disconnect();' in s
assert 'function tryAcquireNext()' not in s
i=Path('index.html').read_text()
assert f'academy_runtime.js?v={VERSION}' in i
print('stacked dual UI patch OK')
