# CCMS — Phase 1 BRD Compliance Audit

**Repository:** `Saladimu/ccms`  
**Audit branch:** `audit/phase1-brd-compliance`  
**Baseline BRD:** `CCMS_Master_Requirements_and_Project_Framework.md`  
**Audit type:** Initial source-code and documentation review (desk audit)  
**Audit date:** 11 November 2026  
**Status:** Draft — runtime verification and UAT are still required

---

## 1. Tujuan dan batasan audit

Audit ini mencocokkan isi repository dengan kebutuhan dan keputusan pada dokumen induk CCMS. Fokus pemeriksaan awal adalah fondasi yang menjadi prasyarat implementasi modul operasional: project foundation, backend/API, autentikasi dan otorisasi, database/configuration, public portal, serta internal dashboard.

Audit ini **tidak** mengubah source code, database produksi, konfigurasi Cloudflare, Apps Script, maupun data gereja. Pemeriksaan dilakukan melalui source code dan dokumentasi yang tersedia pada branch `main`.

Status audit:

- **Implemented & Verified (source):** implementasi dapat ditelusuri langsung di source. Ini belum otomatis berarti runtime/UAT telah lulus.
- **Implemented — Verification Required:** source atau dokumentasi menunjukkan implementasi, tetapi pengujian runtime, konfigurasi aktual, atau bukti UAT belum tersedia.
- **Partial / Gap:** hanya sebagian kebutuhan yang terpenuhi atau implementasinya belum sesuai BRD.
- **Not Found in Repository:** belum ditemukan implementasi/bukti pada file yang diperiksa; tidak otomatis berarti tidak ada di lingkungan eksternal.
- **Deferred by Roadmap:** memang dialokasikan ke tahap implementasi berikutnya.

> Istilah “Phase” pada dokumen induk (Phase 1–7: perencanaan/desain/framework) berbeda dari “Tahap” pada `ROADMAP_3_TAHAPAN.md` (Tahap 1–3: urutan implementasi). Audit ini menilai **Tahap Implementasi 1** menurut roadmap, bukan menganggap seluruh Phase 1–5 perencanaan sebagai pekerjaan coding.

## 2. Ringkasan eksekutif

**Kesimpulan sementara: Tahap Implementasi 1 belum layak dinyatakan selesai atau Production Ready berdasarkan bukti repository saat ini.**

Repository memiliki fondasi nyata: Cloudflare Worker, Apps Script, delapan sheet inti yang didefinisikan dalam setup, endpoint publik dan internal, autentikasi dasar, konfigurasi menu, dan halaman login/dashboard awal.

Namun terdapat gap penting:
1. RBAC yang berjalan di backend belum menerapkan matriks enam role yang diklaim dokumentasi. Role non-Super Admin saat ini mendapat permission hardcoded `SCHEDULE_VIEW` dan `REPORT_VIEW`.
2. Mekanisme logout hanya mencatat audit dan mengembalikan sukses; belum mencabut atau memblokir token yang sudah diterbitkan.
3. Hash password dan pembuatan salt menggunakan implementasi iterated SHA-256 manual serta `Math.random()`; perlu remediation keamanan sebelum dipakai untuk akun operasional.
4. Public Portal masih menampilkan placeholder untuk jadwal, pengumuman, dan kegiatan; halaman lain juga belum terbukti mempunyai konten yang memenuhi kebutuhan BRD.
5. Pemisahan DEV/STAGING/PROD dijelaskan dalam dokumen deployment, tetapi file konfigurasi yang diperiksa masih menunjukkan konfigurasi default dan setup database hardcoded ke DEV.
6. Kriteria exit seperti endpoint test, lintas-role test, UAT dua role, deployment/rollback teruji, serta bukti live tidak dapat dibuktikan hanya dari source.

Tidak ada pengujian terhadap akun, database, atau deployment produksi yang dilakukan dalam audit desk ini. Karena itu, klaim “live”, “production”, “working”, dan “UAT passed” harus diperlakukan sebagai klaim dokumentasi sampai bukti uji tersedia.

