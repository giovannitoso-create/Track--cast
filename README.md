# TrackCast Kart

Meteo per il karting: radar della Protezione Civile, temperatura dell'asfalto, gomme slick e rain con le pressioni, carburazione, diario del team e strumenti Pro.

Il sito è un solo file, `index.html`, pubblicato con **GitHub Pages**.

## Cartelle

| Cartella | Cosa contiene |
|---|---|
| `index.html` | il sito completo |
| `cloudflare/ponte-radar.js` | il "ponte" per il radar della Protezione Civile (Cloudflare Worker) |
| `stazione/` | firmware della stazione meteo ESP32 del box |
| `docs/` | anteprime delle schermate |

I file per il database (Supabase) e i pagamenti (Stripe) **non** stanno qui: sono nello zip privato `pro-setup`.

## Pubblicare

1. Repository › **Settings › Pages**.
2. *Source*: **Deploy from a branch** · Branch **main** · cartella **/ (root)** › **Save**.
3. Dopo un minuto il sito è su `https://<tuo-nome>.github.io/<nome-repository>/`.

Ogni modifica a `index.html` su `main` viene pubblicata da sola.

## Ponte del radar

GitHub Pages non può fare da ponte verso i server della Protezione Civile, quindi il radar a sensori ha bisogno del Worker Cloudflare (gratis):

1. Cloudflare › **Workers & Pages › Create › Worker** › incolla `cloudflare/ponte-radar.js` › **Deploy**.
2. Copia l'indirizzo del worker (es. `https://trackcast-ponte.<nome>.workers.dev`).
3. Mettilo in `index.html` nella riga `const PONTE_DEFAULT='';`, oppure apri il sito una volta con `?ponte=<indirizzo>`.

Il worker accetta già le richieste dai siti `*.github.io`.
