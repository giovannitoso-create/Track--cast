import re
s=open('../index.html').read()
shim=open('./shim.js').read();css=open('./leaflet-min.css').read()
head=open('./account-head.js').read();tail=open('./account-tail.js').read()
s,n=re.subn(r'<link rel="stylesheet" href="https://cdnjs\.cloudflare\.com/ajax/libs/leaflet/1\.9\.4/leaflet\.min\.css"[^>]*>','<style>'+css+'</style>',s);assert n==1
i=s.index('<head>')+len('<head>');s=s[:i]+'<script>'+shim+'</script><script>'+head+'</script>'+s[i:]
banner='''<div id="demobar" style="position:sticky;top:0;z-index:5000;background:#2a2410;color:#ffd98a;font:13px/1.4 Inter,sans-serif;padding:8px 12px;border-bottom:1px solid #5a4a1a">🧪 <b>Prototipo in chat</b>: meteo d'esempio (pioggia tra 2 e 4 ore); mappa, GPS e radar spenti. L'account è il tuo account Claude. Il sito vero è su <a href="https://giovannitoso-create.github.io/Track--cast/" style="color:#ffe7b0">GitHub</a>.</div>'''
i=s.index('<body');j=s.index('>',i)+1;s=s[:j]+banner+s[j:]
# expose config + in-scope demo code before the outer IIFE closes
old="},window.__TC_CFG||{});"
assert s.count(old)==1;s=s.replace(old,old+"window.__TCCFG=TC_CFG;")
end="\n})();\n})();\n"
k=s.rindex(end)
inscope="\n})();\n"+tail+"\nsetTimeout(()=>{try{if(!CUR){const q=$('q');q.value='lonato';q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}}catch(e){}},2500);\n})();\n"
s=s[:k]+inscope+s[k+len(end):]
open('./index.html','w').write(s)
print('ok',len(s))