## 3. Matriks kepatuhan Tahap Implementasi 1

| ID | Kebutuhan / kriteria | Bukti repository | Status awal | Tindakan / bukti lanjutan |
|---|---|---|---|---|
| A1-01 | Struktur project dan pemisahan frontend, Worker, Apps Script, docs | Struktur folder tersedia: `frontend/`, `worker/`, `backend/apps-script/`, `docs/`, `deployment/` | Implemented — Verification Required | Verifikasi konfigurasi build dan deployment aktual |
| A1-02 | DEV, STAGING, PROD terpisah | Deployment docs menjelaskan tiga environment; `worker/wrangler.toml` hanya memiliki vars default dan contoh env yang dikomentari; `SetupDatabase.gs` hardcoded `CCMS-DEV-DB` dan `CCMS/DEV` | Partial / Gap | Siapkan konfigurasi eksplisit per environment; bukti pair Worker–GAS–Sheets–Drive terpisah |
| A1-03 | Worker sebagai API gateway, CORS, timeout, cache publik | `worker/src/index.js` mengimplementasikan gateway, CORS, timeout, dan cache action publik | Implemented — Verification Required | Uji origin yang diizinkan/ditolak, timeout, cache isolation, dan error upstream |
| A1-04 | Apps Script satu entry point dan standar response/error | `Code.gs` memproses `doPost`, route, auth, permission, handler, serta response JSON | Implemented — Verification Required | Uji payload invalid, action tidak dikenal, error handler, dan status mapping |
| A1-05 | Akses publik tanpa login | `Router.gs` menyediakan `public.info` dan `public.page` tanpa session | Implemented — Verification Required | Uji endpoint dari browser tanpa token |
| A1-06 | Endpoint privat wajib sesi valid | `Code.gs` memanggil `Auth.verifyToken` untuk route `needsSession` | Implemented — Verification Required | Uji token hilang, rusak, kedaluwarsa, dan token yang sudah logout |
| A1-07 | RBAC berdasarkan role dan permission di backend | `Code.gs` memeriksa permission; tetapi `Auth.getUserRolesAndPermissions` hanya memberi seluruh permission kepada SUPER_ADMIN dan hardcode dua permission kepada role lain | Partial / Gap — Critical | Implementasikan role-permission mapping sesuai matriks yang disetujui; uji setiap role dan setiap route |
| A1-08 | Login dan manajemen akun internal | `Auth.gs`, `Users.gs`, `Router.gs` menyediakan login, list/create/update/reset password, assign/revoke role | Implemented — Verification Required | Uji CRUD, validasi input, unique username, deaktivasi, reset, dan role assignment |
| A1-09 | Lockout 3 gagal berturut-turut selama 5 menit | Implementasi counter dan `locked_until` ada di `Auth.gs`; konfigurasi default disediakan | Implemented — Verification Required | Uji 1–2 gagal, gagal ke-3, percobaan saat lockout, setelah 5 menit, dan reset setelah login sukses |
| A1-10 | Password disimpan dengan hashing yang sesuai dan salt aman | `Auth.gs` memakai iterated SHA-256 manual 50.000 iterasi; salt dibuat dengan `Math.random()` | Partial / Gap — High | Ganti dengan password KDF standar yang tersedia dan sumber random kriptografis; migrasi hash lama secara aman |
| A1-11 | Sesi berjangka dan logout mengakhiri sesi | JWT memiliki `exp`; `Auth.logout` hanya menulis audit log dan mengembalikan `loggedOut: true` | Partial / Gap — High | Tambahkan revocation/session registry atau desain logout yang benar-benar membatalkan sesi; uji replay token |
| A1-12 | Konfigurasi sistem dan feature flags | `Config.gs` membaca CONFIG, menyamarkan nilai secret pada apiGet, dan menyediakan apiSet; data dictionary mendefinisikan `AI_ASSISTANT_ENABLED` | Implemented — Verification Required | Uji pembatasan SYSTEM_CONFIG, secret non-disclosure, perubahan config, dan backend enforcement. Fitur AI sendiri Deferred ke Tahap 3 |
| A1-13 | Menu publik ON / OFF_HIDDEN / OFF_MAINTENANCE tanpa redeploy | `PublicMenu.gs` mengubah status; `Public.gs` menolak menu OFF dan menampilkan maintenance message | Implemented — Verification Required | Uji ketiga status, cache invalidation/TTL, dan akses langsung ke endpoint menu OFF |
| A1-14 | Portal publik sesuai BRD: Beranda, Profil Gereja, Jadwal Ibadah, Pengumuman Publik, Kegiatan & Kalender, Informasi Komisi/Pelayanan, Kontak Gereja | BRD §1.4 menyebut tujuh kelompok informasi. `SetupDatabase.gs` hanya men-seed enam menu (home, schedule, announcements, events, profile, contact), tanpa menu komisi/pelayanan. `Public.gs` memberi placeholder untuk schedule/announcements/events dan tidak mengimplementasikan konten komisi/pelayanan. `frontend/public/index.html` merender semua halaman sebagai judul menu + satu pesan generik, termasuk home/profile/contact | Partial / Gap — High | Petakan seluruh tujuh kelompok menu ke konten yang sesuai BRD; implementasikan data dan rendering, termasuk kalender serta informasi komisi/pelayanan; uji seluruh halaman dan menu dinamis |
| A1-15 | Konsistensi antara Public Portal Tahap 1 dan modul operasional Tahap 2 | BRD §1.4 secara eksplisit memasukkan jadwal, pengumuman, kegiatan/kalender dan informasi komisi/pelayanan ke Public Portal. Roadmap Tahap 1 WP-05 secara eksplisit mencakup Beranda, Profil, Kontak; Tahap 2 membangun data operasional yang dapat menjadi sumber konten dinamis. Ini berarti menu/halaman portal tetap harus mengikuti BRD; sumber konten dapat dipenuhi bertahap (konten awal/statis atau integrasi modul Tahap 2) sesuai keputusan produk | Partial / Gap — High | Jangan menganggap menu placeholder sebagai pemenuhan BRD. Tentukan sumber konten awal untuk Tahap 1 dan integrasi data dinamis saat Tahap 2; semua tujuh kelompok informasi harus memiliki perilaku/isi yang jelas |
| A1-16 | Internal login dan dashboard skeleton | `frontend/internal/index.html` memiliki login, penyimpanan token localStorage, tampilan dashboard awal dan logout UI | Partial / Gap | UAT skeleton minimal dua role; evaluasi penyimpanan token dan implementasi dashboard sesuai permission |
| A1-17 | Semua penulisan sheet melewati LockService | `Db.write` menggunakan ScriptLock untuk operasi append/update | Implemented — Verification Required | Audit seluruh jalur mutasi; uji concurrency, kegagalan parsial, dan validasi data sebelum write |
| A1-18 | Audit log aktivitas penting | `Audit.gs` append log dan menyediakan list; beberapa operasi memanggil Audit.log | Implemented — Verification Required | Pastikan cakupan aksi, integritas log, akses baca, dan kegagalan audit tidak menyembunyikan error penting |
| A1-19 | Endpoint publik tidak dapat mengakses fungsi internal; role A tidak dapat fungsi role B | Route privat memerlukan session dan permission, tetapi permission non-Super Admin belum sesuai matriks | Partial / Gap — Critical | Automated/manual authorization test matrix, termasuk direct API call tanpa UI |
| A1-20 | Deployment Pages, Worker, Apps Script dan rollback terdokumentasi/teruji | Panduan deployment tersedia; bukti deployment aktual dan rollback drill tidak ada dalam source docs yang diperiksa | Implemented documentation — Verification Required | Lampirkan release ID, deployment version, environment map, rollback runbook, dan hasil rollback test |
| A1-21 | UAT dashboard minimal dua role disetujui | Tidak ditemukan bukti UAT bertanda persetujuan | Not Found in Repository | Buat test case, hasil UAT, nama/peran tester (tanpa data sensitif), tanggal dan approval |
| A1-22 | Portal publik live di URL produksi | README mencantumkan URL Pages/Worker; tidak ada hasil smoke test bertanggal di repository | Implemented claim — Verification Required | Smoke test URL produksi dan simpan hasil (HTTP, halaman, endpoint, timestamp) |

