# CCMS — Tahap 1 Release & Rollback Gate (C-08)

## Release gate

- [ ] SIT seluruh test case wajib PASS dengan evidence.
- [ ] UAT dua role (SUPER_ADMIN dan PASTOR) ditandatangani.
- [ ] Tidak ada defect Critical/High terbuka.
- [ ] PBKDF2 runtime benchmark lulus pada Apps Script.
- [ ] DEV dan STAGING environment isolation terbukti.
- [ ] Database schema version dan migration dicatat.
- [ ] Backup database STAGING sebelum migrasi tersedia dan restore drill berhasil.
- [ ] Worker config tidak berisi placeholder.
- [ ] GAS deployment ID, Worker version, commit SHA, dan frontend build dicatat per environment.
- [ ] Reviewer kedua memeriksa perubahan permission, KDF, token, dan environment.
- [ ] Persetujuan pemilik gereja untuk release diperoleh.

## Rollback preparation

1. Catat Worker version dan Apps Script deployment ID sebelum rilis.
2. Buat backup database sebelum perubahan schema.
3. Pastikan deployment sebelumnya masih tersedia dan dapat dipilih kembali.
4. Untuk rollback kode, kembalikan Worker ke version sebelumnya dan Apps Script ke deployment ID sebelumnya.
5. Untuk rollback schema, gunakan prosedur restore database yang telah diuji; jangan menghapus sheet migrasi secara manual.
6. Setelah rollback, jalankan smoke test login, auth.me, auth.logout, public.info, dan seluruh halaman publik.
7. Catat waktu, alasan, dampak, operator, dan hasil verifikasi rollback.

## Go / No-Go

- GO hanya jika seluruh release gate disetujui.
- NO-GO jika ada test keamanan gagal, KDF timeout, environment silang, migration tidak konsisten, atau backup tidak dapat dipulihkan.
- Tidak ada persetujuan otomatis untuk deployment PROD dari hasil commit atau test lokal.
