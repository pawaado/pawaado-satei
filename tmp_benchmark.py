from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import time

opts=Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=430,932')
driver=webdriver.Chrome(options=opts)
try:
    driver.get('http://127.0.0.1:8000/index.html')
    WebDriverWait(driver,20).until(lambda d: d.execute_script("return document.readyState")=='complete')
    driver.execute_script("""
      const a=document.getElementById('academy');
      a.value='ブートレインアカデミー';
      a.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.3)
    driver.execute_script("""
      const j=document.getElementById('job');
      j.value='重戦士';
      j.dispatchEvent(new Event('change',{bubbles:true}));
    """)
    time.sleep(.5)
    for id_ in ['expInputs','basicInputs','specialList']:
        html=driver.execute_script("return document.getElementById(arguments[0])?.innerHTML||''",id_)
        print('\n====',id_,'====\n',html[:12000])
finally:
    driver.quit()
