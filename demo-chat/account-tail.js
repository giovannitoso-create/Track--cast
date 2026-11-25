// --- DEMO (dentro lo scope dell'app) ---
{const orig=renderAcct;
 renderAcct=function(){orig.apply(this,arguments);const B=$('acct-body');if(!B)return;
  if(!ACCT.session){B.innerHTML=`<h3 style="margin:0 0 6px">👤 Account</h3><div class="sub" style="margin:0 0 10px">Nel prototipo in chat l'account è il <b>tuo account Claude</b>: niente email né password. Diario, assetti, sessioni, calendario e piano Pro restano salvati e li ritrovi riaprendo la pagina, anche da un altro dispositivo. Nessun altro può vederli.</div>
    <button class="btn primary" id="ac-demo-in">Entra con il tuo account Claude</button><div class="sub" id="ac-msg" style="margin-top:8px"></div>`;
   $('ac-demo-in').onclick=async()=>{const m=$('ac-msg');m.textContent='Accesso…';const{error}=await ACCT.sb.auth.signInWithPassword({});if(error)m.innerHTML='<span class="err">'+esc(error.message)+'</span>';};}
  B.querySelectorAll('a[href^="demo-portal"]').forEach(a=>{a.textContent='Disdici il Pro di prova';a.removeAttribute('target');a.onclick=ev=>{ev.preventDefault();window.open('demo-portal');};});};
 window.__demoHooks={refreshPlan:()=>refreshPlan(),renderAcct:()=>renderAcct()};}
// Prototipo in chat: se il radar vero non è raggiungibile, la matrice mostra un temporale d'esempio (così si può provare l'interazione)
setInterval(()=>{try{if(!CUR||(NC.res&&!NC.res.demo&&NC.res.sens))return;if(NC.res&&NC.res.demo&&NC.res.dirs===MTX_DIRS)return;
  const sens=[],ad=(a,b)=>Math.abs(((a-b+540)%360)-180);MTX_RINGS.forEach((km,ri)=>{for(let di=0;di<MTX_DIRS;di++){const brg=di*360/MTX_DIRS,a=ad(brg,270);
    let v=6*Math.exp(-Math.pow((km-18)/6,2))*Math.exp(-Math.pow(a/38,2))+2.5*Math.exp(-Math.pow((km-38)/5,2))*Math.exp(-Math.pow(ad(brg,215)/22,2));v=Math.round(v*10)/10;
    const hit=v>=0.2&&a<16&&km>3;sens.push({ri,di,brg,km,v,p:Math.min(1,v/4+0.3),tr:((di*7+ri*3)%10-4.5)/5,hit,eta:hit?km/19*60:null});}});
  NC.res={demo:true,dirs:MTX_DIRS,sens,ms:Date.now(),moving:true,speed:19,from:270,n:1};renderMatrix();
  const l=document.getElementById('mtx-l');if(l)l.innerHTML+='<br><span class="sub" style="margin:0">🧪 Temporale d\'esempio: nel prototipo in chat il radar vero non è raggiungibile.</span>';}catch(e){}},6000);
