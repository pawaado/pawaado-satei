from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import os,time,re

VARIANT=os.environ.get('VARIANT','unknown')
opts=Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=430,932')

EXP={'筋力':720,'敏捷':610,'技術':780,'知力':930,'精神':760}
BASIC={'生命力':38,'パワー':12,'魔力':45,'器用さ':24,'耐久力':28,'精神力':52}
HINTS={
  '魔法防御○':2,
  '魔力制御':3,
  '無心の構え':1,
  'ケガしにくさ○':2,
  '魔法の理解':4,
  '冷静沈着':1,
  '見切り':2,
  'ガッツ':1,
}

def dispatch_value(driver,el_id,value):
    driver.execute_script("""
      const el=document.getElementById(arguments[0]);
      el.value=String(arguments[1]);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    """,el_id,value)

def set_extra(driver,group_index,type_name,value):
    driver.execute_script("""
      const groups=[...document.querySelectorAll('.extra-resistance-group')];
      const g=groups[arguments[0]];
      if(!g) throw new Error('extra group missing '+arguments[0]);
      const sel=g.querySelector('.extra-resistance-type');
      const val=g.querySelector('.extra-resistance-value');
      sel.value=arguments[1];
      sel.dispatchEvent(new Event('change',{bubbles:true}));
      val.value=String(arguments[2]);
      val.dispatchEvent(new Event('input',{bubbles:true}));
    """,group_index,type_name,value)

def load_case(driver,wait,extras=False):
    driver.get('http://127.0.0.1:8000/index.html')
    wait.until(lambda d:d.execute_script("return document.readyState")=='complete')
    driver.execute_script("""
      const a=document.getElementById('academy');
      a.value='ブートレインアカデミー';
      a.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.12)
    driver.execute_script("""
      const j=document.getElementById('job');
      j.value='魔法使い';
      j.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.2)
    for n,v in EXP.items(): dispatch_value(driver,f'exp_0_{n}',v)
    for n,v in BASIC.items(): dispatch_value(driver,f'basic_{n}',v)
    for name,lv in HINTS.items():
        ok=driver.execute_script("""
          const target=arguments[0], count=arguments[1];
          const rows=[...document.querySelectorAll('#specialList .skill-row')];
          const row=rows.find(r=>r.querySelector('.skill-name-text')?.textContent.trim()===target);
          if(!row) return false;
          const b=row.querySelector('[data-kind="special-hint"]');
          for(let i=0;i<count;i++) b.click();
          return true;
        """,name,lv)
        if not ok: raise RuntimeError('hint row not found: '+name)
    if extras:
        set_extra(driver,0,'魔法攻撃耐性',17)
        driver.execute_script("document.getElementById('addExtraResistanceBtn').click()")
        set_extra(driver,1,'全体攻撃耐性',12)
        driver.execute_script("document.getElementById('addExtraResistanceBtn').click()")
        set_extra(driver,2,'アクションスキル耐性',8)

def run_case(label,extras=False):
    driver=webdriver.Chrome(options=opts)
    wait=WebDriverWait(driver,120)
    try:
        load_case(driver,wait,extras)
        before=driver.find_element('id','result').text
        t0=time.perf_counter()
        driver.execute_script("document.getElementById('calcBtn').click()")
        wait.until(lambda d: (
            d.execute_script("return !document.getElementById('calcBtn').disabled") and
            '査定上昇量' in d.find_element('id','result').text and
            d.find_element('id','result').text != before
        ))
        elapsed=time.perf_counter()-t0
        text=driver.find_element('id','result').text
        m=re.search(r'査定上昇量\s*\+?([0-9.]+)',text)
        score=m.group(1) if m else 'N/A'
        normalized=' | '.join(x.strip() for x in text.splitlines() if x.strip())
        print(f'PRECISION {VARIANT} {label}: {elapsed:.3f}s score={score}')
        print(f'PRECISION_RESULT {VARIANT} {label}: {normalized}')
    finally:
        driver.quit()

run_case('alt-no-extra',False)
run_case('alt-magic17-all12-action8',True)
