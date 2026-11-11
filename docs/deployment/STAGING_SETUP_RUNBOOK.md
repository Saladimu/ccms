# CCMS — STAGING Setup Runbook

## 1. Tujuan dan batasan

Runbook ini menyiapkan environment STAGING/UAT yang terisolasi dari DEV dan PROD. Gunakan akun Gmail khusus gereja sebagai pemilik resource, sesuai keputusan proyek.

**Tidak boleh dilakukan pada runbook ini:**
- Mengganti Script Properties pada project DEV atau PROD.
- Menyalin `CCMS_SPREADSHEET_ID`, `SESSION_SECRET`, URL deployment, atau token dari DEV/PROD.
- Menjalankan `setupDatabase()` pada project yang sudah memiliki database.
- Menggunakan data jemaat PROD di STAGING tanpa masking dan persetujuan.
- Membuat akun UAT sebelum STAGING lulus pemeriksaan koneksi dan isolasi.
- Deploy atau mengubah route Worker PROD.

## 2. Target resource STAGING

| Resource | Nama / nilai target |
|---|---|
| Google Apps Script project | `CCMS Backend (STG)` |
| Apps Script deployment | Web app khusus STAGING |
| Script Property | `CCMS_ENV=STAGING` |
| Spreadsheet | `CCMS-STAGING-DB` |
| Drive folder | `CCMS/STAGING` |
| Cloudflare Worker | `ccms-api-staging` |
| Pages publik | Project Pages khusus STAGING, mis. `ccms-staging-public` |
| Pages internal | Project Pages khusus STAGING, mis. `ccms-staging-internal` |
| Worker origin allowlist | Hanya origin Pages STAGING yang sebenarnya |
| Session secret | Dibuat baru oleh setup STAGING; jangan salin dari environment lain |

Nama project Pages di atas adalah konvensi yang disarankan, bukan resource yang telah dibuat. Domain `*.pages.dev` aktual baru diketahui setelah project dibuat.

## 3. Inventarisasi DEV dan PROD sebelum setup

Catat di password manager atau dokumen operasional terbatas (bukan Git):

- Nama project Apps Script dan Script ID.
- Deployment ID dan URL Web App `/exec`.
- Nilai `CCMS_ENV` dan keberadaan `CCMS_SPREADSHEET_ID` (catat status/ID secara aman, jangan tempel ke issue publik).
- Nama spreadsheet dan folder Drive.
- Nama Worker, environment, GAS URL tujuan, dan allowlist origin.
- Nama project Pages dan production/preview branch.

Pastikan resource DEV benar-benar terpisah dari PROD. Jangan menyimpulkan keberadaan resource hanya dari nama dalam konfigurasi repository.

## 4. Buat Apps Script STAGING

1. Login ke akun Gmail khusus gereja.
2. Buat project Apps Script baru dengan nama `CCMS Backend (STG)`. Jangan membuka project DEV/PROD untuk langkah ini.
3. Pastikan Script ID project baru dicatat di password manager.
4. Siapkan source dari branch/release kandidat yang telah disetujui. Jangan menyalin `clasp.json` milik project lain; hubungkan project baru menggunakan Script ID STAGING.
5. Push source yang telah direview ke project STAGING.
6. Buka Project Settings → Script Properties dan atur hanya:
   - `CCMS_ENV` = `STAGING`
7. Periksa bahwa `CCMS_SPREADSHEET_ID` belum ada. Jika sudah ada, **STOP** dan cari tahu siapa/apa yang membuatnya. Jangan jalankan setup ulang.
8. Periksa timezone project. Manifest repository saat ini mencantumkan `America/New_York`; konfirmasi timezone operasional gereja (kemungkinan `Asia/Jakarta`) sebelum deploy. Jangan mengubah project PROD dalam proses ini.

## 5. Buat database STAGING (langkah yang mengubah resource)

Jalankan hanya setelah project dan Script Properties diverifikasi oleh operator kedua.

1. Pastikan project yang terbuka benar-benar `CCMS Backend (STG)`.
2. Pastikan `CCMS_ENV=STAGING` dan `CCMS_SPREADSHEET_ID` kosong.
3. Jalankan fungsi `setupDatabase()` satu kali dari Apps Script Editor.
4. Fungsi saat ini membuat spreadsheet `CCMS-STAGING-DB`, folder `CCMS/STAGING`, 9 sheet termasuk `REVOKED_SESSIONS`, seed role/permission/menu, dan akun Super Admin awal.
5. Fungsi menghasilkan `SESSION_SECRET` baru dan menyimpan `CCMS_SPREADSHEET_ID` pada Script Properties project STAGING.
6. Fungsi mencetak password sementara admin ke execution log. Perlakukan log sebagai rahasia; jangan copy ke Git, chat, atau dokumen umum. Simpan sementara melalui kanal aman dan segera ganti password setelah login pertama.
7. Verifikasi spreadsheet dan folder berada di lokasi yang benar, 9 sheet terbuat, Script Properties menunjuk ke spreadsheet STAGING, dan akun awal memiliki `must_change_password=true`.

