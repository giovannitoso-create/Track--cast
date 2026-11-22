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

## Ponte del radar (Cloudflare)

Il sito è pubblicato anche su **Cloudflare Workers**, collegato a questo repository: a ogni modifica su `main` Cloudflare lo ripubblica da solo.

- Sito + ponte radar: **https://track--cast.giovannitoso.workers.dev**
- Il Worker (`cloudflare/sito-e-ponte.js`, configurato da `wrangler.jsonc`) serve i file del sito e fa da ponte verso i dati della Protezione Civile (`/dpc/*` e `/dpcs3/*`).
- La versione su GitHub Pages usa lo stesso ponte.
- `.assetsignore` tiene fuori dal sito pubblicato le cartelle che non servono (firmware, prototipo, codice del Worker).
