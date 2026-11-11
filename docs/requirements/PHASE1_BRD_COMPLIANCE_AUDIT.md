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


## 12. Audit lanjutan — sesi, konfigurasi, dan data access

Pemeriksaan tambahan terhadap frontend internal dan modul konfigurasi menemukan beberapa hal berikut.

| ID | Area | Temuan source | Risiko / dampak | Rekomendasi |
|---|---|---|---|---|
| S-01 | Session logout | Frontend mengirim `auth.logout` dan menghapus token dari `localStorage`; backend hanya menulis audit log. | Penghapusan token di browser tidak membatalkan salinan token lain. Token lama tetap valid sampai expiry. | Terapkan revocation server-side dan uji token replay setelah logout. |
| S-02 | Deaktivasi akun | `Users.update` dapat mengubah `is_active`, tetapi `Code.gs` memvalidasi token lalu menghitung role tanpa memeriksa status aktif akun pada setiap request. | Akun yang dinonaktifkan berpotensi tetap memakai sesi yang telah diterbitkan sampai token kedaluwarsa. | Pada setiap request privat, pastikan user masih ada dan `is_active=true`; cabut seluruh sesi saat akun dinonaktifkan. |
| S-03 | Config validation | `Config.apiSet` memeriksa key ada dan melarang `SESSION_SECRET`, tetapi menulis nilai sebagai string tanpa validasi berdasarkan `value_type` atau daftar key yang boleh diubah. | Nilai boolean/number/enum dapat diisi tidak valid dan mengganggu perilaku runtime. | Validasi tipe, enum, panjang, dan izin perubahan per key di backend; jangan mengandalkan UI. |
| S-04 | Audit log detail | `Config.apiSet` menulis nilai konfigurasi baru ke detail audit (`to: value`). | Jika suatu key sensitif ditambahkan di masa depan, nilainya berpotensi tersimpan dalam audit log. | Redaksi nilai sensitif; catat nama key dan metadata perubahan tanpa menyimpan secret. |
| S-05 | Public content rendering | `frontend/public/index.html` memasukkan beberapa nilai response ke `innerHTML`, termasuk pesan maintenance/konten halaman. | Jika nilai konfigurasi atau konten kelak berisi HTML/script tidak tepercaya, dapat membuka risiko stored/reflected XSS. | Gunakan DOM API dan `textContent` untuk teks; sanitasi HTML hanya bila rich text memang diperlukan. |
| S-06 | UI role-based | Dashboard saat ini hanya menampilkan link placeholder untuk Dashboard, Pengguna & Role, Pengaturan Sistem, dan Audit Log berdasarkan permission. | Ini baru skeleton; link belum menjadi modul operasional. | Tetap klasifikasikan sebagai dashboard parsial; validasi backend tetap menjadi otoritas izin. |

### Catatan positif

- Frontend mengirim token sebagai field top-level `token`; Worker meneruskannya ke Apps Script sebagai `meta.token`, sesuai kontrak `Code.gs`.
- `Config.apiGet` menyamarkan nilai yang ditandai `is_secret=TRUE`.
- `Db.write` memakai ScriptLock untuk operasi append/update.
- `Users.list` tidak mengembalikan `password_hash`.

Temuan di atas adalah review source, bukan bukti eksploitasi atau hasil penetration test. Risiko perlu dikonfirmasi melalui test terkontrol sebelum implementasi remediasi.


## 13. Audit RBAC — pencocokan BRD, data dictionary, seed, dan enforcement backend

**Ruang lingkup pemeriksaan:** Auth.gs, Users.gs, Router.gs, Code.gs, SetupDatabase.gs, DATA_DICTIONARY_TAHAP1.md, BRD §1.3/§1.5, serta Roadmap Tahap 1 §1.2/§1.3/§1.4.

### 13.1 Ringkasan hasil

