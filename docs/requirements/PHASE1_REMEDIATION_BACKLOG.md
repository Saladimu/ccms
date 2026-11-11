# CCMS — Phase 1 BRD Remediation Backlog

**Baseline:** `CCMS_Master_Requirements_and_Project_Framework.md` (single source of truth)  
**Scope:** Remediasi kesenjangan repository terhadap BRD untuk Tahap Implementasi 1.  
**Working branch:** `remediation/phase1-brd-alignment`  
**Rule:** Tidak mengubah `main` atau deployment production sampai perubahan lulus review, test, dan persetujuan.

## Cara membaca prioritas

Daftar ditampilkan dari Low → Medium → High → Critical sesuai permintaan. **Urutan pelaksanaan aktual dimulai dari Critical**, lalu High, Medium, dan Low. Fitur yang secara resmi berada di Tahap 2/3 tidak boleh ditarik ke Tahap 1; hanya desain kontrak/permission yang perlu disiapkan bila menjadi prasyarat.

## LOW — penyempurnaan dan maintainability

| ID | Task | Area/file | Kriteria selesai |
|---|---|---|---|
| L-01 | Rapikan dokumentasi arsitektur dan environment agar konsisten dengan konfigurasi aktif, bukan contoh komentar | `docs/deployment/*`, README, `worker/wrangler.toml` | Instruksi DEV/STAGING/PROD konsisten dengan manifest dan langkah deployment |
| L-02 | Standarkan pesan error dan respons UI pada public/internal portal | `frontend/public/index.html`, `frontend/internal/index.html` | Pesan loading, empty, maintenance, dan error konsisten serta tidak membocorkan detail internal |
| L-03 | Optimalkan operasi update database secara batch setelah correctness tests tersedia | `backend/apps-script/Db.gs` | Update batch mengurangi operasi Sheets tanpa mengubah hasil dan tetap aman terhadap concurrency |
| L-04 | Tambahkan dokumentasi operasional, handover, dan prosedur pergantian pengurus | `docs/operations/*` | Prosedur admin, recovery akses, deployment, dan serah-terima terdokumentasi |

## MEDIUM — kualitas, konsistensi, dan verifikasi

| ID | Task | Area/file | Kriteria selesai |
|---|---|---|---|
| M-01 | Tambahkan automated tests untuk helper, route, menu state, dan konfigurasi | test harness / Apps Script tests | Test dapat dijalankan berulang dan hasilnya terdokumentasi |
| M-02 | Tambahkan schema validation terpusat untuk payload dan record sebelum write | `backend/apps-script/Db.gs` dan handler | Field wajib, tipe, enum, panjang, dan referensi divalidasi di backend |
| M-03 | Tambahkan uniqueness/collision handling untuk ID dan username/role/menu/config | `Db.gs`, `Users.gs`, setup | Duplikasi ditolak secara atomik dan tidak menghasilkan record parsial |
| M-04 | Tambahkan audit coverage matrix untuk seluruh mutasi dan redaksi nilai sensitif | `Audit.gs`, `Config.gs`, `Users.gs` | Semua mutasi penting tercatat; password, token, secret, dan nilai rahasia tidak dicatat |
| M-05 | Uji concurrency, kegagalan parsial, cache, CORS, timeout, dan error gateway | `Db.gs`, Worker | Test report berisi skenario, hasil aktual, dan bukti |
| M-06 | Siapkan UAT Tahap 1 dengan minimal dua role berbeda | test plan / UAT | Skenario role berbeda, expected allow/deny, bukti, dan approval tersedia |

## HIGH — kesesuaian fitur dan keamanan utama

