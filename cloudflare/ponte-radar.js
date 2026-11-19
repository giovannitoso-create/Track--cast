// TrackCast Kart · ponte radar (Cloudflare Worker, piano gratuito)
// Fa da tramite tra il sito e i dati radar/satellite della Protezione Civile, che il browser
// non può leggere direttamente. Incolla tutto questo file nell'editor del Worker e premi "Deploy".
//
//   /dpc/...    -> https://radar-api.protezionecivile.it/...                       (elenco e link dei fotogrammi)
//   /dpcs3/...  -> https://s3-prod-dpc-radar.s3.eu-south-1.amazonaws.com/...       (file radar e satellite)
//
// PIANO PRO: in Settings › Variables del Worker aggiungi
//   SUPABASE_URL       es. https://abcd.supabase.co
//   SUPABASE_ANON_KEY  la chiave "anon public" del progetto
// Da quel momento il ponte dà i dati del radar avanzato solo a chi ha il Pro attivo.
// Finché queste variabili mancano, il ponte resta aperto a tutti (come adesso).

// Siti che possono usare il ponte (così nessun altro consuma la quota gratuita)
const SITI_AMMESSI = [/\.github\.io$/, /\.netlify\.app$/, /^localhost$/, /^127\.0\.0\.1$/];
const PRO_CACHE = new Map(); // token -> {pro, until}

function cors(req) {
  const o = req.headers.get('Origin') || '';
  let ok = false;
  try { const h = new URL(o).hostname; ok = SITI_AMMESSI.some(r => r.test(h)); } catch (e) {}
  return {
    'Access-Control-Allow-Origin': ok ? o : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Il token di accesso dell'utente viene verificato da Supabase, che risponde se è Pro (funzione is_pro)
async function isPro(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  const c = PRO_CACHE.get(token);
  if (c && c.until > Date.now()) return c.pro;
  let pro = false;
  try {
    const r = await fetch(env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/is_pro', {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: '{}',
    });
    pro = r.ok && (await r.json()) === true;
  } catch (e) {}
  PRO_CACHE.set(token, { pro, until: Date.now() + 5 * 60e3 });
  if (PRO_CACHE.size > 5000) PRO_CACHE.clear();
  return pro;
}

export default {
  async fetch(req, env = {}) {
    const u = new URL(req.url);
    const h = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    let target = null;
    if (u.pathname.startsWith('/dpc/')) target = 'https://radar-api.protezionecivile.it/' + u.pathname.slice(5) + u.search;
    else if (u.pathname.startsWith('/dpcs3/')) target = 'https://s3-prod-dpc-radar.s3.eu-south-1.amazonaws.com/' + u.pathname.slice(7) + u.search;
    if (!target) return new Response('TrackCast Kart · ponte radar attivo' + (env.SUPABASE_URL ? ' (radar avanzato riservato al Pro)' : ''), { headers: { ...h, 'Content-Type': 'text/plain; charset=utf-8' } });

    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && !(await isPro(req, env)))
      return new Response(JSON.stringify({ error: 'pro', message: 'Radar avanzato riservato al piano Pro' }), { status: 402, headers: { ...h, 'Content-Type': 'application/json' } });

    const fwd = new Headers();
    const ct = req.headers.get('Content-Type'); if (ct) fwd.set('Content-Type', ct);
    const rg = req.headers.get('Range'); if (rg) fwd.set('Range', rg);
    // l'API della Protezione Civile richiede un "origin": inoltro quello del sito TrackCast
    if (target.includes('radar-api')) fwd.set('Origin', req.headers.get('Origin') || 'https://trackcast.github.io');

    const r = await fetch(target, {
      method: req.method,
      headers: fwd,
      body: req.method === 'POST' ? await req.text() : undefined,
    });
    const out = new Response(r.body, r);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  },
};