**Kesimpulan: RBAC baru tersedia pada tingkat kerangka (role seed, relasi user-role, dan pemeriksaan permission per route), tetapi belum memenuhi rancangan hak akses berbasis peran.** Backend belum menghitung permission dari relasi role-permission. Semua pengguna non-Super Admin menerima daftar permission hardcoded yang sama, sehingga perbedaan kewenangan antar-role tidak ditegakkan.

| Area BRD / Tahap 1 | Kebutuhan BRD / roadmap | Hasil yang ditemukan di repository | Status |
|---|---|---|---|
| Identitas role | Enam role internal sesuai kebutuhan gereja | Seed enam role: SUPER_ADMIN, PASTOR, SECRETARY, TREASURER, COMMITTEE_HEAD, STAFF | Sesuai — struktur |
| Relasi pengguna-role | Satu pengguna dapat memiliki role; role dikelola Super Admin | Sheet USER_ROLES dan operasi assign/revoke tersedia | Sebagian — belum seluruh aturan integritas |
| Matriks role-permission | Hak akses berbeda sesuai tanggung jawab masing-masing role; minimal matriks final untuk role Tahap 1 harus tersedia sebelum implementasi | Tidak ada sheet/relasi ROLE_PERMISSIONS atau mapping eksplisit role → permission; fungsi Auth memakai daftar hardcoded | **Belum sesuai — Critical** |
| Backend authorization | Setiap endpoint privat memeriksa session dan permission di backend | Code.gs memeriksa route.permission; Router memberi permission pada beberapa route | Sebagian — mekanisme ada, matriks sumbernya salah/tidak lengkap |
| Least privilege | Pengguna hanya menerima hak yang diperlukan untuk tugasnya | Semua non-Super Admin memperoleh SCHEDULE_VIEW dan REPORT_VIEW; Super Admin memperoleh seluruh permission aktif termasuk permission Tahap 2/3 | **Belum sesuai — Critical** |
| Pembatasan komisi | Pengurus Komisi hanya melihat data/laporan komisinya sesuai izin | Modul dan endpoint komisi belum ada (Tahap 2); belum ada model scope komisi pada RBAC | Deferred untuk modul; desain scope perlu disiapkan |
| Direct API deny | Pengguna role A tidak dapat menjalankan fungsi role B melalui pemanggilan API langsung | Pemeriksaan route.permission ada, tetapi role-permission yang dihitung tidak mewakili hak role; belum ada bukti test allow/deny | **Belum terverifikasi / Gap — Critical** |
| Siklus hidup role | Assign/revoke harus valid, tercatat, dan tidak menghilangkan Super Admin terakhir | Assign mengabaikan kode role yang tidak ditemukan; revoke mengosongkan baris relasi; tidak terlihat guard Super Admin terakhir | Sebagian / Gap |
| Endpoint tanpa permission spesifik | Endpoint privat tetap harus dibatasi sesuai kebutuhan | auth.me, auth.logout, menu.list hanya memerlukan session; ini dapat diterima untuk fungsi sesi/menu baca jika memang disengaja, tetapi perlu keputusan dan uji | Perlu konfirmasi desain |

### 13.2 Tabel BRD vs implementasi per role

BRD §1.3 menjelaskan kebutuhan utama tiap role, sedangkan BRD §1.5 mensyaratkan dashboard/menu disesuaikan dengan hak akses dan backend memeriksa otorisasi. Tabel berikut membedakan kebutuhan bisnis dari hasil enforcement source saat ini.