| ID | Task | Area/file | Kriteria selesai |
|---|---|---|---|
| H-01 | Implementasikan role-permission sesuai matriks resmi Data Dictionary §10, dengan deny-by-default dan stage gate | `Auth.gs`, `Router.gs`, `SetupDatabase.gs` | Permission dihitung dari matriks resmi; role tidak dikenal/nonaktif ditolak; permission tahap mendatang belum efektif |
| H-02 | Validasi role assignment dan lindungi Super Admin terakhir | `Users.gs` | Role code invalid menghasilkan error; assignment atomik; Super Admin terakhir tidak dapat dicabut/dinonaktifkan |
| H-03 | Lengkapi Public Portal tujuh kelompok BRD §1.4 termasuk Informasi Komisi/Pelayanan | `SetupDatabase.gs`, `PublicMenu.gs`, `Public.gs`, frontend public | Tujuh menu tersedia; halaman memiliki konten yang layak/placeholder editorial terkelola; status menu ditegakkan backend |
| H-04 | Hilangkan injeksi HTML dari konten API yang tidak tepercaya | `frontend/public/index.html`, `frontend/internal/index.html` | Teks memakai `textContent`/DOM aman; rich text disanitasi dengan allowlist |
| H-05 | Perkuat konfigurasi sesuai Data Dictionary: validasi value_type, enum, batas angka, secret handling dan redaksi audit | `Config.gs` | Invalid value ditolak; secret tidak pernah dikirim/dicatat; hanya key yang disetujui dapat diubah |
| H-06 | Buat setup database environment-aware dan idempotent; lindungi dari pembuatan DB baru tanpa sengaja | `SetupDatabase.gs` | Environment dipilih eksplisit; nama/folder sesuai; setup berhenti jika pointer DB sudah ada kecuali reset yang disengaja |
| H-07 | Pastikan user nonaktif dan role nonaktif tidak dapat melanjutkan request privat | `Auth.gs`, `Code.gs`, `Users.gs` | Status akun/role diperiksa di setiap request privat; perubahan status segera berlaku |
| H-08 | Lengkapi dashboard internal Tahap 1 sesuai role dan fungsi yang benar-benar tersedia | `frontend/internal/index.html` | Tidak ada tautan palsu; dashboard menampilkan fungsi yang dapat dipakai dan menu berdasarkan permission |
| H-09 | Selesaikan session logout/revocation sesuai BRD | `Auth.gs`, data dictionary/schema | Token tidak dapat dipakai lagi setelah logout; mekanisme revocation memiliki expiry/cleanup dan test |

## CRITICAL — blocker keamanan dan exit gate Tahap 1

| ID | Task | Area/file | Kriteria selesai |
|---|---|---|---|
| C-01 | Tutup celah authorization: enforce role-permission resmi pada setiap request privat | `Auth.gs`, `Code.gs`, `Router.gs` | Direct API test membuktikan role yang tidak berhak mendapat 403; tidak ada default grant ke semua non-Super Admin |
| C-02 | Perbaiki password hashing ke KDF standar dan salt dari sumber acak yang layak; sediakan migrasi hash lama | `Auth.gs`, `Users.gs`, data dictionary | Format hash baru terdokumentasi, verify legacy aman, upgrade hash setelah login sukses, password policy BRD ditegakkan |
| C-03 | Pastikan token diverifikasi dengan secret yang ada, signature/expiry benar, dan status akun aktif diperiksa pada setiap request | `Auth.gs`, `Code.gs` | Token invalid/expired/akun nonaktif ditolak; tidak ada bypass jika secret kosong |
| C-04 | Implementasikan logout yang benar-benar mencabut sesi | `Auth.gs`, schema session | Token yang sudah logout ditolak server-side; test membuktikan |
| C-05 | Pastikan Public Portal mematuhi BRD dan tidak ada halaman inti yang hanya placeholder kosong | `Public.gs`, `PublicMenu.gs`, `frontend/public/index.html` | Ketujuh kelompok informasi dapat dibuka tanpa login; halaman maintenance/hidden ditangani server-side |
| C-06 | Buktikan isolasi DEV/STAGING/PROD dan hentikan risiko setup menunjuk database salah | Worker/GAS config, `SetupDatabase.gs` | Manifest per environment cocok; test silang gagal; tidak ada secret/ID prod di DEV |
| C-07 | Buat test suite authorization, auth lifecycle, dan API security sebagai exit gate | test plan / tests | No-token, expired, inactive user, logout, role A→route B, permission off, dan public/private isolation lulus |
| C-08 | Verifikasi semua kriteria exit Tahap 1, deployment/rollback dan UAT dua role | release checklist | Semua evidence terlampir; item belum diuji ditandai belum lulus, tidak diasumsikan selesai |

