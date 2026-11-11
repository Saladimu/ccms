# CCMS — System Integration Test (SIT) Tahap 1

**Branch:** remediation/phase1-brd-alignment  
**Status awal:** Test plan disiapkan; hasil aktual harus diisi setelah dijalankan pada DEV/STAGING.  
**Larangan:** Jangan menjalankan test mutasi pada PROD atau memakai data jemaat nyata.

## 1. Tujuan dan prasyarat

Membuktikan C-01 sampai C-08 melalui pengujian backend, gateway, sesi, permission, public portal, dan isolasi environment. SIT harus dijalankan pada DEV terlebih dahulu, lalu diulang pada STAGING setelah konfigurasi environment diverifikasi.

Prasyarat:
- [ ] DEV Apps Script dan Spreadsheet terpisah dari STAGING/PROD.
- [ ] CCMS_ENV=DEV, CCMS_SPREADSHEET_ID menunjuk database DEV, dan SESSION_SECRET unik.
- [ ] Sheet REVOKED_SESSIONS tersedia.
- [ ] Akun uji: satu SUPER_ADMIN dan satu PASTOR; seluruh data sintetis.
- [ ] URL Worker DEV memakai GAS DEV, bukan GAS PROD.
- [ ] Backup DEV tersedia sebelum test migrasi atau setup.

## 2. SIT test cases

| ID | Area | Skenario | Expected result | Status |
|---|---|---|---|---|
| SIT-01 | C-01 | Tanpa token memanggil users.list | 401; handler tidak berjalan | NOT RUN |
| SIT-02 | C-01 | PASTOR memanggil users.list | 403 FORBIDDEN | NOT RUN |
| SIT-03 | C-01 | PASTOR memanggil audit.list | Diizinkan sesuai matriks Tahap 1 | NOT RUN |
| SIT-04 | C-01 | SECRETARY/STAFF mencoba users.list | 403; tidak ada default grant | NOT RUN |
| SIT-05 | C-01 | Permission katalog is_active=FALSE | Permission tidak diberikan | NOT RUN |
| SIT-06 | C-01 | Permission stage 2/3 pada role yang berhak | Belum diberikan pada Tahap 1 | NOT RUN |
| SIT-07 | C-02 | Hash password baru | Format pbkdf2-sha256; cocok dengan PBKDF2-HMAC-SHA256 | NOT RUN |
| SIT-08 | C-02 | Login memakai hash legacy sha256 yang valid | Login berhasil; hash di-upgrade ke PBKDF2 | NOT RUN |
| SIT-09 | C-02 | Password salah / hash malformed / iterasi di luar batas | Ditolak; tidak terjadi loop tak terbatas | NOT RUN |
| SIT-10 | C-03 | Secret kosong | Request privat gagal tertutup | NOT RUN |
| SIT-11 | C-03 | Token signature salah / format malformed | 401; tidak ada exception bocor | NOT RUN |
| SIT-12 | C-03 | Header alg=none atau algoritma selain HS256 | 401 | NOT RUN |
| SIT-13 | C-03 | Token expired / iat di masa depan / claim wajib hilang | 401 | NOT RUN |
| SIT-14 | C-03 | User dinonaktifkan setelah token diterbitkan | Request berikutnya 401 | NOT RUN |
| SIT-15 | C-03 | Role dinonaktifkan/dicabut setelah token diterbitkan | Request berikutnya kehilangan akses; tanpa role aktif ditolak | NOT RUN |
| SIT-16 | C-04 | Logout lalu gunakan token yang sama | Logout sukses; token berikutnya 401 | NOT RUN |
| SIT-17 | C-04 | Logout dua kali / replay logout | Tidak membuat revocation ganda; tetap aman | NOT RUN |
| SIT-18 | C-04 | Cleanup ledger dengan expiry lampau | Baris expired dibersihkan; baris aktif/invalid dipertahankan | NOT RUN |
| SIT-19 | C-05 | Akses tujuh menu tanpa login | home, profile, schedule, announcements, events, ministries, contact terbuka | NOT RUN |
| SIT-20 | C-05 | Menu OFF_HIDDEN | 404 dan konten tidak bocor | NOT RUN |
| SIT-21 | C-05 | Menu OFF_MAINTENANCE | Pesan maintenance; tidak menampilkan konten privat | NOT RUN |
| SIT-22 | C-05 | Konten API berisi HTML/script | Ditampilkan sebagai teks, tidak dieksekusi | NOT RUN |
| SIT-23 | C-06 | Worker env belum dikonfigurasi | CONFIG_ERROR; tidak forward ke GAS | NOT RUN |
| SIT-24 | C-06 | DEV/STAGING/PROD menunjuk URL GAS berbeda | Checklist bukti tiga endpoint dan spreadsheet berbeda | NOT RUN |
| SIT-25 | C-06 | Origin DEV mengakses Worker STAGING/PROD | Tidak mendapat CORS allow origin | NOT RUN |
| SIT-26 | C-07 | Jalankan automated test harness | Seluruh test automated lulus | NOT RUN |
| SIT-27 | C-08 | Review release checklist dan rollback evidence | Semua gate lulus atau blocker ditandai | NOT RUN |

