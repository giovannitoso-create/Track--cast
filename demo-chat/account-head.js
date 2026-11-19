// DEMO: account del prototipo = il tuo account Claude (dati salvati nell'artifact, privati per ogni persona)
window.__TC_CFG={supabaseUrl:'demo',supabaseKey:'demo',stripe:{singolo_mese:'demo-pay:singolo_mese',singolo_anno:'demo-pay:singolo_anno',team_mese:'demo-pay:team_mese',team_anno:'demo-pay:team_anno'},portal:'demo-portal'};
(function(){
 const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
 const OUT='tc_demo_out';let ctx=null;
 const waitClaude=()=>new Promise(r=>{const t0=Date.now();(function p(){if(window.claude&&window.claude.use)return r(true);if(Date.now()-t0>5000)return r(false);setTimeout(p,100);})();});
 const ready=(async()=>{try{if(!await waitClaude())return null;const[db,user]=await Promise.all([claude.use('db'),claude.use('user')]);if(!db||!user)return null;
   const me=await user.me();if(!me||!me.id)return null;ctx={db,uid:me.id,email:me.email||'',name:me.name||''};return ctx;}catch(e){console.warn('demo account',e);return null;}})();
 window.__demoAcct=ready;
 const col=()=>ctx.db.collection('data/users/'+ctx.uid);
 const enc=k=>k.replace(/[^A-Za-z0-9_.~:@+-]/g,c=>'~'+c.charCodeAt(0).toString(16));
 const label=()=>ctx.email||ctx.name||'il tuo account Claude';
 const session=()=>ctx&&ls.get(OUT)!=='1'?{access_token:'demo',user:{id:ctx.uid,email:label()}}:null;
 const cbs=[];const fire=ev=>setTimeout(()=>cbs.forEach(f=>{try{f(ev,session())}catch(e){}}),0);
 const err=m=>({data:null,error:{message:m}});
 async function planDoc(){const s=await col().doc('_plan').get();return s.exists?Object.assign({teams:[]},s.data()):{teams:[]};}
 async function savePlan(p){await col().doc('_plan').set(p);}
 window.__demoSetPlan=async(k,ref)=>{await ready;if(!ctx)return false;const p=await planDoc();const team=k.startsWith('team');const t=team?p.teams.find(x=>'t_'+x.id===ref):null;
   p.sub={plan:team?'team':'singolo',billing:k.endsWith('anno')?'anno':'mese',status:'active',team:t?t.name:null,team_id:t?t.id:null};await savePlan(p);return true;};
 window.__demoCancel=async()=>{await ready;if(!ctx)return;const p=await planDoc();delete p.sub;await savePlan(p);};
 function table(t){const st={t,op:'select',rows:null};const b={select(){return b},eq(){return b},gt(){return b},order(){return b},limit(){return b},
   upsert(rows){st.op='upsert';st.rows=[].concat(rows);return b},insert(rows){st.op='insert';st.rows=[].concat(rows);return b},
   then(res,rej){(async()=>{await ready;if(!ctx)return err('Account non disponibile');
     if(t!=='user_data')return{data:[],error:null};
     if(st.op==='select'){const q=await col().get();return{data:q.docs.filter(d=>d.id!=='_plan').map(d=>d.data()).filter(x=>x&&x.k),error:null};}
     for(const r of st.rows){try{await col().doc(enc(r.k)).set({k:r.k,v:r.v===undefined?null:r.v,ts:r.ts});}catch(e){return err(e&&e.code==='invalid_argument'?'dato troppo grande per il prototipo ('+r.k+')':((e&&e.message)||'errore'));}}
     return{data:null,error:null};})().then(res,rej);}};return b;}
 const client={
  auth:{getSession:async()=>{await ready;if(!ctx){try{window.__TCCFG.supabaseUrl='';}catch(e){}}return{data:{session:session()}}},
   onAuthStateChange:f=>{cbs.push(f);return{data:{subscription:{unsubscribe(){}}}}},
   signOut:async()=>{ls.set(OUT,'1');fire('SIGNED_OUT');return{error:null}},
   signInWithPassword:async()=>{await ready;if(!ctx)return err('Per usare l\'account nel prototipo apri la pagina da claude.ai con il tuo account.');ls.del(OUT);fire('SIGNED_IN');return{data:{session:session()},error:null}},
   signUp:async()=>client.auth.signInWithPassword(),
   resetPasswordForEmail:async()=>err('Nel prototipo non ci sono password: l\'account è quello di Claude.'),
   updateUser:async()=>err('Nel prototipo non ci sono password.')},
  from:table,
  rpc:async(fn,a)=>{await ready;if(!ctx)return err('Account non disponibile');
   if(fn==='my_plan'){const p=await planDoc(),s=p.sub;return{data:{pro:!!(s&&s.status==='active'),subs:s?[s]:[],teams:p.teams},error:null};}
   if(fn==='create_team'){const p=await planDoc();if(p.teams.some(t=>t.role==='proprietario'))return err('Nel prototipo puoi avere un solo team.');
     p.teams.push({id:'demo'+Date.now().toString(36),name:String(a&&a.team_name||'Team').slice(0,40),role:'proprietario',invite_code:Math.random().toString(16).slice(2,10).toUpperCase(),members:1});await savePlan(p);return{data:null,error:null};}
   if(fn==='join_team')return err('Nel prototipo i team non si possono condividere: prova a crearne uno tuo.');
   if(fn==='leave_team'){const p=await planDoc();p.teams=p.teams.filter(t=>t.id!==(a&&a.tid));if(p.sub&&p.sub.team_id===(a&&a.tid))delete p.sub;await savePlan(p);return{data:null,error:null};}
   if(fn==='create_station_key')return{data:Array.from({length:24},()=>'0123456789abcdef'[Math.random()*16|0]).join(''),error:null};
   if(fn==='delete_my_account'){const p=await planDoc();if(p.sub&&p.sub.status==='active')return err('abbonamento attivo');const q=await col().get();for(const d of q.docs){await col().doc(d.id).delete();}ls.set(OUT,'1');fire('SIGNED_OUT');return{data:null,error:null};}
   return{data:null,error:null};}};
 window.supabase={createClient:()=>client};
 const _open=window.open;window.open=function(u){u=String(u||'');
  if(u.startsWith('demo-pay:')){const k=u.slice(9).split('?')[0],ref=new URLSearchParams(u.split('?')[1]||'').get('client_reference_id');
    window.__demoSetPlan(k,ref).then(ok=>{const m=document.getElementById('pl-msg');if(m)m.innerHTML=ok?'<b>Pro di prova attivato.</b> Nessun pagamento: è il prototipo.':'<span class="err">Account non disponibile.</span>';
      const H=window.__demoHooks;if(ok&&H)H.refreshPlan().then(()=>{setTimeout(()=>{const pl=document.getElementById('plans');if(pl)pl.style.display='none';H.renderAcct();},1200);});});return null;}
  if(u.startsWith('demo-portal')){const H=window.__demoHooks;window.__demoCancel().then(()=>H&&H.refreshPlan()).then(()=>H&&H.renderAcct());return null;}
  try{return _open.apply(window,arguments)}catch(e){return null}};
})();