## Urutan pelaksanaan yang direkomendasikan

1. **Sprint 0 — C-01/C-03/H-01/H-02:** otorisasi, status akun, matriks permission, dan integritas role.
2. **Sprint 1 — C-02/C-04/H-09:** password KDF dan session revocation; migrasi kompatibel untuk akun existing.
3. **Sprint 2 — C-06/H-06:** isolasi environment dan setup database yang aman.
4. **Sprint 3 — C-05/H-03/H-04:** Public Portal sesuai tujuh kelompok BRD dan mitigasi XSS.
5. **Sprint 4 — H-05/H-08/M-02/M-04:** konfigurasi, dashboard, validasi, dan audit log.
6. **Sprint 5 — M-01/M-03/M-05/M-06/C-07/C-08:** automated/security tests, UAT dua role, deployment dan rollback evidence.
7. **Setelah exit gate Tahap 1:** baru lanjut ke backlog fitur Tahap 2/3 sesuai roadmap.

## Guardrails

- Jangan commit langsung ke `main`.
- Jangan jalankan setupDatabase terhadap project atau spreadsheet production selama development.
- Jangan menjalankan tes mutasi pada production.
- Jangan menonaktifkan akun/role atau mengubah secret di environment live.
- Semua perubahan schema harus disertai migration yang aman dan update Data Dictionary.
- Perubahan permission harus merujuk matriks Data Dictionary §10; jangan membuat matriks baru yang bertentangan.
- Pull request hanya dibuat setelah source review dan test lokal/staging yang dapat dilakukan sudah terdokumentasi.
- UAT final tetap memerlukan persetujuan pemilik gereja.

## Catatan koreksi hasil audit RBAC

Data Dictionary Tahap 1 §10 ternyata **sudah memiliki matriks Role → Permission baseline** untuk enam role dan 23 permission. Karena itu, pernyataan audit sebelumnya bahwa matriks tidak ditemukan perlu dikoreksi: gap sebenarnya adalah matriks tersebut belum diterapkan oleh `Auth.getUserRolesAndPermissions()`, yang masih memakai fallback hardcoded. Implementasi wajib mengikuti matriks resmi yang sudah ada; tidak perlu mendesain matriks baru kecuali ditemukan konflik yang perlu keputusan pemilik.


## Progress implementasi branch

**Status:** In Progress — perubahan source awal sudah dibuat, belum siap merge/deploy karena automated/runtime test belum dijalankan.

