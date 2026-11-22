// TrackCast Kart · sito + ponte radar in un solo Cloudflare Worker (pubblicato da GitHub a ogni modifica)
//   tutto il resto -> i file del sito (index.html ecc.)
//   /dpc/...       -> https://radar-api.protezionecivile.it/...                  (elenco e link dei fotogrammi radar/satellite)
//   /dpcs3/...     -> https://s3-prod-dpc-radar.s3.eu-south-1.amazonaws.com/...  (file radar e satellite)
// Il browser non può leggere direttamente i dati della Protezione Civile: il Worker li va a prendere per lui.
// PIANO PRO (facoltativo): con le variabili SUPABASE_URL e SUPABASE_ANON_KEY il radar avanzato resta solo per chi è Pro.

const SITI_AMMESSI = [/\.github\.io$/, /\.workers\.dev$/, /\.netlify\.app$/, /^localhost$/, /^127\.0\.0\.1$/];
const PRO_CACHE = new Map();

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

async function ponte(req, env, u) {
  const h = cors(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  const target = u.pathname.startsWith('/dpc/')
    ? 'https://radar-api.protezionecivile.it/' + u.pathname.slice(5) + u.search
    : 'https://s3-prod-dpc-radar.s3.eu-south-1.amazonaws.com/' + u.pathname.slice(7) + u.search;
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && !(await isPro(req, env)))
    return new Response(JSON.stringify({ error: 'pro', message: 'Radar avanzato riservato al piano Pro' }), { status: 402, headers: { ...h, 'Content-Type': 'application/json' } });
  const fwd = new Headers();
  const ct = req.headers.get('Content-Type'); if (ct) fwd.set('Content-Type', ct);
  const rg = req.headers.get('Range'); if (rg) fwd.set('Range', rg);
  if (target.includes('radar-api')) fwd.set('Origin', 'https://' + u.hostname);
  const r = await fetch(target, { method: req.method, headers: fwd, body: req.method === 'POST' ? await req.text() : undefined });
  const out = new Response(r.body, r);
  for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname.startsWith('/dpc/') || u.pathname.startsWith('/dpcs3/')) return ponte(req, env, u);
    if (u.pathname === '/ponte') return new Response('TrackCast Kart · ponte radar attivo', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors(req) } });
    const res = await env.ASSETS.fetch(req);
    // la pagina del sito non resta in memoria: ogni modifica pubblicata si vede subito
    if ((res.headers.get('Content-Type') || '').includes('text/html')) {
      const out = new Response(res.body, res);
      out.headers.set('Cache-Control', 'no-cache');
      return out;
    }
    return res;
  },
};