| Role | Kebutuhan menurut BRD | Bukti implementasi di repo | Penilaian Tahap 1 |
|---|---|---|---|
| Super Admin | Mengelola konfigurasi, akun, role, permission, dan fitur | Role disemai; mendapat semua permission aktif; route untuk users/roles, menu, config, audit tersedia | Sebagian — fitur administrasi dasar ada; semua permission aktif lintas Tahap 2/3 ikut diberikan; tidak ada pengelolaan permission catalog/role matrix yang lengkap |
| Pendeta/Majelis | Melihat ringkasan dan melakukan persetujuan sesuai kewenangan | Role disemai, tetapi tidak ada mapping permission khusus; mendapat SCHEDULE_VIEW + REPORT_VIEW | Belum sesuai — belum ada hak khusus dan dashboard masih skeleton |
| Sekretaris/Admin | Mengelola data jemaat, pengumuman, surat, dan administrasi | Role disemai, tetapi tidak ada mapping khusus; mendapat SCHEDULE_VIEW + REPORT_VIEW | Belum sesuai — modul jemaat/pengumuman/surat memang Tahap 2, namun matriks hak minimal seharusnya sudah dirancang |
| Bendahara Pusat | Mengelola seluruh kas dan transaksi | Role disemai, tetapi tidak ada mapping khusus; mendapat SCHEDULE_VIEW + REPORT_VIEW | Sebagian/Deferred — modul keuangan Tahap 3; hak role belum didefinisikan dan tidak boleh disimpulkan telah diimplementasikan |
| Pengurus Komisi | Mengelola informasi dan melihat laporan komisinya sesuai izin | Role disemai, tetapi tidak ada mapping khusus atau pembatasan scope komisi | Sebagian/Deferred — modul komisi Tahap 2; desain role dan scope belum ditegakkan |
| Petugas Pelayanan | Melihat jadwal dan tugas pelayanan sesuai izin | Role disemai; mendapat SCHEDULE_VIEW + REPORT_VIEW | Sebagian — permission jadwal diberikan secara generik, tetapi belum ada endpoint operasional jadwal dan hak tugas yang spesifik |

### 13.3 Matriks permission: katalog vs route backend

Repository memiliki 23 permission di data dictionary dan seed PERMISSIONS. Empat permission ditandai untuk Tahap 1; sisanya adalah katalog tahap berikutnya. Namun seluruh baris seed diberi is_active=TRUE, dan Auth.getUserRolesAndPermissions() memberikan seluruh permission aktif kepada Super Admin tanpa memfilter kolom stage.

| Permission | Tahap di katalog | Route yang ditemukan | Enforcement saat ini |
|---|---:|---|---|
| USER_MANAGE | 1 | users.list/create/update/resetPassword; roles.list/assign/revoke | Route memeriksa permission; hanya Super Admin yang secara efektif mendapatkannya |
| SYSTEM_CONFIG | 1 | config.get/set | Route memeriksa permission; hanya Super Admin yang secara efektif mendapatkannya |
| MENU_CONFIG | 1 | menu.setStatus | Route memeriksa permission; hanya Super Admin yang secara efektif mendapatkannya |
| AUDIT_VIEW | 1 | audit.list | Route memeriksa permission; hanya Super Admin yang secara efektif mendapatkannya |
| MEMBER_READ | 2 | Tidak ditemukan | Belum ada route; deferred |
| MEMBER_CREATE | 2 | Tidak ditemukan | Belum ada route; deferred |
| MEMBER_EDIT | 2 | Tidak ditemukan | Belum ada route; deferred |
| MEMBER_ARCHIVE | 2 | Tidak ditemukan | Belum ada route; deferred |
| REGISTRATION_REVIEW | 2 | Tidak ditemukan | Belum ada route; deferred |
| IMPORT_RUN | 2 | Tidak ditemukan | Belum ada route; deferred |
| COMMITTEE_MANAGE | 2 | Tidak ditemukan | Belum ada route; deferred |
| SCHEDULE_VIEW | 2 | Tidak ditemukan route internal jadwal | Diberikan kepada semua non-Super Admin dan Super Admin; belum ada endpoint operasional |
| SCHEDULE_MANAGE | 2 | Tidak ditemukan | Belum ada route; deferred |
| FINANCE_READ | 3 | Tidak ditemukan | Belum ada route; deferred |
| FINANCE_WRITE | 3 | Tidak ditemukan | Belum ada route; deferred |
| FINANCE_VERIFY | 3 | Tidak ditemukan | Belum ada route; deferred |
| RECEIPT_VIEW | 3 | Tidak ditemukan | Belum ada route; deferred |
| ANNOUNCE_DRAFT | 2 | Tidak ditemukan | Belum ada route; deferred |
| ANNOUNCE_APPROVE | 2 | Tidak ditemukan | Belum ada route; deferred |
| ANNOUNCE_PUBLISH | 2 | Tidak ditemukan | Belum ada route; deferred |
| EVENT_MANAGE | 2 | Tidak ditemukan | Belum ada route; deferred |
| REPORT_VIEW | 2 | Tidak ditemukan route laporan internal | Diberikan kepada semua role non-Super Admin dan Super Admin; belum ada endpoint laporan |
| AI_USE | 3 | Tidak ditemukan | Belum ada route; deferred; AI global default OFF |