## 3. Perintah automated test

Jalankan dari root repository:

```bash
node --test backend/tests/sit/*.test.cjs
```

Jika proyek belum memiliki Node test runtime di mesin penguji, jalankan pada Node.js LTS dan catat versi node --version. Test harness lokal tidak menggantikan SIT integrasi Apps Script/Worker.

## 4. Evidence yang harus disimpan

- Commit SHA dan versi source yang diuji.
- Environment name, Worker name, GAS deployment identifier (jangan lampirkan secret).
- Timestamp, tester, test case ID, expected, actual, PASS/FAIL, dan screenshot/log yang sudah disamarkan.
- Bukti role-permission untuk minimal SUPER_ADMIN dan PASTOR.
- Bukti migration REVOKED_SESSIONS dan cleanup pada DEV/STAGING.
- Bukti konfigurasi environment silang tanpa menampilkan token, secret, atau spreadsheet ID sensitif.

## 5. Exit criteria SIT

- [ ] Semua C-01/C-03/C-04/C-07 test security lulus.
- [ ] PBKDF2 dan rehash legacy lulus; waktu hash/verify diukur dan diterima pada Apps Script.
- [ ] Semua tujuh halaman publik dan status menu lulus.
- [ ] Isolasi DEV/STAGING terbukti; PROD tidak disentuh.
- [ ] Tidak ada defect Critical/High terbuka.
- [ ] SIT report ditandatangani reviewer teknis.

**Catatan:** Perubahan PBKDF2 menggunakan baseline 120.000 iterasi. Ini belum boleh dianggap final untuk produksi sampai runtime Apps Script diukur pada DEV/STAGING, termasuk waktu login, create user, dan reset password. Bila waktu eksekusi tidak layak, hentikan rilis dan evaluasi strategi KDF/arsitektur—jangan menurunkan iterasi tanpa keputusan keamanan.


## 6. Hasil automated CI — 11 November 2026

**PASS** **GitHub Actions — CCMS Phase 1 SIT**  
Run: 8  
Commit diuji: `d668b9818a8a3b7897eec48ef5d21347c8eaa5c8`  
Hasil: **11/11 automated tests passed, 0 failed**.

Rincian:
- Backend/Auth: 8 test lulus — PBKDF2 test oracle, verifikasi hash legacy, matriks role/stage gate, JWT malformed/expired/alg/signature, inactive user, secret kosong, logout revocation, direct API allow/deny dan no-token.
- Worker: 3 test lulus — placeholder environment ditolak tanpa upstream call, malformed JSON/method ditolak, CORS menolak origin yang tidak di-allowlist.

Batas cakupan:
- Test PBKDF2 memakai 10.000 iterasi untuk fixture uji dan mencocokkan hasil terhadap Node PBKDF2-HMAC-SHA256. **Ini bukan benchmark runtime Apps Script pada 120.000 iterasi.**
- Belum menguji langsung Apps Script, Google Sheets, Cloudflare deployment, migration/cleanup pada spreadsheet, tujuh halaman publik live, menu hidden/maintenance, atau isolasi DEV/STAGING/PROD aktual.
- UAT dua role belum dijalankan.

Karena itu, status automated suite adalah PASS, sedangkan **SIT integrasi DEV/STAGING dan C-08 release gate masih OPEN**. Jangan menafsirkan hasil CI ini sebagai izin deploy production.
