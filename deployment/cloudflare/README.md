# Deployment Cloudflare (Pages + Worker)

## 1. Prinsip environment

Buat resource Cloudflare terpisah untuk DEV, STAGING, dan PROD. Setiap environment memiliki Pages public/internal dan Worker API sendiri. Gunakan satu akun Cloudflare bila dikehendaki, tetapi jangan memakai Worker atau origin lintas environment.

| Environment | Pages public | Pages internal | Worker |
|---|---|---|---|
| DEV | Project/domain DEV | Project/domain DEV internal | `ccms-api-dev` |
| STAGING | Project/domain STAGING | Project/domain STAGING internal | `ccms-api-staging` |
| PROD | `ccms-public` | `ccms-internal` | `ccms-api-production` |

Nama project Pages STAGING yang disarankan: `ccms-staging-public` dan `ccms-staging-internal`. Domain final ditentukan Cloudflare saat project dibuat; jangan menebak atau memasukkan domain yang belum ada.

## 2. Cloudflare Pages

Buat project Pages terpisah untuk setiap frontend dan environment:

| Environment / app | Publish directory | Branch |
|---|---|---|
| DEV public | `frontend/public` | branch pengembangan DEV |
| DEV internal | `frontend/internal` | branch pengembangan DEV |
| STAGING public | `frontend/public` | branch rilis STAGING |
| STAGING internal | `frontend/internal` | branch rilis STAGING |
| PROD public | `frontend/public` | `main` |
| PROD internal | `frontend/internal` | `main` |

Build command kosong untuk frontend statis. Pastikan branch rilis STAGING dipromosikan secara sengaja dari kode yang telah lulus pemeriksaan; jangan menghubungkan STAGING ke `main` secara otomatis.

## 3. Cloudflare Worker

Konfigurasi ada di `worker/wrangler.toml`. Masing-masing environment harus memiliki:
- Nama Worker tersendiri.
- `GAS_URL` yang menunjuk ke deployment Apps Script environment itu saja.
- `ALLOWED_ORIGINS` yang hanya memuat origin Pages public/internal environment tersebut.

Periksa dan isi blok environment yang dituju saja. Jangan commit token/secret ke file konfigurasi. `SESSION_SECRET` berada di Script Properties Apps Script, bukan Worker vars.

Deploy per environment:

```bash
cd worker
npx wrangler deploy --env dev
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

Jalankan hanya perintah untuk environment yang telah disiapkan dan mendapat persetujuan. Placeholder `CONFIGURE_...` harus tetap fail-closed dan tidak boleh dipakai untuk deployment aktif.

## 4. Route dan frontend

Arahkan request `/api/*` dari setiap Pages origin ke Worker environment yang sesuai. Pastikan URL API yang dipakai frontend STAGING menunjuk ke Worker STAGING, bukan Worker PROD. Verifikasi CORS dari kedua origin Pages STAGING.

## 5. STAGING

Sebelum membuat Pages/Worker STAGING, siapkan Apps Script project dan database STAGING terpisah. Setelah URL Web App dan domain Pages final tersedia, masukkan nilainya ke blok `[env.staging.vars]`, review diff, jalankan CI, lalu deploy hanya dengan `--env staging`.

Ikuti [STAGING Setup Runbook](../../docs/deployment/STAGING_SETUP_RUNBOOK.md) dan [Environment Isolation](../../docs/deployment/ENVIRONMENT_ISOLATION.md).
