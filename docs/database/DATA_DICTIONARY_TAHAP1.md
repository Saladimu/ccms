# CCMS — Data Dictionary Tahap 1

**Versi:** 1.0
**Tanggal:** 9 November 2026
**Status:** Disetujui sebagai dasar implementasi Tahap 1
**Sheet yang dicakup:** `CONFIG`, `PUBLIC_MENU`, `USERS`, `ROLES`, `PERMISSIONS`, `USER_ROLES`, `AUDIT_LOG`, `LOGIN_ATTEMPTS`

Sheet untuk Tahap 2 (jemaat/komisi/pengumuman) dan Tahap 3 (keuangan) akan didokumentasikan saat masing-masing tahap dimulai (mengikuti roadmap).

---

## 1. Konvensi Umum

Berlaku untuk semua sheet CCMS:

| Aturan | Penjelasan |
|---|---|
| Baris 1 | Selalu header kolom (nama kolom persis seperti di dokumen ini). |
| ID unik | Setiap record punya ID dengan format `PREFIX-XXXXXXXXXX` (huruf besar), digenerate backend (timestamp base36 + acak), **tidak** boleh diketik manual dan tidak bergantung nomor baris. |
| Boolean | Ditulis `TRUE` / `FALSE` (huruf besar), bukan centang. |
| Timestamp | ISO 8601 zona waktu Asia/Jakarta, contoh: `2026-11-09T14:30:00+07:00`. |
| NULL | Sel kosong. Jangan isi teks `null`, `NA`, `-`. |
| Hapus record | Tidak ada hard delete untuk data operasional (jemaat, transaksi, log). Sheet konfig boleh dihapus hanya oleh Super Admin via aplikasi. |
| Akses | Sheet **tidak** dibuka manual oleh pengguna. Semua mutasi lewat Apps Script dengan LockService. |
| Proteksi | Sheet diproteksi (protection rules) hanya editor = Apps Script service account gereja. |

Prefix ID per sheet:

| Sheet | Prefix | Contoh |
|---|---|---|
| USERS | `USR` | `USR-M4K7A2B1C9` |
| ROLES | `ROL` | `ROL-M4K7A2B2D0` |
| PERMISSIONS | `PERM` | `PERM-M4K7A2B3E1` |
| USER_ROLES | `UR` | `UR-M4K7A2B4F2` |
| PUBLIC_MENU | `MENU` | `MENU-M4K7A2B5G3` |
| CONFIG | `CFG` | `CFG-M4K7A2B6H4` |
| AUDIT_LOG | `AUD` | `AUD-M4K7A2B7I5` |
| LOGIN_ATTEMPTS | `ATT` | `ATT-M4K7A2B8J6` |

---

## 2. CONFIG

Pengaturan sistem key-value. Baca cepat (di-cache), tulis hanya Super Admin via permission `SYSTEM_CONFIG`.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `config_key` | STRING | Ya | Kunci unik (lihat daftar kunci). Huruf besar + underscore. |
| `config_value` | STRING | Ya | Nilai disimpan sebagai teks; interpretasi sesuai `value_type`. |
| `value_type` | ENUM | Ya | `STRING` / `NUMBER` / `BOOLEAN` / `JSON` |
| `is_secret` | BOOLEAN | Ya | `TRUE` bila nilai sensitif (mis. tidak pernah dikirim ke frontend apa pun). |
| `description` | STRING | Tidak | Penjelasan untuk admin. |
| `updated_at` | TIMESTAMP | Ya | Waktu perubahan terakhir. |
| `updated_by` | STRING | Ya | `user_id` pengubah; `SYSTEM` bila seed awal. |

Unik: `config_key`.

### Daftar kunci yang disetujui

