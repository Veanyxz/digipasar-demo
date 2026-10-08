# DigiPasar — Versi DEMO (Netlify)

Marketplace produk digital (fork dari [`Veanyxz/Vean-marketplace`](https://github.com/Veanyxz/Vean-marketplace)).
Repo ini **khusus versi demo yang di-deploy di Netlify** — versi penuh/lokal ada di repo utama.

**Live:** https://digipasar-demo.netlify.app

## Bedanya dengan repo utama

| | Repo utama (lokal) | Repo ini (demo) |
|---|---|---|
| Proses | Express `npm start` biasa | 1 Netlify Function (`serverless-http`) |
| Database | File SQLite (`data/digipasar.db`) | SQLite in-memory per instance + snapshot di **Netlify Blobs** |
| Session | Cookie signed (stateless) | sama |
| Upload gambar | File fisik di `public/img/uploads` | Netlify Blobs (prefix `up-`) |
| Persistensi | Filesystem | Hydrate dari Blobs tiap request `/api`, save tiap tulis |
| Turnstile / Google / Midtrans | bisa diisi `.env` | env kosong = fitur nonaktif otomatis |

Front-end **tidak diubah sama sekali** — kontrak API identik dengan versi lokal.

## Arsitektur serverless (yang berubah)

- `netlify/functions/api.js` — bungkus seluruh Express via `serverless-http`;
  semua `/api/*` dan `/img/uploads/*` di-rewrite ke function (lihat `netlify.toml`).
- `db.js` — mode ganda: lokal = file SQLite biasa; di Lambda = `:memory:`
  (deteksi `AWS_EXECUTION_ENV`). `dumpState()`/`loadState()` untuk snapshot.
  **Catatan:** `node:sqlite` wajib di-require lewat variabel — bundler esbuild
  Netlify mem-folding concat inline lalu meng-strip prefix `node:` (lihat komentar di `db.js`).
- `lib/persist.js` — `hydrate()` (Blobs strong -> loadState) sebelum tiap request
  `/api`, `save()` (dumpState -> setJSON) sebelum respons tulis dilepas.
- `server.js` — `express-session` -> **cookie-session** (stateless, wajib untuk
  multi-instance); `logout` pakai `req.session = null`; upload branch Blobs;
  `/api/image-defaults` fallback ke `_imagelist.json` (folder `public/` tidak
  ikut bundle function — disertakan via `included_files`).

## Menjalankan lokal

```bash
npm install
npm start        # http://localhost:3000 — mode file, jalan persis seperti repo utama
```

Admin default: `admin@digipasar.id` / `admin123`. Butuh Node.js 22.5+ (`node:sqlite`).

## Env di Netlify (sudah ter-set)

| Key | Fungsi |
|---|---|
| `SESSION_SECRET` | Kunci tanda-tangan cookie session |
| `BLOBS_TOKEN` | Token baca/tulis Netlify Blobs (auto-detect gagal di runtime -> di-set manual; `SITE_ID` sudah ada dari runtime) |

Turnstile/Google/Midtrans sengaja **tidak** diisi -> mati otomatis (demo murni).

## Health check

`GET /api/health` -> `{ ok, mode: "lambda"|"file", sqlite, err }`
`err` non-null = persist Blobs bermasalah (periksa env token).

## Deploy

- **CI (otomatis):** push ke `main` -> GitHub Actions
  (`.github/workflows/deploy.yml`) -> `netlify deploy --prod`.
  Secrets repo: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
- **Manual:** `netlify deploy --prod` dari direktori ini (sudah link project
  `digipasar-demo`, jangan deploy dari direktori lain).

## Data demo

Database demo = **snapshot tunggal di Blobs** (`app-db`, store `digipasar-db`).
Semua aksi tulis (register, order, CRUD admin, upload) persist lintas cold-start.
Untuk reset ke seed segar: hapus key `app-db` dari store Blobs, lalu deploy ulang.

## API ringkas

`POST /api/auth/register|login|google|logout` - `GET /api/auth/me` - `GET /api/config`
`GET /api/categories` - `GET /api/products` - `GET /api/products/:slug`
`POST /api/orders` - `GET /api/orders` - `GET /api/orders/:id`
`GET /api/notifications` - `POST /api/notifications/read|read-all`
`GET /api/admin/stats|products|orders|notifications` - CRUD produk/notifikasi admin
`POST /api/upload` - `GET /api/image-defaults` - `GET /api/health`
