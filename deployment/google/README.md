# Deployment Google (Apps Script + Sheets + Drive)

## 1. Akun & kepemilikan

- Gunakan **akun Gmail khusus gereja** untuk seluruh environment.
- 2FA aktif, recovery email/nomor milik gereja, dokumentasikan prosedur serah terima pengurus (dokumen induk bagian 5.2).

## 2. clasp (CLI)

```bash
npm install -g @google/clasp
clasp login
cd backend/apps-script
clasp create --title "CCMS Backend (ENV)"   # sekali, per environment
# clasp.json menerimascriptId otomatis
clasp push
clasp deploy -m "Tahap 1 — release awal"
```

## 3. Setelah deploy

1. Buka URL project → Deploy → New deployment → **Web app**:
   - Execute as: **Me** (akun gereja)
   - Who has access: **Anyone** ← wajib, agar Cloudflare Worker bisa memanggil
     (keamanan tetap dijamin Apps Script: setiap request diverifikasi token).
2. Salin URL `.../exec` ke `wrangler.toml` (variabel `GAS_URL`) environment yang sesuai.
3. Jalankan `setupDatabase()` **sekali** (Editor → Projects → Tools → Apps Script, pilih fungsi, Run):
   - Membuat spreadsheet `CCMS-<ENV>-DB` berisi 8 sheet Tahap 1 + seed.
   - Menulis `CCMS_SPREADSHEET_ID` dan `SESSION_SECRET` ke Script Properties.
   - Membuat akun Super Admin awal (username & password dicetak di log — segera ubah).
4. Proteksi sheet (lihat log `setupDatabase`): hanya editor Apps Script yang boleh mengubah.

## 4. Environment

| Environment | Judul script | Judul spreadsheet | Drive folder |
|---|---|---|---|
| DEV | CCMS Backend (DEV) | CCMS-DEV-DB | CCMS/DEV |
| STAGING | CCMS Backend (STG) | CCMS-STAGING-DB | CCMS/STAGING |
| PROD | CCMS Backend (PROD) | CCMS-PROD-DB | CCMS/PROD |

Folder Drive dibuat saat `setupDatabase()` dijalankan; ganti nama sesuai environment sebelum eksekusi (baris `DRIVE_FOLDER_NAME` di tools/SetupDatabase.gs).

## 5. Pembaruan

1. `clasp pull` (kalau ada perubahan dari editor web).
2. Dev di editor / branch.
3. `clasp push` → `clasp deploy -m "..."` → update `GAS_URL` Worker bila URL exec berubah.
4. Rollback: deploy versi deployment sebelumnya dari halaman Deployments Apps Script (URL exec lama tetap valid selama deployment lama tidak dihapus).