| config_key | value_type | Default | Keterangan |
|---|---|---|---|
| `CHURCH_NAME` | STRING | *(isi saat setup)* | Nama resmi gereja |
| `CHURCH_TAGLINE` | STRING | — | Slogan/versi singkat |
| `CHURCH_ADDRESS` | STRING | — | Alamat lengkap |
| `CHURCH_PHONE` | STRING | — | Nomor telepon (E.164 bila mungkin) |
| `CHURCH_EMAIL` | STRING | — | Email kontak |
| `CHURCH_LOGO_URL` | STRING | — | URL logo (Drive share link publik) |
| `THEME_PUBLIC` | ENUM | `CLASSIC` | `CLASSIC` / `MODERN` / `WARM` |
| `THEME_INTERNAL` | ENUM | `MODERN` | `CLASSIC` / `MODERN` / `WARM` |
| `PUBLIC_DARK_MODE` | BOOLEAN | `FALSE` | Tema gelap portal publik |
| `INTERNAL_DARK_MODE` | BOOLEAN | `FALSE` | Tema gelap aplikasi internal |
| `MAINTENANCE_MESSAGE` | STRING | `Sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya.` | Pesan menu OFF-Maintenance |
| `SESSION_TTL_MINUTES` | NUMBER | `480` | Masa berlaku sesi internal |
| `LOGIN_MAX_ATTEMPTS` | NUMBER | `3` | Maksimal kegagalan sebelum lockout |
| `LOGIN_LOCKOUT_MINUTES` | NUMBER | `5` | Durasi lockout |
| `AI_ASSISTANT_ENABLED` | BOOLEAN | `FALSE` | Feature flag AI (dipakai Tahap 3, didefinisikan sekarang) |
| `AI_PROVIDER` | STRING | `GEMINI` | — |
| `AI_MODEL` | STRING | *(isi Tahap 3)* | Nama model Gemini |
| `AI_DAILY_LIMIT` | NUMBER | `50` | Batas pemanggilan AI per hari |
| `CHURCH_HISTORY` | STRING | *(isi saat setup)* | Ringkasan sejarah gereja untuk portal publik |
| `CHURCH_VISION` | STRING | *(isi saat setup)* | Visi gereja untuk portal publik |
| `CHURCH_MISSION` | STRING | *(isi saat setup)* | Misi gereja untuk portal publik |
| `PUBLIC_WORSHIP_SCHEDULE` | STRING | *(isi saat setup)* | Informasi jadwal ibadah publik |
| `PUBLIC_ANNOUNCEMENTS_INFO` | STRING | *(isi saat setup)* | Informasi pengumuman publik sementara sebelum modul Tahap 2 |
| `PUBLIC_EVENTS_INFO` | STRING | *(isi saat setup)* | Informasi kegiatan dan kalender publik sementara sebelum modul Tahap 2 |
| `PUBLIC_MINISTRY_INFO` | STRING | *(isi saat setup)* | Informasi komisi dan pelayanan publik |
| `PUBLIC_CONTACT_HOURS` | STRING | *(isi saat setup)* | Jam layanan/kontak gereja |

> Kunci baru hanya boleh ditambahkan lewat perubahan yang dicatat di change log dokumen induk.

---

## 3. PUBLIC_MENU

Menu navigasi portal publik. Status ditegakkan di backend (endpoint halaman pun memeriksa status).

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `menu_id` | STRING | Ya | ID unik, prefix `MENU`. |
| `menu_key` | STRING | Ya | Kunci unik stabil untuk kode: `home`, `schedule`, `announcements`, `events`, `profile`, `contact`, `ministries`. |
| `menu_label` | STRING | Ya | Label tampil di navigasi (Bahasa Indonesia). |
| `parent_menu_id` | STRING | Tidak | Untuk submenu; `NULL` bila level 1. |
| `url_path` | STRING | Ya | Path relatif portal, contoh `/jadwal`. |
| `status` | ENUM | Ya | `ON` / `OFF_HIDDEN` / `OFF_MAINTENANCE` |
| `sort_order` | NUMBER | Ya | Urutan tampil; kecil lebih dulu. |
| `updated_at` | TIMESTAMP | Ya | — |
| `updated_by` | STRING | Ya | — |

Unik: `menu_key`.

### Seed data (6 menu level 1)

| menu_key | menu_label | url_path | sort_order |
|---|---|---|---|
| `home` | Beranda | `/` | 1 |
| `schedule` | Jadwal Ibadah | `/jadwal` | 2 |
| `announcements` | Pengumuman | `/pengumuman` | 3 |
| `events` | Kegiatan | `/kegiatan` | 4 |
| `profile` | Profil Gereja | `/profil` | 5 |
| `contact` | Kontak | `/kontak` | 6 |
| `ministries` | Komisi & Pelayanan | `/komisi-pelayanan` | 7 |

---

## 4. USERS

