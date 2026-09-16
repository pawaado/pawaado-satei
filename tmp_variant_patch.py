from pathlib import Path
p=Path('pawaado_worker_resistance_v2.js')
s=p.read_text(encoding='utf-8')
needle="const gain=dynamicSpecialGainForBits(st.bits??EMPTY_BITS,opBits,op0.items,Number(op0.score||0));"
if needle not in s:
    raise SystemExit('dynamic gain line not found')
s=s.replace(needle,"const gain=Number(op0.score||0);",1)
p.write_text(s,encoding='utf-8')
print('temporary static-score diagnostic patch applied')