**Catatan penting:** permission Tahap 2/3 boleh tercatat di katalog awal, tetapi tidak boleh dianggap sebagai hak operasional yang sudah diterapkan. Perlu definisi eksplisit apakah permission masa depan tetap nonaktif sampai tahapnya dimulai. Pemberian seluruh permission aktif kepada Super Admin saat ini membuat daftar permission Tahap 2/3 ikut masuk ke token/login response, walaupun route modulnya belum tersedia.

### 13.4 Pemeriksaan route privat

| Action | Permission pada Router | Session | Catatan |
|---|---|---|---|
| public.info / public.page | Tidak ada | Tidak | Sesuai sebagai endpoint publik |
| auth.login | Tidak ada | Tidak | Sesuai |
| auth.logout / auth.me | Tidak ada | Ya | Tidak memerlukan permission spesifik; perlu uji validitas sesi dan pencabutan sesi |
| users.list/create/update/resetPassword | USER_MANAGE | Ya | Route terlindungi oleh permission |
| roles.list/assign/revoke | USER_MANAGE | Ya | Route terlindungi; validasi role dan invariant Super Admin perlu diperkuat |
| menu.list | Tidak ada | Ya | Setiap akun login dapat membaca daftar menu; konfirmasi bahwa ini memang kebijakan |
| menu.setStatus | MENU_CONFIG | Ya | Route terlindungi oleh permission |
| config.get/set | SYSTEM_CONFIG | Ya | Route terlindungi oleh permission |
| audit.list | AUDIT_VIEW | Ya | Route terlindungi oleh permission |

### 13.5 Temuan teknis spesifik

| ID | Temuan | Dampak | Prioritas |
|---|---|---|---|
| RBAC-01 | Tidak ada relasi atau mapping ROLE → PERMISSION; getUserRolesAndPermissions() memberi dua permission yang sama untuk semua non-Super Admin | Tidak ada pemisahan kewenangan nyata antar-role | P0 |
| RBAC-02 | Super Admin memperoleh semua permission is_active=TRUE tanpa filter tahap | Permission masa depan Tahap 2/3 ikut diberikan sebelum modul/aturan terkait siap | P1 |
| RBAC-03 | assignRolesByCode() mengabaikan role code yang tidak ditemukan, tanpa mengembalikan validation error | Salah ketik/role invalid dapat menghasilkan assignment parsial yang tidak diketahui pemanggil | P1 |
| RBAC-04 | revokeRole() tidak terlihat mencegah pencabutan role SUPER_ADMIN terakhir | Risiko kehilangan akses administrasi tertinggi | P1 |
| RBAC-05 | Tidak ada enforcement scope komisi pada source Tahap 1 | Saat modul komisi dibuat, permission global saja tidak cukup untuk membatasi data per komisi | P1 — desain sebelum Tahap 2 |
| RBAC-06 | Belum ada automated/direct API authorization test untuk matriks role × route | Tidak ada bukti bahwa allow/deny sesuai BRD | P0 — exit gate |
| RBAC-07 | menu.list, auth.me, auth.logout hanya membutuhkan session, bukan permission khusus | Perlu memastikan informasi yang dikembalikan memang aman untuk seluruh akun aktif | P2 / review policy |

### 13.6 Rekomendasi dan acceptance criteria perbaikan

