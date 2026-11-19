// --- DEMO (dentro lo scope dell'app) ---
{const orig=renderAcct;
 renderAcct=function(){orig.apply(this,arguments);const B=$('acct-body');if(!B)return;
  if(!ACCT.session){B.innerHTML=`<h3 style="margin:0 0 6px">👤 Account</h3><div class="sub" style="margin:0 0 10px">Nel prototipo in chat l'account è il <b>tuo account Claude</b>: niente email né password. Diario, assetti, sessioni, calendario e piano Pro restano salvati e li ritrovi riaprendo la pagina, anche da un altro dispositivo. Nessun altro può vederli.</div>
    <button class="btn primary" id="ac-demo-in">Entra con il tuo account Claude</button><div class="sub" id="ac-msg" style="margin-top:8px"></div>`;
   $('ac-demo-in').onclick=async()=>{const m=$('ac-msg');m.textContent='Accesso…';const{error}=await ACCT.sb.auth.signInWithPassword({});if(error)m.innerHTML='<span class="err">'+esc(error.message)+'</span>';};}
  B.querySelectorAll('a[href^="demo-portal"]').forEach(a=>{a.textContent='Disdici il Pro di prova';a.removeAttribute('target');a.onclick=ev=>{ev.preventDefault();window.open('demo-portal');};});};
 window.__demoHooks={refreshPlan:()=>refreshPlan(),renderAcct:()=>renderAcct()};}
