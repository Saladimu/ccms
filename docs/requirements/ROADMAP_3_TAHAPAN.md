# CCMS — Roadmap Implementasi 3 Tahapan

**Versi:** 1.0
**Tanggal:** 9 November 2026
**Referensi:** `CCMS_Master_Requirements_and_Project_Framework.md` (Dokumen Induk)
**Status:** Roadmap kerja implementasi; setiap tahap memiliki entry/exit criteria yang wajib dipenuhi sebelum tahap berikutnya dimulai.

---

## Tujuan Dokumen

Dokumen ini menerjemahkan 11 Work Package (WP-01 s.d. WP-11) pada dokumen induk ke dalam **3 tahapan pengerjaan** dengan:

- Cakupan eksplisit per tahap.
- Prasyarat masuk (entry criteria) dan kriteria keluar (exit criteria).
- Estimasi durasi dan urutan pengerjaan.
- Pemetaan ke issue GitHub (mengikuti framework tracking bagian 6.5 dokumen induk).

**Aturan utama:** tahap berikutnya **tidak boleh dimulai** sebelum exit criteria tahap sebelumnya terpenuhi dan disetujui (Definition of Done, dokumen induk 6.6).

---

## Gambaran Umum

| Tahap | Nama | Work Package | Durasi Estimasi | Hasil Utama |
|---|---|---|---|---|
| 1 | Fondasi, Keamanan & Portal Publik | WP-01, WP-02, WP-03, WP-04, WP-05, WP-06 (parsial) | 4–6 minggu | Infrastruktur live + auth + portal publik |
| 2 | Modul Operasional | WP-07, WP-08, WP-10, WP-06 (penuh) | 4–6 minggu | Jemaat, komisi, pengumuman, kegiatan berjalan |
| 3 | Keuangan, AI & Go-Live | WP-09, WP-11, finalisasi Phase 7 | 4–6 minggu + 1–2 minggu UAT final | Sistem lengkap + go-live |

Total estimasi: **±12–20 minggu** (termasuk UAT), dengan asumsi 1–2 developer paruh waktu. Durasi dapat berubah; yang mengikat adalah exit criteria, bukan tanggal.

---

# TAHAP 1 — Fondasi, Keamanan & Portal Publik

## 1.1 Cakupan

- **WP-01 Project Foundation** — repo, struktur, environment, Cloudflare Pages, Worker, Apps Script.
- **WP-02 Backend Foundation** — API gateway, standar response, error handling, logging.
- **WP-03 Authentication & Authorization** — login, role, permission, session, lockout.
- **WP-04 Database & System Configuration** — sheet inti, validasi, konfigurasi, theme, feature flag.
- **WP-05 Public Portal** — beranda, profil, kontak, menu dinamis.
- **WP-06 Internal Dashboard (parsial)** — halaman login + skeleton dashboard per role.

## 1.2 Prasyarat Masuk (Entry Criteria)

- [ ] Dokumen induk disetujui sebagai baseline.
- [ ] Spesifikasi rinci tahap 1 selesai (subset bagian 8.3 dokumen induk):
  - Data dictionary untuk sheet Tahap 1.
  - Matriks role-permission final (minimal untuk role yang ada di Tahap 1).
  - Daftar endpoint API + request/response + error code.
  - Desain detail autentikasi, sesi, token, dan keamanan endpoint.
- [ ] Akun Gmail khusus gereja dibuat, 2FA aktif, recovery disiapkan.
- [ ] Akun Cloudflare siap untuk proyek gereja.

## 1.3 Urutan Pekerjaan