Akun login internal (pengurus/petugas). **Terpisah** dari data jemaat.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `user_id` | STRING | Ya | ID unik, prefix `USR`. |
| `username` | STRING | Ya | Unik, 3–32 karakter, `[a-z0-9._]`, lowercase. |
| `password_hash` | STRING | Ya | Format `sha256$<iterasi>$<salt-hex>$<hash-hex>`. Lihat aturan hashing di bawah. |
| `full_name` | STRING | Ya | Nama lengkap. |
| `email` | STRING | Tidak | Email kontak (untuk notifikasi, bukan login). |
| `phone` | STRING | Tidak | — |
| `is_active` | BOOLEAN | Ya | `FALSE` = akun dinonaktifkan (tidak bisa login, data tetap ada). |
| `must_change_password` | BOOLEAN | Ya | `TRUE` saat akun dibuat/di-reset oleh admin; dipaksa ganti password setelah login. |
| `locked_until` | TIMESTAMP | Tidak | Waktu lockout aktif; kosong bila tidak terkunci. |
| `consecutive_failures` | NUMBER | Ya | Default `0`; di-reset saat login sukses. |
| `last_login_at` | TIMESTAMP | Tidak | — |
| `created_at` | TIMESTAMP | Ya | — |
| `created_by` | STRING | Ya | `user_id` pembuat; `SYSTEM` untuk seed Super Admin awal. |
| `updated_at` | TIMESTAMP | Ya | — |
| `updated_by` | STRING | Ya | — |

Unik: `username`.

### Aturan hashing password

- Algoritma: iterated SHA-256 (PBKDF2 ekuivalen manual) dengan salt acak 16 byte (32 hex).
- Iterasi: **50.000** (dibaca dari bagian `$iterasi$` saat verifikasi, sehingga bisa dinaikkan di masa depan).
- Hash disimpan sebagai hex lowercase.
- Password minimal 8 karakter (wajib huruf + angka); verifikasi dilakukan di backend saat create/reset.
- Password tidak pernah disimpan/dikirim dalam bentuk plaintext; endpoint login hanya mengembalikan status sukses/gagal.

---

## 5. ROLES

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `role_id` | STRING | Ya | ID unik, prefix `ROL`. |
| `role_code` | STRING | Ya | Unik, huruf besar, contoh `SUPER_ADMIN`. |
| `role_name` | STRING | Ya | Nama tampil, contoh `Super Admin`. |
| `description` | STRING | Tidak | — |
| `is_system` | BOOLEAN | Ya | Role sistem tidak dapat dihapus. |
| `is_active` | BOOLEAN | Ya | — |
| `created_at` | TIMESTAMP | Ya | — |
| `created_by` | STRING | Ya | — |

Unik: `role_code`.

### Seed data (6 role)

| role_code | role_name | is_system |
|---|---|---|
| `SUPER_ADMIN` | Super Admin | TRUE |
| `PASTOR` | Pendeta/Majelis | TRUE |
| `SECRETARY` | Sekretaris/Admin | TRUE |
| `TREASURER` | Bendahara Pusat | TRUE |
| `COMMITTEE_HEAD` | Pengurus Komisi | TRUE |
| `STAFF` | Petugas Pelayanan | TRUE |

---

## 6. PERMISSIONS

Katalog permission (capability). Dikaitkan ke role; pengecekan dilakukan per operasi di backend.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `permission_id` | STRING | Ya | ID unik, prefix `PERM`. |
| `permission_code` | STRING | Ya | Unik, huruf besar + underscore. |
| `permission_name` | STRING | Ya | Nama tampil. |
| `module` | ENUM | Ya | `SYSTEM` / `MEMBER` / `COMMITTEE` / `FINANCE` / `ANNOUNCEMENT` / `EVENT` / `AI` / `REPORT` |
| `stage` | NUMBER | Ya | Tahap roadmap (1/2/3) saat permission mulai digunakan. |
| `is_active` | BOOLEAN | Ya | — |
| `description` | STRING | Tidak | — |

Unik: `permission_code`.

### Seed data (katalog penuh, semua tahap)