## 4. Temuan teknis prioritas

### P0 — RBAC belum sesuai BRD

**File:** `backend/apps-script/Auth.gs`, fungsi `getUserRolesAndPermissions`; `backend/apps-script/Code.gs`; `backend/apps-script/Router.gs`.

Backend sudah melakukan pemeriksaan permission, tetapi sumber permission untuk role non-Super Admin bukan matriks role-permission. Kode memberikan `SCHEDULE_VIEW` dan `REPORT_VIEW` kepada semua role non-Super Admin. Dampaknya, dokumentasi yang menyebut hak Pendeta/Majelis, Sekretaris/Admin, Bendahara Pusat, Pengurus Komisi, dan Petugas Pelayanan tidak tercermin dalam enforcement aktual.

**Kriteria perbaikan:** permission dihitung dari relasi role-permission yang tersimpan/terdefinisi secara eksplisit; setiap endpoint privat memiliki permission yang tepat; pembatasan scope komisi diterapkan di backend; direct API tests membuktikan deny-by-default.

### P0 — Logout belum mencabut sesi

**File:** `backend/apps-script/Auth.gs`, fungsi `logout` dan `verifyToken`.

Logout saat ini mencatat audit lalu mengembalikan sukses. Token tetap dapat dipakai sampai kedaluwarsa jika tidak ada mekanisme revocation lain di luar source yang diperiksa.