1. Finalisasi matriks role-permission sebagai artefak eksplisit yang disetujui pemilik proses. Minimal mencakup keenam role dan permission yang relevan; hak Bendahara/Komisi/operasional dapat diberi label tahap berikutnya, tetapi desainnya harus jelas.
2. Implementasikan sumber mapping yang dapat diaudit (misalnya sheet ROLE_PERMISSIONS atau konfigurasi terkontrol di backend). Jangan menghitung hak berdasarkan kondisi Super Admin versus non-Super Admin.
3. Terapkan prinsip deny-by-default: role/permission tidak dikenal, nonaktif, atau belum berlaku harus ditolak.
4. Filter permission berdasarkan status aktif dan tahap penerapan; jangan memberikan permission masa depan hanya karena seed berstatus aktif.
5. Validasi semua role code sebelum assignment; assignment harus atomik atau gagal seluruhnya jika ada kode tidak valid.
6. Lindungi Super Admin terakhir agar tidak dapat dinonaktifkan atau kehilangan role tertinggi tanpa prosedur pemulihan yang disetujui.
7. Rancang scope komisi di backend sebelum modul Tahap 2, sehingga Pengurus Komisi hanya dapat mengakses komisi yang ditugaskan.
8. Buat test matrix direct API: keenam role × seluruh endpoint privat, termasuk skenario tanpa token, token expired, permission tidak cukup, role nonaktif, dan akun nonaktif.

**Acceptance criteria RBAC Tahap 1:**
- [ ] Matriks role-permission Tahap 1 disetujui dan tersimpan di repository.
- [ ] Hak akses berasal dari mapping role-permission, bukan fallback hardcoded.
- [ ] Setiap route privat memiliki permission yang tepat atau alasan eksplisit mengapa cukup dengan session.
- [ ] Role A ditolak saat memanggil endpoint yang bukan haknya, termasuk direct API tanpa UI.
- [ ] Permission masa depan tidak diberikan/dianggap berlaku sebelum tahapnya.
- [ ] Invalid role assignment ditolak; tidak ada assignment parsial diam-diam.
- [ ] Super Admin terakhir terlindungi dari revoke/deaktivasi yang mengunci sistem.
- [ ] Bukti test allow/deny disimpan untuk exit gate Tahap 1.

### 13.7 Referensi source

- BRD CCMS_Master_Requirements_and_Project_Framework.md — §1.3, §1.5, §2.1, §2.2, §4 (RBAC/API design).
- docs/requirements/ROADMAP_3_TAHAPAN.md — §1.2, §1.3 urutan 1.6 dan 1.10, §1.4 exit criteria.
- docs/database/DATA_DICTIONARY_TAHAP1.md — §5 ROLES, §6 PERMISSIONS, §7 USER_ROLES.
- backend/apps-script/Auth.gs — getUserRolesAndPermissions(), login(), me().
- backend/apps-script/Users.gs — assignRolesByCode(), assignRole(), revokeRole().
- backend/apps-script/Router.gs — ROUTE_MAP.
- backend/apps-script/Code.gs — pemeriksaan session dan permission sebelum handler.
- backend/apps-script/tools/SetupDatabase.gs — seed 6 role dan 23 permission.

Audit ini merupakan pemeriksaan source. Belum ada perubahan aplikasi, data, konfigurasi, maupun pengujian mutasi production.


## 14. Audit environment, database, dan jalur penulisan — Tahap Implementasi 1

### 14.1 Environment DEV / STAGING / PROD

