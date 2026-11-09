# CCMS — Panduan Langkah Demi Langkah (Step-by-Step User Guide & To-Do List)

Panduan ini adalah *checklist* praktis dan urutan kerja bagi Anda untuk menyiapkan, mendeploy, dan menjalankan **Tahap 1** CCMS hingga berfungsi penuh secara end-to-end.

---

## Ringkasan Alur Kerja

1. **Persiapan Akun & Cloud (Prasyarat)**
2. **Setup Database & Backend (Google Apps Script & Sheets)**
3. **Setup API Gateway (Cloudflare Worker)**
4. **Setup Frontend (Cloudflare Pages)**
5. **Verifikasi & Pengujian Tahap 1**

---

## TO-DO LIST & PANDUAN EKSEKUSI

### 1. Persiapan Akun & Cloud (Prasyarat)
- [ ] **Akun Gmail Khusus Gereja**: Pastikan Anda menggunakan satu akun Gmail khusus (bukan akun pribadi) sebagai pemilik sistem.
- [ ] **Aktifkan 2FA**: Aktifkan *2-Step Verification* pada akun Gmail tersebut dan simpan nomor pemulihan/email pemulihan gereja.
- [ ] **Akun Cloudflare**: Pastikan Anda memiliki akun Cloudflare gratis yang aktif untuk menghosting Pages dan Worker.
- [ ] **Node.js terinstal**: Pastikan di komputer lokal Anda terinstal Node.js dan npm (untuk menjalankan Wrangler dan clasp).

---

### 2. Setup Database & Backend (Google Apps Script & Sheets)

Langkah ini membuat spreadsheet database, tabel, dan akun Super Admin awal.

- [ ] **Install Google clasp (CLI)** secara global di komputer Anda:
  ```bash
  npm install -g @google/clasp
  ```
- [ ] **Login ke clasp**:
  ```bash
  clasp login
  ```
  *(Ikuti petunjuk di browser menggunakan akun Gmail khusus gereja).*
- [ ] **Buat Project Apps Script (DEV)**:
  ```bash
  cd backend/apps-script
  clasp create --title "CCMS Backend (DEV)" --type standalone
  ```
  *(Perintah ini otomatis membuat file `.clasp.json` yang berisi scriptId).*
- [ ] **Sesuaikan nama folder Google Drive**:
  - Buka file `tools/SetupDatabase.gs`.
  - Pastikan baris `DRIVE_FOLDER_NAME = 'CCMS/DEV';` dan nama spreadsheet `SpreadsheetApp.create('CCMS-DEV-DB');` sudah sesuai.
- [ ] **Push kode ke Apps Script**:
  ```bash
  clasp push
  ```