| Task | Status | Implementasi awal |
|---|---|---|
| C-01 / H-01 | Implemented — Testing Required | Auth menerapkan matriks resmi Data Dictionary §10 dan hanya mengaktifkan permission dengan `stage <= 1`; direct API test masih pending |
| C-03 / H-07 | Implemented — Testing Required | verifyToken memeriksa SESSION_SECRET, expiry, keberadaan user, dan status akun aktif pada setiap request privat; role aktif juga diperiksa |
| H-02 | Implemented — Testing Required | Role assignment memvalidasi semua kode dan status role; operasi melindungi Super Admin aktif terakhir |
| C-04 / H-09 | Implemented — Migration & Testing Required | JWT memiliki `jti`; logout menulis ledger REVOKED_SESSIONS; verifier menolak token yang sudah dicabut; migration script disediakan |
| C-02 | Partial — Remaining KDF Review | Salt tidak lagi menggunakan Math.random; kebijakan password minimal 8 karakter dengan huruf dan angka diterapkan. Algoritma existing masih iterated SHA-256, bukan PBKDF2 standar; keputusan KDF/migrasi hash tetap perlu diselesaikan |
| C-06 / H-06 | Partial — Environment Proof Required | Setup membaca CCMS_ENV, menolak database existing, mengunci setup PROD dengan flag eksplisit, dan memindahkan spreadsheet ke folder environment. Worker STAGING/PROD dan isolasi runtime masih pending |
| H-03 / C-05 | Implemented — Content & Runtime Verification Required | Seed tujuh menu BRD; halaman publik mengambil konten awal dari CONFIG; konten gereja aktual perlu diisi dan smoke test masih pending |
| H-04 | Implemented — Testing Required | Public Portal merender konten API menggunakan textContent/DOM API, bukan interpolasi HTML |
| H-05 | Implemented — Testing Required | Config API memvalidasi tipe, enum, angka, boolean, JSON; menolak secret dan tidak mencatat nilai konfigurasi di audit |
| M-06 / C-08 | Pending | UAT dua role, deployment/rollback, dan exit-gate evidence belum dilakukan |

**Peringatan migrasi:** perubahan logout memerlukan sheet `REVOKED_SESSIONS`. Database yang sudah ada harus menjalankan `migrateSessionRevocationSheet()` per environment setelah backup dan verifikasi environment. Jangan deploy kode auth baru ke environment yang belum memiliki sheet tersebut; backend sengaja fail-closed dengan error `DB_MIGRATION_REQUIRED`.

**Peringatan KDF:** perbaikan salt dan komposisi password belum menyelesaikan evaluasi algoritma hash. Jangan menyebut kontrol password sudah sepenuhnya lulus sebelum strategi KDF standar, backward compatibility, rehash, dan uji beban Apps Script disepakati serta diuji.


## Progress update — 11 November 2026

Perubahan lanjutan pada branch remediation:

| Task | Status source | Sisa verifikasi / blocker |
|---|---|---|
| C-01 | Implemented — Testing Required | Matriks resmi §10 diterapkan; Router resolve diperbaiki ke global scope Apps Script; automated direct API tests disiapkan |
| C-02 | Implemented — Runtime Benchmark Required | PBKDF2-HMAC-SHA256 120.000 iterasi; legacy SHA-256 diverifikasi dan otomatis di-upgrade setelah login sukses; benchmark Apps Script wajib sebelum rilis |
| C-03 | Implemented — Testing Required | Header HS256/JWT, signature, claim iat/exp/sub, secret, user aktif dan role aktif diperiksa |
| C-04 | Implemented — Migration & Testing Required | Revocation server-side dan cleanup ledger expired ditambahkan; migration REVOKED_SESSIONS tetap wajib pada DB existing |
| C-05 | Implemented — Content/Runtime Test Required | Tujuh halaman publik disediakan dengan fallback editorial; status ON/OFF_HIDDEN/OFF_MAINTENANCE diperiksa backend |
| C-06 | Partial — Environment Proof Required | Worker memiliki blok DEV/STAGING/PROD fail-closed; setup memerlukan CCMS_ENV eksplisit; URL deployment dan origin DEV/STAGING harus diisi serta diverifikasi oleh pemilik sistem |
| C-07 | Test harness added — Execution Required | Node test untuk KDF, legacy hash, role matrix, token, logout, direct API dan Worker ditambahkan; SIT DEV/STAGING belum dieksekusi |
| C-08 | UAT/release artifacts added — Approval Pending | UAT dua role, release/rollback gate tersedia; UAT, backup/restore drill, approval dan release belum dilakukan |

**Penting:** status source implementation tidak sama dengan status SIT/UAT. Tidak ada perubahan yang di-merge ke main atau di-deploy ke production. PBKDF2 belum dinyatakan lulus sampai benchmark Apps Script dan test integrasi berhasil.