| Kebutuhan BRD / roadmap | Bukti repository | Penilaian |
|---|---|---|
| Tiga environment terpisah | deployment/google/README.md dan deployment/cloudflare/README.md mendokumentasikan DEV, STAGING, PROD | Implemented — dokumentasi |
| Worker terpisah/terkonfigurasi per environment | worker/wrangler.toml hanya memiliki [vars] default; blok env.staging dan env.production masih berupa komentar | Partial / Gap |
| GAS deployment terpisah per environment | Panduan deployment meminta Apps Script project per environment, tetapi tidak ada bukti deployment aktual di source repository | Documented — Runtime Verification Required |
| Spreadsheet terpisah per environment | Panduan menyebut CCMS-DEV-DB, CCMS-STAGING-DB, CCMS-PROD-DB; SetupDatabase.gs membuat CCMS-DEV-DB secara hardcoded | Partial / Gap — High |
| Folder Drive terpisah | DRIVE_FOLDER_NAME dapat disesuaikan manual dan folder dibuat berdasarkan segmen nama environment | Partial — perlu uji pemetaan aktual |
| Script Properties per environment | Db.spreadsheet() mengambil CCMS_SPREADSHEET_ID dari Script Properties; SESSION_SECRET juga disimpan di Script Properties | Implemented — perlu bukti tiap project memakai property terpisah |
| Tidak ada koneksi silang DEV ↔ PROD | Belum ada environment manifest atau hasil tes koneksi silang | Not Verified |

**Temuan ENV-01 — SetupDatabase belum benar-benar environment-aware.** Fungsi setupDatabase() tetap membuat spreadsheet bernama CCMS-DEV-DB, meskipun komentar dan dokumentasi meminta nama disesuaikan untuk STAGING/PROD. DRIVE_FOLDER_NAME saja tidak mengubah nama spreadsheet. Ini membuka risiko ketidaksesuaian folder dan database jika setup dilakukan untuk environment non-DEV.

**Temuan ENV-02 — Worker environment STAGING/PROD belum aktif di file konfigurasi.** wrangler.toml saat ini berisi satu [vars] default yang menunjuk ke satu GAS_URL dan daftar origin. Blok STAGING/PROD masih komentar contoh. Belum dapat disimpulkan apakah deployment terpisah sudah dikonfigurasi di dashboard Cloudflare; bukti tersebut tidak tersedia di repo.

**Temuan ENV-03 — setupDatabase() berpotensi membuat database baru setiap kali dijalankan.** Fungsi langsung membuat spreadsheet baru dan mengubah CCMS_SPREADSHEET_ID ke ID yang baru. Tidak terlihat guard yang menolak setup kedua atau meminta konfirmasi eksplisit. Jika dijalankan ulang pada project yang sama, database sebelumnya dapat menjadi orphan dan aplikasi berpindah ke spreadsheet baru.

### 14.2 Database dan konsistensi data

| Kebutuhan BRD / roadmap / data dictionary | Hasil source | Status |
|---|---|---|
| Database awal Google Sheets | Db.spreadsheet() membuka spreadsheet dari Script Properties | Sesuai — struktur |
| Delapan sheet inti Tahap 1 | SetupDatabase.gs membuat CONFIG, PUBLIC_MENU, USERS, ROLES, PERMISSIONS, USER_ROLES, AUDIT_LOG, LOGIN_ATTEMPTS | Sesuai — seed structure |
| ID record tidak bergantung nomor baris | Db.newId() menggunakan timestamp base36 dan dua karakter acak | Sebagian — format independen dari row, tetapi perlu evaluasi collision |
| Semua mutasi memakai LockService | Db.write() memperoleh ScriptLock dan release dalam finally | Sesuai — untuk operasi yang melewati wrapper |
| Validasi backend sebelum write | Validasi ada pada sebagian handler; Db.write() sendiri tidak memvalidasi schema, FK, uniqueness, atau business rules | Sebagian / Gap |
| Update mempertahankan field yang tidak dikirim | Db.write() merge row existing dengan object update | Sesuai — source |
| Penulisan batch | Append menggunakan setValues batch; update melakukan baca/tulis per row dalam loop | Sebagian — update belum optimal untuk batch besar |
| Integritas relasi user-role | assignRolesByCode() mengecek role ID dan menghindari duplikasi sederhana; role tidak dikenal diabaikan | Sebagian / Gap |
| Audit log append-only | Audit module menyediakan append log, tetapi audit seluruh jalur mutasi belum dibuktikan | Implemented — Verification Required |
| Backup dan recovery | Belum ditemukan bukti backup terjadwal dan restore drill pada Tahap 1 | Not Found / Deferred sesuai roadmap Tahap 3 |