**Kriteria perbaikan:** token/session yang sudah logout ditolak pada request berikutnya; perilaku diuji dengan replay token yang sama setelah logout.

### P1 — Password hashing dan salt

**File:** `backend/apps-script/Auth.gs`.

Dokumentasi dan source menyebut iterated SHA-256 manual. Salt dibuat dari `Math.random()`, yang tidak cocok untuk menghasilkan material kriptografis. Ini perlu diperbaiki sebelum akun gereja digunakan secara luas.

**Kriteria perbaikan:** gunakan algoritma password hashing/KDF standar dengan parameter yang sesuai kemampuan runtime; gunakan sumber random kriptografis; sediakan strategi migrasi hash lama dan pengujian verifikasi.

### P1 — Portal publik belum memenuhi keseluruhan pengalaman yang dijanjikan

**File:** `backend/apps-script/Public.gs`, `frontend/public/index.html`.

Endpoint mengembalikan placeholder untuk jadwal, pengumuman, dan kegiatan. Frontend menampilkan pesan umum berdasarkan menu, bukan konten halaman lengkap. Profil/kontak juga belum terbukti mempunyai halaman konten yang lengkap.

**Kriteria perbaikan:** petakan tiap menu ke sumber konten dan acceptance criteria. Item yang menjadi scope Tahap 2 harus dinyatakan deferred secara eksplisit, bukan dihitung sebagai fitur Tahap 1 yang selesai.

### P1 — Konfigurasi environment tidak konsisten dengan target tiga environment

**File:** `worker/wrangler.toml`, `backend/apps-script/tools/SetupDatabase.gs`, deployment README.

Dokumentasi menyatakan DEV/STAGING/PROD harus terpisah. Konfigurasi Worker yang diperiksa hanya menunjukkan vars default; contoh staging/production masih komentar. Setup database membuat spreadsheet DEV secara hardcoded dan folder default DEV.

**Kriteria perbaikan:** konfigurasi environment eksplisit, tanpa secret di source; tiap environment memiliki Worker, Apps Script deployment, Spreadsheet, Drive folder, origin, dan Script Properties terpisah; bukti uji memastikan tidak ada koneksi silang.