| Urutan | Pekerjaan | Catatan |
|---|---|---|
| 1.1 | Buat struktur repo sesuai dokumen induk 5.8 (`docs/`, `frontend/`, `worker/`, `backend/`, `database/`, `deployment/`) | Tambahkan README, .gitignore, konvensi commit |
| 1.2 | Siapkan 3 environment: DEV / STAGING / PROD | Sheets + Drive terpisah per environment; data dummy di DEV |
| 1.3 | Setup proyek Cloudflare Pages + Worker (routing, CORS, standar response/error, logging) | Worker hanya gateway; keamanan tetap di backend |
| 1.4 | Setup Apps Script + clasp; konfigurasi secret di Script Properties | Deploy web app "Anyone" untuk bisa dipanggil Worker |
| 1.5 | Bangun sheet inti: `CONFIG`, `PUBLIC_MENU`, `USERS`, `ROLES`, `PERMISSIONS`, `USER_ROLES`, `AUDIT_LOG`, `LOGIN_ATTEMPTS` | ID unik stabil, tidak bergantung nomor baris |
| 1.6 | Implementasi AuthN/AuthZ: password hash + salt, sesi berjangka (JWT HS256 diverifikasi di GAS tiap request), logout, lockout 3x gagal → 5 menit | Lockout ditegakkan di backend, bukan frontend |
| 1.7 | Feature flag + theme configuration (CSS variables/design tokens) | ON/OFF ditegakkan di backend |
| 1.8 | Public Portal: Beranda, Profil, Kontak + menu dinamis (ON / OFF-Hidden / OFF-Maintenance) | Mobile-first |
| 1.9 | Internal: halaman login + skeleton dashboard per role | Menu sesuai permission |
| 1.10 | Uji keamanan dasar: endpoint internal ditolak tanpa sesi valid; akses lintas role ditolak | Test T-03, T-04, T-08 (subset) |

## 1.4 Kriteria Keluar (Exit Criteria)

- [ ] Portal publik live di Cloudflare Pages (URL produksi).
- [ ] Login internal berfungsi: hash password, sesi berjangka, logout mengakhiri sesi.
- [ ] Lockout 3x gagal → blokir 5 menit teruji (tes otomatis + manual).
- [ ] Menu dinamis berubah (ON/OFF-Hidden/OFF-Maintenance) tanpa redeployment.
- [ ] Pengujian eksplisit: publik tidak dapat memanggil endpoint internal; pengguna role A tidak dapat fungsi role B.
- [ ] Semua tulisan ke sheet melewati LockService dan validasi backend.
- [ ] Prosedur deploy (Pages, Worker, Apps Script via clasp) + rollback terdokumentasi dan teruji.
- [ ] UAT skeleton dashboard oleh minimal 2 role berbeda disetujui.

---

# TAHAP 2 — Modul Operasional: Jemaat, Komisi, Pengumuman & Kegiatan

## 2.1 Cakupan

- **WP-07 Member Management** — jemaat, keluarga, pendaftaran, impor, NIK warning, archive.
- **WP-08 Committee & Ministry** — komisi, keanggotaan, pengurus, jadwal pelayanan.
- **WP-10 Announcement & Event** — pengumuman, approval, kegiatan, pendaftaran event, dokumentasi.
- **WP-06 Internal Dashboard (penuh)** — dashboard role-based untuk semua role Tahap 2.

## 2.2 Prasyarat Masuk

- [ ] Semua exit criteria Tahap 1 terpenuhi dan disetujui.
- [ ] Data dictionary sheet Tahap 2 selesai.
- [ ] Detail alur approval pengumuman per kategori disetujui.
- [ ] Template impor data (CSV/Excel) disepakati.

## 2.3 Urutan Pekerjaan

| Urutan | Pekerjaan | Catatan |
|---|---|---|
| 2.1 | Sheet Tahap 2: `JEMAAT`, `KELUARGA`, `PENDAFTARAN_JEMAAT`, `KOMISI`, `JEMAAT_KOMISI`, `PENGURUS`, `JADWAL_PELAYANAN`, `KATEGORI_PENGUMUMAN`, `PENGUMUMAN`, `APPROVAL_LOG`, `KEGIATAN`, `PENDAFTARAN_EVENT`, `DOKUMENTASI` | Relasi via ID |
| 2.2 | Modul Jemaat: CRUD dengan permission, relasi keluarga opsional, NIK opsional + warning duplikat (non-blocking), `member_status` vs `is_archived` sesuai matriks laporan, metadata arsip, **tanpa hard delete** | Restore mempertahankan `member_status` |
| 2.3 | Form pendaftaran publik → antrean verifikasi Sekretaris/Admin → data resmi | Tidak membuat akun login |
| 2.4 | Alat impor/migrasi: template, preview, validasi, duplikasi, mapping keluarga, commit, catatan batch/error (`MIGRATION_BATCH`, `MIGRATION_ERRORS`) | Jalankan di STAGING dulu |
| 2.5 | Modul Komisi: keanggotaan multi-komisi, pengurus, jadwal pelayanan, laporan per komisi sesuai permission | Pengurus komisi tidak mengelola kas |
| 2.6 | Modul Pengumuman: siklus `Draft → Published → Hidden → Deleted` (soft delete), approval per kategori, hanya Published tampil di publik | Semua aksi tercatat di `APPROVAL_LOG` |
| 2.7 | Modul Kegiatan: kegiatan, pendaftaran peserta, dokumentasi | |
| 2.8 | Dashboard penuh per role: Super Admin, Pendeta/Majelis, Sekretaris/Admin, Pengurus Komisi, Petugas Pelayanan | Angka ringkasan sesuai permission |
| 2.9 | Uji: skenario skenario penting dokumen induk 7.2 terkait jemaat/komisi/pengumuman/kegiatan | T-01, T-04, T-05 |

