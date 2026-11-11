# Deployment Google (Apps Script + Sheets + Drive)

## 1. Kepemilikan dan isolasi

- Gunakan akun Gmail khusus gereja untuk seluruh environment.
- Aktifkan 2FA dan recovery yang dikuasai gereja.
- Buat **project Apps Script terpisah** untuk DEV, STAGING, dan PROD. Satu akun Google boleh memiliki banyak project.
- Jangan menggunakan satu project lalu mengganti `CCMS_ENV`, spreadsheet ID, atau session secret untuk berpindah environment.

## 2. Pemetaan project

| Environment | Judul project | Script Property `CCMS_ENV` | Spreadsheet | Drive folder |
|---|---|---|---|---|
| DEV | CCMS Backend (DEV) | DEV | CCMS-DEV-DB | CCMS/DEV |
| STAGING | CCMS Backend (STG) | STAGING | CCMS-STAGING-DB | CCMS/STAGING |
| PROD | CCMS Backend (PROD) | PROD | CCMS-PROD-DB | CCMS/PROD |

Nama di atas adalah standar penamaan, bukan bukti bahwa resource cloud sudah dibuat. Catat Script ID, deployment ID, URL, dan spreadsheet ID aktual di password manager/dokumen terbatas; jangan commit secret atau token ke Git.

## 3. Setup project per environment

1. Install dan login clasp:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```
2. Buat project Apps Script baru untuk environment yang dituju (contoh STAGING: `CCMS Backend (STG)`).
3. Hubungkan folder source ke Script ID project tersebut. Jangan menyalin `clasp.json` milik environment lain.
4. Push source yang telah direview.
5. Atur Script Properties project tersebut:
   - `CCMS_ENV` = DEV, STAGING, atau PROD sesuai project.
   - `CCMS_SPREADSHEET_ID` harus kosong hanya saat membuat database baru.
6. Verifikasi environment dan pointer sebelum menjalankan setup.

## 4. Pembuatan database awal

Jalankan `setupDatabase()` hanya sekali pada project baru yang belum memiliki `CCMS_SPREADSHEET_ID`.

Fungsi saat ini:
- Membuat spreadsheet `CCMS-<ENV>-DB`.
- Membuat 9 sheet Tahap 1, termasuk `REVOKED_SESSIONS`.
- Membuat folder Drive `CCMS/<ENV>` dan memindahkan spreadsheet ke folder tersebut.
- Menulis `CCMS_SPREADSHEET_ID` dan `SESSION_SECRET` baru ke Script Properties project itu.
- Membuat akun Super Admin awal dengan `must_change_password=true`.

**Keamanan:** password awal dicetak ke Apps Script execution log. Perlakukan log sebagai rahasia, ambil melalui kanal aman, dan segera ganti password. Jangan memasukkan password, session secret, Script ID, atau spreadsheet ID ke Git.

**Jangan rerun jika setup gagal setelah `CCMS_SPREADSHEET_ID` tersimpan.** Kode saat ini menulis pointer sebelum memindahkan spreadsheet ke folder Drive. Lakukan pemeriksaan/recovery manual terlebih dahulu agar tidak membuat resource duplikat.

## 5. Deploy Web App

Setelah database siap:
1. Buat deployment Web App khusus environment.
2. Execute as: akun Gmail khusus gereja.
3. Who has access: Anyone, sesuai pola integrasi Worker saat ini; backend tetap memvalidasi autentikasi dan otorisasi.
4. Catat URL `/exec` dan deployment ID di catatan operasional terbatas.
5. Masukkan URL hanya ke konfigurasi Worker environment yang sesuai.

## 6. Pembaruan dan rollback

- Push source yang telah direview ke project target saja.
- Buat deployment version baru dan catat deployment ID/version.
- Jangan mengubah project atau Script Properties environment lain.
- Rollback dengan deployment version sebelumnya untuk environment yang sama.
- Rincian pembuatan STAGING ada di [STAGING Setup Runbook](../../docs/deployment/STAGING_SETUP_RUNBOOK.md).