### P2 — Token disimpan di localStorage

**File:** `frontend/internal/index.html`.

Token sesi disimpan di `localStorage`. Ini meningkatkan dampak jika terjadi XSS karena JavaScript pada origin yang sama dapat membaca token.

**Kriteria perbaikan:** evaluasi pola sesi yang lebih aman (misalnya cookie HttpOnly/Secure/SameSite melalui arsitektur yang mendukungnya), proteksi XSS, expiry, dan logout. Jangan menganggap localStorage otomatis berarti ada eksploitasi; ini adalah risiko desain yang perlu dimitigasi.

### P2 — Artefak tooling Cloudflare berada di repository

Tree repository memperlihatkan direktori `.wrangler/cache/` pada root dan di bawah `worker/`. Tinjau apakah artefak lokal tersebut perlu dihapus dari Git dan dimasukkan ke `.gitignore`. Jangan commit token atau secret tooling.

## 5. Kebutuhan yang memang dialokasikan ke Tahap 2 dan 3

Hal-hal berikut tidak dinilai sebagai kegagalan Tahap Implementasi 1 apabila roadmap yang disetujui tetap menjadi acuan:

**Tahap 2 — Modul Operasional**
- Data jemaat dan keluarga.
- Pendaftaran publik serta verifikasi Sekretaris/Admin.
- NIK optional dengan duplicate warning non-blocking.
- Archive/restore tanpa hard delete.
- Impor/migrasi data jemaat.
- Komisi, keanggotaan, pengurus, jadwal pelayanan.
- Pengumuman dan approval berdasarkan kategori.
- Kegiatan, pendaftaran peserta, dokumentasi.
- Dashboard internal penuh per role.

**Tahap 3 — Keuangan, AI dan Go-Live**
- Kas pusat dan pencatatan kas per komisi dengan kewenangan terpusat pada Bendahara Pusat.
- Transaksi tunai/transfer, verifikasi transfer, idempotency, kuitansi PDF dan bukti pembayaran di Drive.
- Gemini AI ON/OFF global oleh Super Admin, permission per role, backend enforcement, AI draft-only.
- Monitoring, backup/recovery, final UAT, pelatihan, dan go-live.

Catatan: jadwal ibadah dan informasi publik muncul dalam BRD Public Portal, sedangkan roadmap menempatkan data kegiatan/pengumuman operasional pada Tahap 2. Pemilik proyek perlu mengonfirmasi apakah portal Tahap 1 harus menampilkan konten statis/konfigurasi awal atau menu tersebut boleh tetap placeholder sampai Tahap 2.

## 6. Inkonsistensi dokumentasi yang perlu dibereskan

1. `README.md` menyatakan Tahap 1 “SELESAI & LIVE” dan beberapa komponen “Production/Working”, sementara `TAHAP1_IMPLEMENTASI_SELESAI.md` menyebut frontend “Ready to deploy” dan status “ready for UAT”. Status tersebut tidak sepenuhnya konsisten.
2. Dokumen induk menyebut Phase 6 coding belum dimulai pada saat dokumen disusun, tetapi repository sudah berisi source implementasi Tahap 1. Perlu catatan perubahan/status terbaru agar pembaca tidak salah memahami fase perencanaan vs tahap implementasi.
3. Dokumentasi RBAC menjelaskan matriks enam role, tetapi source backend belum menerapkannya.
4. README menyatakan kredensial default secara eksplisit. Kredensial default tidak boleh dipertahankan sebagai akses aktif; pastikan sudah diganti dan jangan publikasikan password dalam dokumentasi.
5. `TAHAP1_IMPLEMENTASI_SELESAI.md` menyebut 23 permission; audit perlu mencocokkan seed, data dictionary, dan enforcement code, bukan hanya angka total.

## 7. Rencana audit lanjutan dan exit gate

