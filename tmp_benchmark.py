from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import time,re

opts=Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=430,932')
driver=webdriver.Chrome(options=opts)
wait=WebDriverWait(driver,120)

EXP={'筋力':1000,'敏捷':1000,'技術':856,'知力':840,'精神':700}
BASIC={'生命力':10,'パワー':22,'魔力':9,'器用さ':9,'耐久力':7,'精神力':60}
HINTS={
  '物理防御○':1,
  '魔法防御○':1,
  '忍耐':5,
  '生存本能':1,
  '通常攻撃○':1,
  '列攻撃○':3,
  'ケガしにくさ○':1,
  '魔法の理解':1,
  'ガッツ':2,
}

def dispatch_value(el_id,value):
    driver.execute_script("""
      const el=document.getElementById(arguments[0]);
      el.value=String(arguments[1]);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    """,el_id,value)

def load_fixed(extras=False):
    driver.get('http://127.0.0.1:8000/index.html')
    wait.until(lambda d:d.execute_script("return document.readyState")=='complete')
    driver.execute_script("""
      const a=document.getElementById('academy');
      a.value='ブートレインアカデミー';
      a.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.15)
    driver.execute_script("""
      const j=document.getElementById('job');
      j.value='重戦士';
      j.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.25)
    for n,v in EXP.items(): dispatch_value(f'exp_0_{n}',v)
    for n,v in BASIC.items(): dispatch_value(f'basic_{n}',v)

    # コツLvは表示行の＋ボタンを必要回数クリック。
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
        # 超特殊能力A: 物理20%、B: 物理10%。デフォルト選択は物理攻撃耐性。
        driver.execute_script("""
          const first=document.querySelector('#extraResistanceList .extra-resistance-value');
          first.value='20';
          first.dispatchEvent(new Event('input',{bubbles:true}));
          document.getElementById('addExtraResistanceBtn').click();
          const vals=[...document.querySelectorAll('#extraResistanceList .extra-resistance-value')];
          vals[1].value='10';
          vals[1].dispatchEvent(new Event('input',{bubbles:true}));
        """)
        time.sleep(.05)


def run_case(label,extras=False):
    load_fixed(extras)
    before=driver.find_element('id','result').text
    t0=time.perf_counter()
    driver.find_element('id','calcBtn').click()
    wait.until(lambda d: (
        d.execute_script("return !document.getElementById('calcBtn').disabled") and
        '査定上昇量' in d.find_element('id','result').text and
        d.find_element('id','result').text != before
    ))
    elapsed=time.perf_counter()-t0
    text=driver.find_element('id','result').text
    m=re.search(r'査定上昇量\s*\+?([0-9.]+)',text)
    score=m.group(1) if m else 'N/A'
    print(f'BENCH {label}: {elapsed:.3f}s score={score}')
    # 精度比較用に選択特殊能力も出す。
    lines=[x.strip() for x in text.splitlines() if x.strip()]
    print('RESULT',label,' | '.join(lines[:30]))
    return elapsed,score,text

try:
    run_case('no-extra',False)
    run_case('physical20+10',True)
finally:
    driver.quit()