**Temuan DB-01 — LockService tersedia, tetapi bukan pengganti validasi.** Db.write() mengunci operasi append/update. Namun wrapper tersebut tidak memvalidasi header, tipe data, field wajib, foreign key, atau aturan bisnis secara generik. Validasi harus tetap diterapkan di handler/backend sebelum penulisan.

**Temuan DB-02 — Update row dilakukan satu per satu.** Operasi append sudah menggunakan satu setValues untuk seluruh record baru. Operasi update membaca dan menulis setiap row di dalam loop. Lock tetap menahan konkurensi, tetapi banyak operasi update dapat meningkatkan waktu eksekusi dan konsumsi kuota Apps Script.

**Temuan DB-03 — Tidak ada transaksi database lintas operasi.** Db.write() mengunci satu pemanggilan untuk satu sheet; operasi lintas beberapa sheet pada handler (contoh membuat user lalu assign role) bukan satu transaksi atomik. Jika tahap pertama berhasil dan tahap kedua gagal, data dapat tertinggal dalam keadaan parsial. Perlu desain kompensasi/validasi atau mekanisme operasi yang dapat dipulihkan.

**Temuan DB-04 — Setup ulang berisiko mengganti pointer database.** Setiap setupDatabase() membuat spreadsheet baru dan menyimpan ID baru ke Script Properties. Tidak terlihat mekanisme idempotency, pemeriksaan database existing, atau mode dry-run.

**Temuan DB-05 — Pembangkitan ID menggunakan sumber acak non-kriptografis.** Db.newId() memakai timestamp ditambah dua karakter Math.random(). ID tidak harus menjadi rahasia, tetapi ruang acak hanya 1.296 kemungkinan per timestamp yang sama; collision handling/unique constraint perlu dipertimbangkan terutama saat request bersamaan. Gunakan ID yang lebih kuat dan tangani collision di backend.

### 14.3 Pemeriksaan Worker/API gateway yang relevan dengan environment

| Area | Temuan source | Penilaian |
|---|---|---|
| CORS allowlist | Worker membandingkan Origin dengan ALLOWED_ORIGINS; origin yang tidak cocok tidak memperoleh origin yang diizinkan | Implemented — Runtime Verification Required |
| OPTIONS preflight | Worker mengembalikan 204 dan header CORS | Implemented — perlu tes browser |
| Metode HTTP | Hanya GET/POST selain OPTIONS diterima | Sesuai — source |
| Request JSON | POST body harus JSON dan action string | Sesuai — validasi bentuk dasar |
| Timeout upstream | AbortController timeout 55 detik | Implemented — perlu uji timeout; timer dibersihkan setelah fetch header diterima sehingga pembacaan body JSON perlu ditinjau terpisah |
| Cache publik | Hanya public.info/public.page tanpa token; TTL 60 detik | Implemented — perlu uji isolasi cache dan invalidasi |
| Cache privat | Response action non-cacheable diberi no-store | Sesuai — source |
| Secret/API key | GAS_URL berada di vars Wrangler; tidak terlihat Gemini API key di frontend/repo dari file yang diperiksa | Perlu verifikasi secret Cloudflare/Script Properties di runtime |

### 14.4 Rekomendasi prioritas

1. Buat konfigurasi environment yang eksplisit dan tidak bergantung pada edit manual konstanta di source. Nama spreadsheet, folder Drive, GAS deployment, Worker, dan origin harus berasal dari environment yang dipilih.
2. Tambahkan guard setup: jika CCMS_SPREADSHEET_ID sudah terisi, setup harus berhenti secara default. Sediakan prosedur reset/recreate yang memerlukan tindakan eksplisit dan mencatat ID lama/baru.
3. Buat environment manifest (tanpa secret) yang mencatat nama project, GAS deployment alias, Worker, Pages origin, Spreadsheet ID fingerprint/label, dan folder Drive untuk masing-masing environment.
4. Uji bahwa DEV hanya menunjuk database DEV, STAGING hanya database STAGING, dan PROD hanya database PROD. Jangan memakai data produksi untuk pengujian.
5. Terapkan validasi schema dan relasi pada backend sebelum semua write; tambahkan uniqueness check yang aman terhadap konkurensi.
6. Evaluasi pola update batch dan penanganan kegagalan parsial lintas sheet.
7. Tingkatkan strategi ID dan tangani collision secara eksplisit.
8. Simpan bukti backup/restore saat cakupan roadmap Tahap 3 dijalankan; jangan menyatakan backup production sudah teruji tanpa recovery drill.