### Gate A — Source review lengkap
- [ ] Cocokkan seluruh 23 permission di data dictionary, seed setup, route map, dan UI.
- [ ] Periksa seluruh operasi Users/Config/PublicMenu/Audit untuk validasi dan permission.
- [ ] Periksa Worker CORS/cache/timeout dan secret handling.
- [ ] Periksa seluruh frontend untuk token handling, output encoding, dan navigasi berbasis permission.
- [ ] Tinjau `.gitignore`, artefak tooling, dan kemungkinan credential/secret exposure.

### Gate B — Security & API tests
- [ ] Login valid/invalid.
- [ ] Lockout setelah 3 kegagalan berturut-turut dan pulih setelah 5 menit.
- [ ] Token invalid/expired/revoked ditolak.
- [ ] Logout membuat token tidak dapat digunakan kembali.
- [ ] Setiap role diuji terhadap setiap endpoint privat (allow/deny).
- [ ] Public endpoint tidak mengungkap data privat.
- [ ] CORS hanya menerima origin yang diizinkan.
- [ ] Secret tidak pernah dikembalikan melalui API atau frontend.

### Gate C — Database & environment tests
- [ ] Delapan sheet memiliki header sesuai data dictionary.
- [ ] Semua write path menggunakan LockService dan validasi backend.
- [ ] Concurrency test untuk update/append.
- [ ] DEV/STAGING/PROD terpisah dan tidak saling menunjuk.
- [ ] Backup dan pemulihan database diuji untuk scope yang diwajibkan Tahap 1.

### Gate D — Portal, dashboard, deployment & UAT
- [ ] Portal publik diuji di smartphone dan desktop.
- [ ] Menu ON/OFF_HIDDEN/OFF_MAINTENANCE diuji termasuk direct URL/API.
- [ ] Dashboard skeleton diuji minimal dua role berbeda.
- [ ] Smoke test URL production dan API disimpan.
- [ ] Prosedur deploy dan rollback benar-benar diuji.
- [ ] UAT ditandatangani/di-approve oleh perwakilan gereja.

**Tahap Implementasi 1 baru dapat dinyatakan selesai setelah seluruh exit criteria pada `docs/requirements/ROADMAP_3_TAHAPAN.md` dipenuhi, bukti uji disimpan, dan pemilik proyek menyetujui hasil UAT.**

## 8. Keputusan yang dibutuhkan dari pemilik proyek

1. Konfirmasi bahwa menu Jadwal, Pengumuman, dan Kegiatan boleh tetap placeholder sampai Tahap 2, atau perlu konten awal di Tahap 1.
2. Konfirmasi apakah audit berikutnya boleh melakukan smoke test ke URL production (read-only; tidak mengubah data).
3. Tentukan siapa perwakilan gereja untuk UAT dua role dan persetujuan exit gate.

---

## Referensi repository yang diperiksa

- `CCMS_Master_Requirements_and_Project_Framework.md`
- `README.md`
- `docs/requirements/ROADMAP_3_TAHAPAN.md`
- `docs/requirements/TAHAP1_IMPLEMENTASI_SELESAI.md`
- `docs/database/DATA_DICTIONARY_TAHAP1.md`
- `backend/apps-script/Code.gs`
- `backend/apps-script/Router.gs`
- `backend/apps-script/Auth.gs`
- `backend/apps-script/Users.gs`
- `backend/apps-script/Config.gs`
- `backend/apps-script/Db.gs`
- `backend/apps-script/Public.gs`
- `backend/apps-script/PublicMenu.gs`
- `backend/apps-script/Audit.gs`
- `backend/apps-script/tools/SetupDatabase.gs`
- `frontend/public/index.html`
- `frontend/internal/index.html`
- `worker/src/index.js`
- `worker/wrangler.toml`
- `deployment/cloudflare/README.md`
- `deployment/google/README.md`


## 9. Hasil pencocokan khusus Public Portal terhadap BRD

Pemilik proyek telah menegaskan bahwa Public Portal harus mengikuti BRD awal. Dengan demikian, acuan kebutuhan portal adalah **BRD §1.4**, bukan hanya daftar pekerjaan minimum WP-05 pada roadmap.

