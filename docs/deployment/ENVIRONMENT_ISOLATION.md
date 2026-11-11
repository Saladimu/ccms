# CCMS — Isolasi Environment DEV / STAGING / PROD

## Prinsip wajib

**DEV dan STAGING wajib memakai project Google Apps Script yang berbeda.** Jangan mencoba menjadikan satu project Apps Script sebagai DEV sekaligus STAGING dengan mengganti Script Properties. Properti tersebut berlaku pada level project, sehingga pergantian environment dapat mengarahkan deployment ke spreadsheet atau secret yang keliru. Satu akun Google boleh memiliki beberapa project, spreadsheet, dan folder Drive terpisah.

Gunakan [ENVIRONMENT_OVERVIEW.md](ENVIRONMENT_OVERVIEW.md) sebagai ringkasan arsitektur, tujuan, status, dan alur promosi rilis.



Setiap environment memiliki Cloudflare Worker, Apps Script deployment, Script Properties, Spreadsheet, dan folder Drive yang terpisah. DEV dan STAGING tidak boleh memakai URL deployment, ID spreadsheet, atau secret PROD.

| Komponen | DEV | STAGING/UAT | PROD |
|---|---|---|---|
| Worker | `ccms-api-dev` | `ccms-api-staging` | `ccms-api-production` |
| Pages origin | domain dev | domain staging | domain publik resmi |
| Apps Script | project/deployment DEV | project/deployment STAGING | project/deployment PROD |
| `CCMS_ENV` | DEV | STAGING | PROD |
| Spreadsheet | `CCMS-DEV-DB` | `CCMS-STAGING-DB` | `CCMS-PROD-DB` |
| Drive folder | `CCMS/DEV` | `CCMS/STAGING` | `CCMS/PROD` |
| Data | sintetis/dummy | sintetis/disamarkan | data resmi |

## Konfigurasi Worker

File `worker/wrangler.toml` berisi placeholder fail-closed. Sebelum deploy, ganti hanya URL Apps Script milik environment yang sedang ditargetkan dan origin Pages yang sesuai.

```bash
cd worker
npx wrangler deploy --env dev
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

Jangan menjalankan perintah deploy sebelum nilai placeholder diganti dan diverifikasi oleh reviewer kedua. Jangan menyalin URL GAS PROD ke blok DEV/STAGING. Jangan menyimpan secret di repository; gunakan Wrangler secrets untuk nilai rahasia.

## Konfigurasi Apps Script

Di setiap project Apps Script, atur Script Properties secara terpisah:
- `CCMS_ENV` = DEV / STAGING / PROD sesuai project.
- `CCMS_SPREADSHEET_ID` = spreadsheet milik environment tersebut.
- `SESSION_SECRET` = secret unik per environment, tidak boleh digunakan bersama.
- Flag konfirmasi PROD hanya diaktifkan saat prosedur terotorisasi.

Setup database baru dilakukan hanya pada DEV/STAGING yang belum memiliki pointer database. Migrasi skema dijalankan setelah backup, verifikasi nama environment, dan persetujuan. Jangan menjalankan `setupDatabase()` untuk membuat database baru pada environment yang sudah memiliki `CCMS_SPREADSHEET_ID`.

## Checklist isolasi silang (wajib lulus)

1. DEV Worker mengarah hanya ke Apps Script DEV.
2. STAGING Worker mengarah hanya ke Apps Script STAGING.
3. PROD Worker mengarah hanya ke Apps Script PROD.
4. Ketiga Script Properties memakai secret berbeda.
5. Ketiga spreadsheet ID berbeda.
6. DEV/STAGING tidak memiliki ID/URL/secret PROD.
7. Origin DEV tidak diterima oleh Worker STAGING/PROD dan sebaliknya.
8. URL placeholder ditolak oleh Worker dengan `CONFIG_ERROR`, bukan diteruskan.
9. Deployment rollback menggunakan Worker script version dan Apps Script deployment ID yang dicatat untuk environment yang sama.

## Status saat ini

Repository mendefinisikan tiga blok environment Worker dan aturan isolasi. Nilai URL/origin yang masih berupa placeholder harus diisi sesuai resource aktual. **Project Apps Script STAGING belum dibuat dan isolasi runtime belum terbukti.** Spreadsheet, folder Drive, Script Properties, secret, dan deployment aktual tiap environment harus diinventarisasi dan diverifikasi sebelum UAT.

Tidak ada resource cloud yang dibuat atau diubah dan tidak ada deployment yang dilakukan sebagai bagian dari perubahan dokumentasi ini.