### 14.5 Acceptance criteria environment/database Tahap 1

- [ ] DEV, STAGING, PROD memiliki Worker, Apps Script project/deployment, Spreadsheet, Drive folder, dan origin yang terpisah.
- [ ] Konfigurasi STAGING/PROD benar-benar aktif, bukan sekadar komentar contoh.
- [ ] SetupDatabase menolak eksekusi ulang yang berisiko membuat database baru tanpa persetujuan eksplisit.
- [ ] Uji pemetaan environment membuktikan tidak ada koneksi silang.
- [ ] Semua jalur mutasi repository menggunakan wrapper LockService atau memiliki alasan pengecualian yang terdokumentasi.
- [ ] Validasi backend mencakup tipe data, field wajib, referensi relasi, dan keunikan sebelum write.
- [ ] Uji concurrency dan kegagalan parsial disimpan sebagai bukti.
- [ ] Uji backup/restore dilaksanakan sesuai tahap roadmap yang ditetapkan; statusnya tidak boleh diasumsikan selesai hanya dari dokumentasi.

Audit ini berdasarkan source dan dokumentasi repository. Tidak ada database, Script Properties, konfigurasi Worker, atau data production yang diubah selama pemeriksaan.


## 15. Koreksi audit RBAC — matriks resmi ditemukan pada Data Dictionary

**Koreksi penting atas bagian 13:** Pemeriksaan ulang terhadap keseluruhan `docs/database/DATA_DICTIONARY_TAHAP1.md` menemukan bahwa §10 sudah memuat matriks Role → Permission baseline untuk keenam role dan 23 permission. Dengan demikian, pernyataan pada bagian 13 yang menyebut matriks role-permission tidak ditemukan adalah **tidak tepat dan digantikan oleh koreksi ini**.

Gap yang sebenarnya:
1. Artefak matriks sudah ada dan menjadi sumber acuan resmi.
2. Seed database belum memiliki sheet relasi ROLE_PERMISSIONS; hal ini tidak otomatis menjadi gap karena Data Dictionary menempatkan matriks dalam dokumen, tetapi runtime harus mengimplementasikannya.
3. `Auth.getUserRolesAndPermissions()` belum membaca/menerapkan matriks tersebut. Ia memberi semua permission aktif kepada SUPER_ADMIN dan dua permission hardcoded yang sama kepada seluruh role non-Super Admin.
4. Permission future stage harus mengikuti stage pada katalog dan roadmap, bukan diberikan secara fungsional sebelum tahap tersebut aktif.
5. Pengujian direct API terhadap matriks enam role × route privat belum tersedia.

| Komponen | Kondisi yang benar | Status |
|---|---|---|
| Matriks role-permission sebagai dokumen | Ada di Data Dictionary §10, enam role × 23 permission | Sesuai — artefak |
| Matriks di runtime | Tidak diterapkan oleh Auth.gs | Gap — Critical |
| Stage gate permission | Permission future stage ditandai di katalog, tetapi runtime tidak memfilter stage | Gap — High |
| Validasi role assignment | Role code tidak dikenal diabaikan | Gap — High |
| Direct API test | Bukti allow/deny belum tersedia | Belum terverifikasi — Critical |

Tindakan: remediasi harus mengimplementasikan Data Dictionary §10 secara persis. Jangan membuat matriks alternatif yang bertentangan. Bila ada keputusan bisnis yang perlu diubah, update Data Dictionary dan catat di change log terlebih dahulu.