| Kelompok informasi BRD §1.4 | Temuan source saat ini | Hasil |
|---|---|---|
| Beranda | Menu `home` tersedia, tetapi `Public.page` tidak menyediakan konten khusus; frontend menampilkan pesan generik | Gap |
| Profil gereja | Menu `profile` tersedia; tidak ada konten profil khusus yang dirender | Gap |
| Jadwal ibadah | Menu tersedia; backend mengembalikan placeholder | Gap |
| Pengumuman publik | Menu tersedia; backend mengembalikan array kosong dan pesan placeholder | Gap |
| Kegiatan dan kalender | Menu `events` tersedia; backend mengembalikan array kosong dan pesan placeholder; tidak ada tampilan kalender | Gap |
| Informasi komisi/pelayanan | Tidak ditemukan menu seed atau handler konten publik khusus | Gap |
| Kontak gereja | Konfigurasi alamat/telepon/email tersedia di `Public.info`, tetapi frontend tidak merender halaman kontak khusus | Partial / Gap |

**Kesimpulan portal:** enam menu seed bukan bukti pemenuhan tujuh kelompok informasi BRD. Data identitas gereja yang dikirim backend juga belum cukup jika tidak ditampilkan pada halaman yang relevan. Setiap kelompok informasi perlu memiliki definisi konten, sumber data, tampilan, kondisi kosong, dan perilaku ketika OFF/HIDDEN/MAINTENANCE.

Roadmap Tahap 1 WP-05 menuliskan Beranda, Profil, dan Kontak sebagai pekerjaan portal awal, sedangkan jadwal/pengumuman/kegiatan memiliki ketergantungan pada modul operasional Tahap 2. Interpretasi yang konsisten adalah: **kerangka portal dan seluruh navigasi/halaman harus disiapkan sesuai BRD; konten yang memerlukan data operasional dapat dimulai dengan konten awal yang disetujui, lalu dihubungkan ke modul Tahap 2.** Placeholder teknis tidak boleh dianggap sebagai hasil akhir yang memenuhi BRD.

## 10. Smoke test production — status percobaan

Pemilik proyek menyetujui smoke test read-only. Pada sesi audit ini, percobaan akses ke URL yang tercantum dalam README dilakukan untuk:

- `https://ccms-public.pages.dev`
- `https://ccms-internal.pages.dev`
- `https://ccms-api.ccms-gereja.workers.dev/api`

**Hasil: belum dapat dieksekusi dari lingkungan audit ini.** Pembukaan URL melalui browser riset mengembalikan status tidak dapat diakses; percobaan koneksi langsung juga gagal pada resolusi DNS (`Temporary failure in name resolution`). Ini adalah keterbatasan konektivitas alat audit, bukan bukti bahwa layanan production down.

Karena itu:
- Status production runtime tetap **Not Verified**.
- Belum ada klaim HTTP status, response API, waktu respons, cache HIT/MISS, ataupun keberhasilan render browser.
- Tidak ada request mutasi atau perubahan data yang dilakukan.
- Smoke test perlu diulang dari browser/jaringan yang dapat mengakses domain tersebut atau melalui runner yang memiliki akses jaringan. Pengujian API publik sebaiknya hanya memanggil `public.info` dan `public.page` untuk menu yang ON; jangan mengirim action privat atau melakukan operasi tulis.

## 11. Keputusan dan tindak lanjut yang telah dikonfirmasi

- Public Portal harus memenuhi kelompok informasi pada BRD §1.4.
- Smoke test production read-only disetujui, tetapi hasil percobaan saat ini terhalang keterbatasan DNS/konektivitas alat.
- UAT belum dijadwalkan. Saat disusun nanti, UAT dashboard minimal melibatkan dua role berbeda; pemilihan role dan perwakilan gereja dibahas terpisah.
- Belum ada perubahan source aplikasi, konfigurasi production, atau data produksi.