**Peringatan partial failure:** kode setup menulis `CCMS_SPREADSHEET_ID` sebelum memindahkan spreadsheet ke folder Drive. Jika eksekusi gagal setelah pointer tersimpan, jangan jalankan ulang. Catat ID spreadsheet yang sudah dibuat, periksa folder dan semua sheet, lalu lakukan recovery manual yang terkontrol.

## 6. Deploy Apps Script STAGING

1. Buat Web App deployment khusus STAGING.
2. Execute as: akun Gmail khusus gereja.
3. Access: Anyone, sesuai arsitektur Worker-to-Apps-Script saat ini; autentikasi/otorisasi tetap ditegakkan oleh backend.
4. Catat deployment ID dan URL `/exec` STAGING secara aman.
5. Jangan memakai URL DEV/PROD.

## 7. Siapkan Cloudflare Pages STAGING

Buat project Pages terpisah untuk portal publik dan aplikasi internal STAGING. Gunakan branch rilis STAGING yang telah disepakati, bukan branch PROD secara otomatis.

| Project | Publish directory | Domain |
|---|---|---|
| STAGING public | `frontend/public` | Domain `pages.dev` yang dibuat Cloudflare |
| STAGING internal | `frontend/internal` | Domain `pages.dev` yang dibuat Cloudflare |

Catat origin final kedua project. Jangan menebak nama domain sebelum Cloudflare membuatnya.

## 8. Konfigurasi dan deploy Worker STAGING

1. Isi hanya blok `[env.staging.vars]` pada `worker/wrangler.toml`:
   - `GAS_URL` = URL `/exec` Apps Script STAGING.
   - `ALLOWED_ORIGINS` = JSON array berisi origin public dan internal STAGING yang sebenarnya.
2. Pastikan blok DEV dan PROD tidak berubah.
3. Review diff untuk memastikan tidak ada URL/ID/secret PROD pada blok STAGING.
4. Jalankan test Worker/CI.
5. Setelah persetujuan operator kedua, deploy hanya dengan:

```bash
cd worker
npx wrangler deploy --env staging
```

Jangan jalankan deploy DEV atau PROD sebagai bagian dari langkah ini. Session secret tetap berada di Script Properties Apps Script, bukan di `wrangler.toml`.

## 9. Smoke test dan isolasi

- Worker STAGING mengembalikan `CONFIG_ERROR` jika GAS URL belum diisi; setelah konfigurasi, request publik mencapai backend STAGING.
- CORS menerima hanya origin Pages STAGING yang terdaftar.
- Login dan logout berjalan pada database STAGING.
- Data/akun uji yang dibuat di STAGING tidak muncul di DEV/PROD.
- Pastikan spreadsheet ID, GAS URL, dan session secret STAGING berbeda dari DEV/PROD.
- Uji endpoint publik dan endpoint tanpa token/ber-token sesuai SIT; jangan gunakan data jemaat nyata.
- Simpan Worker version ID, Apps Script deployment ID, URL, tanggal, operator, dan hasil tes dalam catatan rilis terbatas.

Akun UAT `uat.admin` dan `uat.pastor` baru boleh dibuat setelah semua pemeriksaan di atas lulus dan ada persetujuan eksplisit untuk seed akun pada STAGING.

## 10. Exit criteria STAGING

STAGING dinyatakan siap UAT hanya jika:
- [ ] Apps Script project dan deployment STAGING terpisah.
- [ ] Spreadsheet dan folder Drive STAGING terpisah.
- [ ] `CCMS_ENV=STAGING`; spreadsheet pointer dan session secret milik STAGING.
- [ ] Worker STAGING hanya mengarah ke Apps Script STAGING.
- [ ] Pages public/internal STAGING terpisah dan allowlist CORS tepat.
- [ ] CI dan smoke test lulus.
- [ ] Checklist isolasi silang DEV/STAGING/PROD lulus.
- [ ] Deployment ID/version dan rollback reference tercatat.
- [ ] Persetujuan pemilik sistem untuk membuka UAT diperoleh.

**Status saat runbook ditulis:** persiapan dokumentasi saja. Tidak ada project, spreadsheet, folder, secret, deployment, Worker, Pages, atau akun UAT yang dibuat oleh perubahan ini.
