# CCMS — UAT Script Sederhana Tahap 1

**Tujuan:** validasi penerimaan pengguna untuk fondasi Tahap 1 dengan dua role berbeda.  
**Environment:** STAGING/UAT saja. Jangan gunakan PROD.  
**Akun uji:** SUPER_ADMIN dan PASTOR. Gunakan data sintetis.

## A. Persiapan

- [ ] Admin menyiapkan akun SUPER_ADMIN dan PASTOR di STAGING.
- [ ] Pastikan keduanya aktif dan password sementara sudah diganti.
- [ ] Pastikan STAGING memiliki database sendiri dan sheet REVOKED_SESSIONS.
- [ ] Siapkan browser desktop dan ponsel (opsional untuk cek responsif).
- [ ] Catat nama tester, tanggal, browser, dan commit/version yang diuji.

## B. Skenario UAT

| No. | Role | Langkah | Hasil yang diharapkan | Hasil aktual |
|---|---|---|---|---|
| 1 | Pengunjung | Buka portal publik tanpa login | Beranda tampil; tidak diminta login | ____ |
| 2 | Pengunjung | Buka Profil, Jadwal Ibadah, Pengumuman, Kegiatan, Komisi/Pelayanan, Kontak | Tujuh kelompok informasi dapat dibuka | ____ |
| 3 | Pengunjung | Coba akses endpoint privat tanpa token (dibantu tester teknis) | Request ditolak 401 | ____ |
| 4 | SUPER_ADMIN | Login | Berhasil; role SUPER_ADMIN terlihat | ____ |
| 5 | SUPER_ADMIN | Buka dashboard internal dan daftar user | Diizinkan sesuai permission USER_MANAGE | ____ |
| 6 | SUPER_ADMIN | Buka konfigurasi dan menu publik | Diizinkan; secret tidak terlihat | ____ |
| 7 | SUPER_ADMIN | Logout, lalu refresh/ulang request privat | Sesi berakhir; harus login kembali | ____ |
| 8 | PASTOR | Login | Berhasil; role PASTOR terlihat | ____ |
| 9 | PASTOR | Buka audit log | Diizinkan sesuai matriks Tahap 1 | ____ |
| 10 | PASTOR | Coba daftar user / konfigurasi sistem | Ditolak 403; menu yang tidak berhak tidak dapat digunakan | ____ |
| 11 | PASTOR | Logout, lalu gunakan token lama | Token ditolak; harus login kembali | ____ |
| 12 | Keduanya | Uji tampilan di ukuran layar berbeda | Teks terbaca, navigasi dan pesan error jelas | ____ |

## C. Pencatatan defect

Untuk setiap kegagalan, catat:
- ID skenario.
- Langkah reproduksi.
- Expected vs actual.
- Screenshot/log tanpa password, token, data pribadi, atau secret.
- Severity: Critical / High / Medium / Low.

## D. Keputusan UAT

- [ ] ACCEPT — seluruh skenario wajib lulus, tidak ada defect Critical/High.
- [ ] ACCEPT WITH CONDITIONS — hanya defect Medium/Low dengan PIC dan target penyelesaian tertulis.
- [ ] REJECT — ada defect Critical/High atau fungsi inti tidak sesuai BRD.

Catatan tester: ______________________________________________

Nama & role tester 1 (SUPER_ADMIN): ____________________________

Nama & role tester 2 (PASTOR): _________________________________

Persetujuan pemilik gereja: ____________________________________

Tanggal: __________________  Versi/commit: _____________________

**Batasan:** UAT ini memvalidasi Tahap 1 saja. Modul jemaat, komisi operasional, keuangan, pengumuman dinamis, dan AI tidak dinilai sebagai fitur selesai karena berada pada tahap implementasi berikutnya.