## 2.4 Kriteria Keluar

- [ ] Data jemaat dapat dikelola: pendaftaran, verifikasi, edit, arsip, restore — sesuai aturan dokumen induk.
- [ ] Warning duplikasi NIK muncul hanya saat NIK diisi dan tidak memblokir setelah konfirmasi.
- [ ] Impor data lama teruji di STAGING dengan laporan batch/error.
- [ ] Komisi: pengurus melihat data/laporan komisinya saja (diuji lintas role).
- [ ] Pengumuman mengikuti alur approval per kategori; konten Hidden tidak tampil di publik; soft delete dapat dipulihkan.
- [ ] Kegiatan + pendaftaran + dokumentasi berfungsi.
- [ ] UAT oleh Sekretaris/Admin dan 2 pengurus komisi disetujui.

---

# TAHAP 3 — Keuangan, AI & Go-Live

## 3.1 Cakupan

- **WP-09 Financial Management** — kas, transaksi, iuran, pembayaran, laporan, kuitansi.
- **WP-11 AI, Monitoring & Integration** — Gemini ON/OFF, audit, monitoring, backup, integrasi akhir.
- **Finalisasi Phase 7** — testing penuh, go-live checklist, rollback, pelatihan.

## 3.2 Prasyarat Masuk

- [ ] Semua exit criteria Tahap 2 terpenuhi dan disetujui.
- [ ] Data dictionary sheet keuangan selesai.
- [ ] Aturan transaksi keuangan disetujui: format nomor transaksi, pembatalan, koreksi, rekonsiliasi.
- [ ] Template kuitansi dan format nomor disetujui.
- [ ] Gemini API key siap, disimpan di Script Properties (tidak pernah di repo/frontend).

## 3.3 Urutan Pekerjaan

| Urutan | Pekerjaan | Catatan |
|---|---|---|
| 3.1 | Sheet keuangan: `KAS`, `KATEGORI_TRANSAKSI`, `IURAN`, `PEMBAYARAN`, `TRANSAKSI`, `ANGGARAN`, `BUKTI_PEMBAYARAN` | |
| 3.2 | Modul Kas: kas pusat + kas per komisi; **kewenangan pencatatan terpusat di Bendahara Pusat**; laporan dapat dipisah per komisi | |
| 3.3 | Transaksi & pembayaran: tunai (dicatat bendahara) dan transfer (wajib verifikasi sebelum lunas); nomor transaksi unik; kontrol duplikasi; idempotency | LockService pada **semua** tulis keuangan |
| 3.4 | Kuitansi digital: PDF via DocumentApp → simpan di Drive, referensi di Sheets; unduh/cetak/bagikan via WhatsApp manual (deep link, tanpa API berbayar) | Penerima tidak perlu akun CCMS |
| 3.5 | Iuran + laporan keuangan: ringkasan, per periode, per komisi, sesuai permission | |
| 3.6 | Gemini AI Assistant: draft pengumuman, perbaikan kalimat, variasi nada; cek `AI_ASSISTANT_ENABLED` + permission di backend sebelum memanggil API; `AI_USAGE_LOG`; data sensitif tidak dikirim ke model | Hasil AI selalu draft; manusia menyetujui publikasi |
| 3.7 | Backup & recovery: backup terjadwal Sheets + Drive (time-driven script), metadata backup, uji restore | Jangan andalkan version history |
| 3.8 | Monitoring: kuota GAS, error, performa; audit log lengkap | |
| 3.9 | Testing penuh: T-01 s.d. T-11, termasuk financial testing (saldo, verifikasi, kuitansi) dan security testing | |
| 3.10 | Go-live: migrasi data final ke PROD, pelatihan pengurus, dokumentasi operasional, rollback plan, checklist 7.4 | |