| permission_code | module | stage | Keterangan |
|---|---|---|---|
| `USER_MANAGE` | SYSTEM | 1 | Kelola akun CCMS |
| `SYSTEM_CONFIG` | SYSTEM | 1 | Ubah CONFIG (non-secret) |
| `MENU_CONFIG` | SYSTEM | 1 | Ubah status/menu publik |
| `AUDIT_VIEW` | SYSTEM | 1 | Lihat audit log |
| `MEMBER_READ` | MEMBER | 2 | Lihat data jemaat |
| `MEMBER_CREATE` | MEMBER | 2 | Buat jemaat baru |
| `MEMBER_EDIT` | MEMBER | 2 | Ubah data jemaat |
| `MEMBER_ARCHIVE` | MEMBER | 2 | Arsip/restore jemaat |
| `REGISTRATION_REVIEW` | MEMBER | 2 | Verifikasi pendaftaran jemaat |
| `IMPORT_RUN` | MEMBER | 2 | Jalankan impor/migrasi |
| `COMMITTEE_MANAGE` | COMMITTEE | 2 | Kelola komisi & pengurusnya |
| `SCHEDULE_VIEW` | COMMITTEE | 2 | Lihat jadwal pelayanan |
| `SCHEDULE_MANAGE` | COMMITTEE | 2 | Ubah jadwal pelayanan |
| `FINANCE_READ` | FINANCE | 3 | Lihat kas/transaksi |
| `FINANCE_WRITE` | FINANCE | 3 | Catat transaksi |
| `FINANCE_VERIFY` | FINANCE | 3 | Verifikasi pembayaran transfer |
| `RECEIPT_VIEW` | FINANCE | 3 | Unduh/bagikan kuitansi |
| `ANNOUNCE_DRAFT` | ANNOUNCEMENT | 2 | Buat draft pengumuman |
| `ANNOUNCE_APPROVE` | ANNOUNCEMENT | 2 | Persetujuan pengumuman |
| `ANNOUNCE_PUBLISH` | ANNOUNCEMENT | 2 | Publish/hidden pengumuman |
| `EVENT_MANAGE` | EVENT | 2 | Kelola kegiatan & dokumentasi |
| `REPORT_VIEW` | REPORT | 2 | Lihat laporan per role |
| `AI_USE` | AI | 3 | Pakai AI Assistant |

---

## 7. USER_ROLES

Relasi M:N pengguna–role.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `user_role_id` | STRING | Ya | ID unik, prefix `UR`. |
| `user_id` | STRING | Ya | FK → `USERS.user_id`. |
| `role_id` | STRING | Ya | FK → `ROLES.role_id`. |
| `assigned_at` | TIMESTAMP | Ya | — |
| `assigned_by` | STRING | Ya | — |

Unik gabungan: `user_id` + `role_id` (dicek backend).

> Efek penghapusan baris = pencabutan role (audit wajib dicatat). Pengguna Super Admin terakhir tidak boleh kehilangan role `SUPER_ADMIN`.

---

## 8. AUDIT_LOG

