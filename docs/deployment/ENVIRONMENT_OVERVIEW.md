# CCMS — Environment Overview

Dokumen ini adalah pintu masuk untuk memahami pemisahan environment CCMS. Detail teknis dan checklist berada di [ENVIRONMENT_ISOLATION.md](ENVIRONMENT_ISOLATION.md). Prosedur pembuatan STAGING ada di [STAGING_SETUP_RUNBOOK.md](STAGING_SETUP_RUNBOOK.md).

## Tujuan setiap environment

| Environment | Tujuan | Jenis data | Pengguna |
|---|---|---|---|
| **DEV** | Pengembangan fitur, debugging, dan uji otomatis | Dummy/sintetis | Developer |
| **STAGING / UAT** | Validasi kandidat rilis dan uji alur kerja sebelum produksi | Dummy atau data uji yang disamarkan; bukan data jemaat resmi | Tester dan perwakilan pengguna |
| **PROD** | Operasional resmi gereja | Data resmi | Jemaat, operator, pengurus sesuai hak akses |

## Arsitektur isolasi

Setiap environment wajib memiliki resource tersendiri. Penggunaan satu akun Google atau satu akun Cloudflare diperbolehkan, tetapi resource di dalamnya tetap dipisahkan.

| Resource | DEV | STAGING / UAT | PROD |
|---|---|---|---|
| Cloudflare Worker | `ccms-api-dev` | `ccms-api-staging` | `ccms-api-production` |
| Cloudflare Pages origin | Origin DEV | Origin STAGING | Origin publik resmi |
| Google Apps Script project & deployment | Project DEV | Project STAGING khusus | Project PROD |
| Script Properties | Milik DEV | Milik STAGING | Milik PROD |
| `CCMS_ENV` | `DEV` | `STAGING` | `PROD` |
| `CCMS_SPREADSHEET_ID` | Spreadsheet DEV | Spreadsheet STAGING | Spreadsheet PROD |
| Drive folder | `CCMS/DEV` | `CCMS/STAGING` | `CCMS/PROD` |
| `SESSION_SECRET` | Secret unik DEV | Secret unik STAGING | Secret unik PROD |

**Dilarang menggabungkan DEV dan STAGING dalam satu Apps Script project dengan cara mengganti Script Properties `CCMS_ENV` atau `CCMS_SPREADSHEET_ID` secara bergantian.** Script Properties berlaku pada level project dan dapat menyebabkan deployment menunjuk ke database atau secret yang salah. Buat project Apps Script terpisah untuk setiap environment.

## Alur perubahan kode

```text
Developer
   |
   v
  DEV  -- uji teknis/lulus CI
   |
   v
STAGING -- SIT + UAT + persetujuan rilis
   |
   v
 PROD -- deployment terotorisasi + smoke test read-only
```

- Perubahan dikembangkan dan diuji terlebih dahulu di DEV.
- Kandidat rilis dipromosikan ke STAGING untuk SIT/UAT.
- Hanya perubahan yang memenuhi exit criteria dan mendapat persetujuan yang boleh dipromosikan ke PROD.
- Jangan mengembangkan fitur langsung di PROD.
- Jangan menyalin data produksi ke DEV/STAGING tanpa proses masking dan persetujuan.

## Status implementasi saat ini

| Item | Status |
|---|---|
| Definisi tiga environment di dokumentasi | Tersedia |
| Blok konfigurasi Worker DEV/STAGING/PROD di repository | Tersedia, URL/origin masih perlu diisi |
| Project Apps Script DEV | Belum diverifikasi; perlu inventarisasi akun Google |
| Project Apps Script STAGING | **Belum dibuat / belum diverifikasi** |
| Project Apps Script PROD | Belum diverifikasi dari repository |
| Spreadsheet terpisah dan aktual | DEV/PROD belum diverifikasi; STAGING belum dibuat |
| Secret unik per environment | Belum diverifikasi; STAGING belum dibuat |
| Uji isolasi runtime silang | Belum dilakukan |
| Deployment STAGING | Belum dilakukan |

Status di atas membedakan kesiapan konfigurasi repository dari keberadaan resource cloud yang sesungguhnya. File konfigurasi atau dokumentasi saja tidak membuktikan bahwa environment sudah aktif.

## Langkah berikutnya

1. Inventarisasi resource DEV dan PROD yang benar-benar ada pada akun Google dan Cloudflare.
2. Catat ID/URL aktual di password manager atau catatan operasional terbatas; jangan commit secret atau token ke Git.
3. Buat project Apps Script STAGING terpisah dan database STAGING kosong mengikuti [STAGING_SETUP_RUNBOOK.md](STAGING_SETUP_RUNBOOK.md).
4. Buat Pages STAGING dan isi konfigurasi Worker STAGING berdasarkan URL/origin aktual.
5. Jalankan checklist isolasi silang sebelum membuat akun UAT.
6. Setelah SIT/UAT lulus, ajukan promosi rilis ke PROD secara terpisah.

Lihat [Environment Isolation & Deployment Checklist](ENVIRONMENT_ISOLATION.md) untuk aturan teknis, konfigurasi, dan kriteria verifikasi.