## 3.4 Kriteria Keluar (Go-Live)

- [ ] Bendahara memverifikasi end-to-end: input transaksi → verifikasi transfer → lunas → kuitansi PDF di Drive → laporan saldo cocok.
- [ ] Laporan per komisi hanya dapat diakses sesuai permission.
- [ ] AI Assistant: ON berfungsi sesuai permission; OFF menyembunyikan UI dan backend menolak request (Gemini tidak dipanggil).
- [ ] Backup terbukti dapat di-restore dalam recovery drill.
- [ ] Semua item checklist go-live dokumen induk 7.4 tercentang.
- [ ] UAT final disetujui secara tertulis oleh pengurus gereja.
- [ ] RPO/RTO ditetapkan dan teruji; prosedur pergantian pengurus terdokumentasi.

---

# Pemetaan Issue GitHub

Buat 13 issue berikut (label per tahap: `tahap-1`, `tahap-2`, `tahap-3`), masing-masing dengan acceptance criteria dari dokumen ini:

| Issue | Judul | Tahap |
|---|---|---|
| #1 | WP-01 — Project Foundation & environment | 1 |
| #2 | WP-02 — Backend foundation (gateway, response, logging) | 1 |
| #3 | WP-03 — Authentication & Authorization | 1 |
| #4 | WP-04 — Database & system configuration | 1 |
| #5 | WP-05 — Public Portal | 1 |
| #6 | WP-06 — Internal dashboard (skeleton → penuh) | 1–2 |
| #7 | WP-07 — Member management (jemaat, keluarga, impor, arsip) | 2 |
| #8 | WP-08 — Committee & ministry | 2 |
| #9 | WP-10 — Announcement & event | 2 |
| #10 | WP-09 — Financial management | 3 |
| #11 | WP-11 — AI assistant (Gemini) | 3 |
| #12 | WP-11 — Backup, monitoring, recovery drill | 3 |
| #13 | Go-live: testing penuh, pelatihan, checklist | 3 |

Status tiap issue mengikuti: `Not Started → In Progress → Testing → UAT → Approved` (+ `On Hold`, `Blocked`).

---

# Manajemen Risiko Sepanjang 3 Tahap

| Risiko | Kapan relevan | Mitigasi |
|---|---|---|
| Kuota/konkurensi Apps Script | Semua tahap, kritis di Tahap 3 (keuangan) | Batch read/write, LockService, monitoring kuota |
| Worker dianggap cukup aman | Tahap 1 | Semua authz di Apps Script; uji akses langsung ke endpoint GAS |
| Race condition tulis | Tahap 2–3 | LockService + ID unik + validasi |
| Data migrasi kotor | Tahap 2 | Validasi + preview + batch di STAGING, verifikasi jumlah/sample |
| API key bocor | Tahap 3 | Script Properties saja; tidak pernah di frontend/repo |
| Backup gagal dipulihkan | Tahap 3 | Recovery drill sebelum go-live |
| Ketergantungan satu pengurus | Semua tahap | Dokumentasi + prosedur serah terima sejak Tahap 1 |

---

# Prinsip Pelaksanaan (mengikat)

1. Tidak memulai tahap berikutnya sebelum exit criteria tahap sebelumnya disetujui.
2. Data produksi tidak pernah dipakai untuk development/eksperimen.
3. Setiap modul melewati: design → development → unit test → integration test → UAT → dokumentasi → approval.
4. Keamanan dan privasi (termasuk NIK) diperlakukan sebagai persyaratan, bukan pelengkap.
5. Semua perubahan keputusan dicatat di change log dokumen induk.

---

**Akhir roadmap.** Progress dicatat pada issue GitHub terkait; dokumen ini diperbarui bila ada perubahan scope yang disetujui.