- [ ] **Deploy sebagai Web App (Pertama kali)**:
  ```bash
  clasp deploy -m "Release Tahap 1 Awal"
  ```
  *(Atau deploy melalui browser: Buka [script.google.com](https://script.google.com) → Pilih project CCMS Backend (DEV) → Deploy → New deployment → Pilih jenis **Web app**: Execute as: **Me**, Who has access: **Anyone**).*
- [ ] **Salin URL Web App (`.../exec`)**: Simpan URL ini untuk dimasukkan ke Cloudflare Worker nanti.
- [ ] **Jalankan Setup Database**:
  - Di editor Apps Script online (`script.google.com`), buka file `tools/SetupDatabase.gs`.
  - Pilih fungsi `setupDatabase` pada dropdown, lalu klik **Run**.
  - Berikan izin akses (*Authorize permissions*).
- [ ] **Catat Kredensial Super Admin Awal**:
  - Buka **Execution log** di Apps Script (ikon log di sebelah kiri).
  - Catat **username** (`admin`) dan **password acak** yang dicetak di log.
  - Catat juga URL Spreadsheet database yang baru dibuat di Google Drive Anda.

---

### 3. Setup API Gateway (Cloudflare Worker)

Langkah ini menghubungkan frontend dengan backend Apps Script.

- [ ] **Masuk ke folder worker**:
  ```bash
  cd ../../worker
  npm install
  ```
- [ ] **Login ke Wrangler**:
  ```bash
  npx wrangler login
  ```
- [ ] **Edit file `wrangler.toml`**:
  - Ganti `https://script.google.com/macros/s/DEPLOY_ID/exec` dengan URL Web App Apps Script (`.../exec`) yang Anda dapatkan di langkah sebelumnya.
  - Sesuaikan `ALLOWED_ORIGINS` dengan URL Cloudflare Pages Anda (bisa diisi menyusul setelah Pages dibuat).
- [ ] **Deploy Worker**:
  ```bash
  npx wrangler deploy
  ```
- [ ] **Catat URL Worker Anda** (contoh: `https://ccms-api.nama-anda.workers.dev`).

---

### 4. Setup Frontend (Cloudflare Pages)

Menghosting antarmuka statis (Portal Publik & Aplikasi Internal).

- [ ] **Pilih salah satu cara deployment Pages**:
  - **Cara A (Dashboard Git Integration — Disarankan):**
    1. Push repo `Saladimu/ccms` ke GitHub (sudah kita lakukan).
    2. Buka Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
    3. Pilih repository `Saladimu/ccms`.
    4. Buat **dua project Pages** dari repo yang sama:
       - **Project 1 (Portal Publik):**
         - Production branch: `main`
         - Build command: *(kosong)*
         - **Build output directory:** `frontend/public`
       - **Project 2 (Internal CCMS):**
         - Production branch: `main`
         - Build command: *(kosong)*
         - **Build output directory:** `frontend/internal`
  - **Cara B (CLI Wrangler):**
    ```bash
    npx wrangler pages deploy frontend/public --project-name=ccms-public
    npx wrangler pages deploy frontend/internal --project-name=ccms-internal
    ```
- [ ] **Atur API Endpoint di Frontend**:
  - Buka file `frontend/public/index.html` dan `frontend/internal/index.html`.
  - Pastikan variabel `API_BASE` mengarah ke URL Cloudflare Worker Anda (atau gunakan *Custom Domain* `/api/*` yang diarahkan ke Worker).

---

### 5. Verifikasi & Pengujian Tahap 1 (UAT Awal)

Setelah semua terdeploy, lakukan pengujian berikut:

- [ ] **Uji Portal Publik**:
  - Buka URL Cloudflare Pages publik Anda.
  - Pastikan nama gereja, tagline, dan menu dinamis (Beranda, Jadwal, Pengumuman, Kegiatan, Profil, Kontak) termuat dari database Google Sheets.
- [ ] **Uji Login Internal**:
  - Buka URL Cloudflare Pages internal Anda.
  - Masukkan username `admin` dan password dari log Apps Script.
  - Pastikan login sukses, token tersimpan di `localStorage`, dan dashboard muncul sesuai role `SUPER_ADMIN`.
- [ ] **Uji Keamanan Lockout**:
  - Logout, lalu coba login dengan password salah 3 kali berturut-turut.
  - Pastikan sistem memblokir (*lockout*) selama 5 menit dan mencatatnya di sheet `LOGIN_ATTEMPTS`.
- [ ] **Uji Proteksi Backend**:
  - Pastikan halaman internal tidak bisa diakses tanpa token valid, dan endpoint internal menolak request anonim.

---

## Apa Selanjutnya?

Setelah checklist Tahap 1 di atas selesai dan terverifikasi dengan baik, Anda siap melangkah ke **Tahap 2 (Modul Operasional: Jemaat, Komisi, Pengumuman, Kegiatan)** sesuai dokumen roadmap [`docs/requirements/ROADMAP_3_TAHAPAN.md`](docs/requirements/ROADMAP_3_TAHAPAN.md).