Log append-only aktivitas penting. Tidak boleh dihapus/diedit lewat aplikasi.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `audit_id` | STRING | Ya | ID unik, prefix `AUD`. |
| `timestamp` | TIMESTAMP | Ya | Waktu kejadian. |
| `session_id` | STRING | Tidak | ID sesi saat kejadian (kosong bila tanpa sesi). |
| `user_id` | STRING | Tidak | `NULL` bila anonim/publik. |
| `username` | STRING | Tidak | Snapshot username (bisa berubah di USERS). |
| `action` | STRING | Ya | Kode aksi, contoh: `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `ARCHIVE`, `RESTORE`, `APPROVE`, `REJECT`, `PUBLISH`, `HIDE`, `CONFIG_SET`, `MENU_SET`, `ROLE_ASSIGN`, `ROLE_REVOKE`, `PASSWORD_RESET`, `AI_CALL`, `EXPORT` |
| `module` | STRING | Ya | Modul asal: `AUTH` / `USER` / `MEMBER` / `FINANCE` / `ANNOUNCEMENT` / `SYSTEM` / `AI` |
| `record_type` | STRING | Tidak | Tipe record yang dipengaruhi, contoh `JEMAAT`, `CONFIG`, `PENGUMUMAN`. |
| `record_id` | STRING | Tidak | ID record terkait. |
| `detail` | JSON | Tidak | Rincian sebagai JSON string (mis. field yang berubah + nilai lama/baru). Jangan simpan password/secret. |
| `ip_address` | STRING | Tidak | IP pemanggil (bila tersedia). |

Retensi: tidak dihapus; dipindahkan ke sheet terpisah bila > 50.000 baris (proses admin).

---

## 9. LOGIN_ATTEMPTS

Log percobaan login (sukses dan gagal). Mekanisme lockout dihitung dari `USERS.consecutive_failures` + `USERS.locked_until`; sheet ini adalah log audit.

| Kolom | Tipe | Wajib | Aturan / Keterangan |
|---|---|---|---|
| `attempt_id` | STRING | Ya | ID unik, prefix `ATT`. |
| `timestamp` | TIMESTAMP | Ya | — |
| `username` | STRING | Ya | Username yang dicoba (persis seperti diinput, dinormalisasi lowercase). |
| `success` | BOOLEAN | Ya | — |
| `failure_reason` | STRING | Tidak | Untuk gagal: `BAD_CREDENTIALS` / `LOCKED` / `INACTIVE`. |
| `ip_address` | STRING | Tidak | — |
| `user_agent` | STRING | Tidak | Potong maks 255 karakter. |

Retensi: pertahankan 90 hari; pembersihan dilakukan time-driven script Super Admin (bukan aplikasi).

---

## 10. Matriks Role → Permission (Baseline Tahap 1)

Permission Tahap 2/3 akan dimatikan secara fungsional hingga tahapnya dikerjakan, tetapi matriksnya ditetapkan sekarang agar stabil.

| Permission | SUPER_ADMIN | PASTOR | SECRETARY | TREASURER | COMMITTEE_HEAD | STAFF |
|---|---|---|---|---|---|---|
| `USER_MANAGE` | ✅ | — | — | — | — | — |
| `SYSTEM_CONFIG` | ✅ | — | — | — | — | — |
| `MENU_CONFIG` | ✅ | — | — | — | — | — |
| `AUDIT_VIEW` | ✅ | ✅ | — | — | — | — |
| `MEMBER_READ` | ✅ | ✅ | ✅ | — | ✅* | — |
| `MEMBER_CREATE` | ✅ | — | ✅ | — | — | — |
| `MEMBER_EDIT` | ✅ | — | ✅ | — | — | — |
| `MEMBER_ARCHIVE` | ✅ | — | ✅ | — | — | — |
| `REGISTRATION_REVIEW` | ✅ | — | ✅ | — | — | — |
| `IMPORT_RUN` | ✅ | — | ✅ | — | — | — |
| `COMMITTEE_MANAGE` | ✅ | — | — | — | ✅ (komisinya) | — |
| `SCHEDULE_VIEW` | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `SCHEDULE_MANAGE` | ✅ | — | ✅ | — | ✅ (komisinya) | — |
| `FINANCE_READ` | ✅ | ✅ | — | ✅ | — | — |
| `FINANCE_WRITE` | ✅ | — | — | ✅ | — | — |
| `FINANCE_VERIFY` | ✅ | — | — | ✅ | — | — |
| `RECEIPT_VIEW` | ✅ | — | ✅ | ✅ | — | — |
| `ANNOUNCE_DRAFT` | ✅ | ✅ | ✅ | — | ✅ | — |
| `ANNOUNCE_APPROVE` | ✅ | ✅ | — | — | — | — |
| `ANNOUNCE_PUBLISH` | ✅ | ✅ | ✅ | — | ✅** | — |
| `EVENT_MANAGE` | ✅ | — | ✅ | — | ✅ (komisinya) | — |
| `REPORT_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ (komisinya) | — |
| `AI_USE` | ✅ | ✅ | ✅ | ✅ | ✅ | — |

\* `COMMITTEE_HEAD` melihat data jemaat hanya yang terkait komisinya (dibatasi di backend Tahap 2).
\** `COMMITTEE_HEAD` publish pengumuman kategori komisinya saja.

> Perubahan matriks = perubahan scope; wajib dicatat di change log dokumen induk.

---

## 11. Catatan Implementasi

1. Sheet dibuat otomatis oleh `SetupDatabase()` di `backend/apps-script/tools/SetupDatabase.gs` (header + seed di atas).
2. Cache konfigurasi: baca `CONFIG` maksimal 1× per eksekusi per script (cache in-memory); invalidasi manual saat `CONFIG_SET`.
3. `CONFIG.is_secret=TRUE` tidak boleh dikirim ke frontend pada endpoint apa pun.
4. `USERS.locked_until` + `USERS.consecutive_failures` di-update atomik (LockService) setiap percobaan login.
5. Semua sheet diproteksi; satu-satunya penulis adalah Apps Script.
6. Migrasi skema di masa depan: setiap perubahan kolom baru wajib lewat change log + update dokumen ini + versi data dictionary.

**Akhir dokumen.**
