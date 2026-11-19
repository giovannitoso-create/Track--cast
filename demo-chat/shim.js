// TrackCast DEMO in chat: dati meteo d'esempio generati qui (la pagina non può contattare servizi esterni)
(function(){
const H0=new Date();H0.setMinutes(0,0,0);
const p2=n=>String(n).padStart(2,'0');const iso=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const day=d=>iso(d).slice(0,10);
const rainAt=t=>{const m=(t-H0)/60000;return m>=120&&m<=240?1.2:0;};
const hr=t=>t.getHours()+t.getMinutes()/60;
const sun=t=>{const h=hr(t);return h>7.3&&h<16.8?Math.max(0,Math.sin(Math.PI*(h-7.3)/9.5)):0;};
const ta=t=>9+5*Math.cos(2*Math.PI*(hr(t)-14.5)/24)-(rainAt(t)?2.5:0);
function val(v,t,off){off=off||0;const r=rainAt(t);
 if(/^temperature|apparent/.test(v))return +(ta(t)+off).toFixed(1);
 if(/dew_point/.test(v))return +(ta(t)-6+(r?4:0)).toFixed(1);
 if(/humidity/.test(v))return r?92:70;
 if(/precipitation_probability/.test(v))return r?85:(Math.abs((t-H0)/3.6e6-3)<3?40:8);
 if(/precipitation|rain|showers/.test(v))return r?(v.includes('15')?1.2:4.8)*(off>1.5?0:1):0;
 if(/weather_code/.test(v))return r?63:((t-H0)>3.6e6?3:2);
 if(/cloud_cover/.test(v))return r?100:45;
 if(/pressure/.test(v))return r?1009:1014;
 if(/gusts/.test(v))return r?42:22;
 if(/wind_speed/.test(v))return r?20:10;
 if(/direction/.test(v))return 210;
 if(/radiation|irradiance/.test(v))return Math.round(520*sun(t)*(r?0.2:0.8));
 if(/is_day/.test(v))return sun(t)>0?1:0;
 if(/sunshine/.test(v))return r?0:2400;
 if(/visibility/.test(v))return r?4000:20000;
 if(/soil_temperature/.test(v))return +(ta(t)-1).toFixed(1);
 return 0;}
function series(vars,from,to,stepMin,model){const out={time:[]};const ts=[];for(let t=new Date(from);t<=to;t=new Date(+t+stepMin*60000))ts.push(t);
 out.time=ts.map(iso);for(const v of vars){if(!v)continue;const base=model?v:v;out[v]=ts.map(t=>val(base,t,0));}return out;}
function forecast(u){const q=u.searchParams,past=+(q.get('past_days')||1),fd=+(q.get('forecast_days')||3);
 let from=new Date(H0);from.setHours(0);from=new Date(+from-past*864e5);let to=new Date(+from+(past+fd)*864e5-36e5);
 if(q.get('start_date')){from=new Date(q.get('start_date')+'T00:00');to=new Date((q.get('end_date')||q.get('start_date'))+'T23:00');}
 const res={latitude:+q.get('latitude'),longitude:+q.get('longitude'),timezone:'Europe/Rome',utc_offset_seconds:-H0.getTimezoneOffset()*60,elevation:120};
 const models=(q.get('models')||'').split(',').filter(Boolean);
 const hv=(q.get('hourly')||'').split(',').filter(Boolean);
 if(hv.length){if(models.length>1){const t0=new Date(H0),t1=new Date(+H0+48*36e5);const o={time:[]};const ts=[];for(let t=t0;t<=t1;t=new Date(+t+36e5))ts.push(t);o.time=ts.map(iso);
     models.forEach((m,i)=>{const off=[0,0.5,-0.8,1.2,2,0.3,-0.4][i%7];hv.forEach(v=>o[v+'_'+m]=ts.map(t=>/temperature/.test(v)?+(ta(t)+off).toFixed(1):val(v,t,off)));});res.hourly=o;}
   else res.hourly=series(hv,from,to,60);}
 const mv=(q.get('minutely_15')||'').split(',').filter(Boolean);if(mv.length)res.minutely_15=series(mv,new Date(+H0-9*36e5),new Date(+H0+14*36e5),15);
 const cv=(q.get('current')||'').split(',').filter(Boolean);if(cv.length){res.current={time:iso(new Date()),interval:900};cv.forEach(v=>res.current[v]=val(v,new Date()));}
 const dv=(q.get('daily')||'').split(',').filter(Boolean);if(dv.length){const o={time:[]};for(let d=new Date(day(from)+'T12:00');d<=to;d=new Date(+d+864e5)){o.time.push(day(d));}
   const seed=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))%997;return x/997;};
   dv.forEach(v=>o[v]=o.time.map(ds=>{const r=seed(ds+v);if(/max/.test(v)&&/temperature/.test(v))return +(11+6*r).toFixed(1);if(/min/.test(v)&&/temperature/.test(v))return +(2+5*r).toFixed(1);
     if(/precipitation_sum/.test(v))return r>0.65?+(r*14).toFixed(1):0;if(/precipitation_probability/.test(v))return Math.round(r*90);if(/wind/.test(v))return +(8+18*r).toFixed(1);if(/radiation/.test(v))return +(4+6*r).toFixed(1);
     if(/weather_code/.test(v))return r>0.65?61:(r>0.4?3:1);if(/sunrise/.test(v))return ds+'T07:15';if(/sunset/.test(v))return ds+'T16:45';return 0;}));res.daily=o;}
 return res;}
function overpass(body){const b=decodeURIComponent(String(body||'').replace(/^data=/,'').replace(/\+/g,' '));
 if(!/geom/.test(b))return{elements:[]};const m=b.match(/around:\d+,([-\d.]+),([-\d.]+)/);if(!m)return{elements:[]};const la=+m[1],lo=+m[2];
 const g=[];for(let a=0;a<=40;a++){const th=a/40*2*Math.PI;g.push({lat:la+0.0012*Math.sin(th)+0.0004*Math.sin(3*th),lon:lo+0.0019*Math.cos(th)});}
 return{elements:[{type:'way',id:900001,tags:{highway:'raceway',name:'Pista (demo)'},geometry:g}]};}
const json=o=>Promise.resolve(new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}}));
const realFetch=window.fetch.bind(window);
window.fetch=function(input,init){const url=typeof input==='string'?input:input.url;let u;try{u=new URL(url,location.href);}catch(e){return realFetch(input,init);}
 const h=u.hostname;
 if(/open-meteo\.com$/.test(h)){if(h.startsWith('geocoding'))return json({results:[]});return json(forecast(u));}
 if(/overpass/.test(h)||/overpass/.test(u.pathname))return json(overpass(init&&init.body));
 if(/nominatim/.test(h))return json([]);
 if(/geojs|ipapi|ipinfo/.test(h))return json({latitude:'45.47',longitude:'10.60',city:'Desenzano del Garda'});
 if(u.origin===location.origin)return realFetch(input,init);
 return Promise.reject(new TypeError('demo: servizio esterno non disponibile in chat'));};
window.__TC_DEMO=true;
})();
