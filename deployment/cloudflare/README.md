# Deployment Cloudflare (Pages + Worker)

## 1. Cloudflare Pages (frontend statis)

| Environment | Folder publish | Catatan |
|---|---|---|
| DEV | `frontend/public` | Portal publik dev |
| STAGING | `frontend/public` | Branch staging |
| PROD | `frontend/public` | Branch main |

Langkah:
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Production branch: `main`, preview branch: selain main.
3. Build command: kosong (statis).
4. **Publish directory:** `frontend/public`.
5. Domain internal: buat project Pages kedua dengan publish directory `frontend/internal` (URL/subdomain terpisah, sesuai keputusan arsitektur: akses internal tidak ditautkan dari portal publik).

> Alternatif tanpa Git integration: `npx wrangler pages deploy frontend/public --project-name=ccms-public`.

## 2. Cloudflare Worker (API gateway)

1. `cd worker`
2. Update `wrangler.toml`:
   - `GAS_URL` = URL deploy Apps Script environment terkait.
   - `ALLOWED_ORIGINS` = origin Pages environment terkait (JSON array).
3. `npx wrangler deploy` (dev), `npx wrangler deploy --env production` (prod).
4. Arahkan path `/api/*` ke Worker:
   - Workers & Pages → Routes → tambah route `ccms-public.pages.dev/api/*` → Worker `ccms-api`, **atau**
   - gunakan custom domain Worker (mis. `api.gereja.example`) dan set di frontend.

## 3. Aturan environment (wajib)

- Tiap environment (DEV/STAGING/PROD) punya pair **Worker ↔ Apps Script** sendiri.
- Jangan pernah menunjuk Worker PROD ke Apps Script DEV.
