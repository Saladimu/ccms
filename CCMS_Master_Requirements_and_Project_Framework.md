# CCMS -- Church Community Management System

## Dokumen Induk Kebutuhan, Desain, Arsitektur, dan Rencana Implementasi

**Versi:** 1.0 -- Konsolidasi Perencanaan\
**Tanggal:** 9 November 2026\
**Status:** Dokumen kerja konsolidasi; bukan pernyataan bahwa seluruh
detail teknis telah selesai disusun.

------------------------------------------------------------------------

## Informasi Dokumen

  -----------------------------------------------------------------------
  Item                                Keterangan
  ----------------------------------- -----------------------------------
  Nama sistem                         Church Community Management System
                                      (CCMS)

  Cakupan                             Satu gereja, configurable, bukan
                                      multi-tenant pada tahap awal

  Bahasa utama                        Bahasa Indonesia

  Pemilik layanan Google              Satu akun Gmail khusus gereja

  Frontend hosting                    Cloudflare Pages

  API Gateway                         Cloudflare Worker

  Backend                             Google Apps Script

  Database awal                       Google Sheets

  Penyimpanan file                    Google Drive

  AI Assistant                        Gemini API, dapat ON/OFF

  Tahap proyek                        Perencanaan Phase 1--5 selesai
                                      sebagai baseline; Phase 6--7 berupa
                                      framework/draft
  -----------------------------------------------------------------------

## Riwayat dan Status Keputusan

Dokumen ini menggabungkan keputusan dari diskusi perencanaan. Status
dibedakan sebagai berikut:

-   **Disepakati:** keputusan yang telah dinyatakan atau dikonfirmasi.
-   **Rancangan/rekomendasi:** usulan desain yang menjadi dasar kerja,
    tetapi detail implementasinya masih perlu disusun.
-   **Belum dirinci:** memerlukan spesifikasi lebih lanjut sebelum
    coding atau deployment.

Perlu dicatat bahwa BRD v0.2 sebelumnya telah dikonfirmasi sebagai
baseline. Dokumen ini mengonsolidasikan perubahan dan tambahan yang
dibahas setelahnya. Karena itu, dokumen ini merupakan konsolidasi
perencanaan, bukan klaim bahwa revisi BRD formal v1.0 telah melalui
penandatanganan terpisah.

------------------------------------------------------------------------

# PHASE 1 -- BUSINESS REQUIREMENTS (BRD)

## 1.1 Tujuan Sistem

CCMS dibangun untuk membantu gereja mengelola informasi jemaat,
keluarga, komisi, pelayanan, kegiatan, pengumuman, administrasi, dan
keuangan secara terpusat.

Sistem menyediakan dua pengalaman utama:

1.  **Public Portal:** informasi umum gereja yang dapat diakses jemaat
    dan pengunjung tanpa login.
2.  **Internal CCMS:** aplikasi untuk pengurus dan petugas yang
    membutuhkan autentikasi serta hak akses sesuai tugasnya.

## 1.2 Prinsip dan Ruang Lingkup

-   Sistem pada tahap awal digunakan oleh satu gereja.
-   Identitas gereja, struktur organisasi, komisi, kategori, iuran,
    role, permission, dan menu publik perlu dapat dikonfigurasi tanpa
    mengubah kode.
-   Sistem tidak dirancang sebagai multi-tenant pada tahap awal.
-   Data jemaat dipisahkan dari akun login pengguna internal.
-   Tidak semua jemaat harus mempunyai User ID.
-   Pengunjung publik tidak memerlukan login untuk melihat informasi
    publik.
-   Data privat hanya dapat diakses melalui backend yang melakukan
    autentikasi dan pemeriksaan otorisasi.

## 1.3 Jenis Pengguna

  -----------------------------------------------------------------------
  Pengguna                            Kebutuhan utama
  ----------------------------------- -----------------------------------
  Pengunjung publik                   Melihat informasi umum gereja

  Jemaat                              Melihat jadwal, pengumuman, dan
                                      kegiatan publik

  Super Admin                         Mengelola konfigurasi, akun, role,
                                      permission, dan fitur

  Pendeta/Majelis                     Melihat ringkasan dan melakukan
                                      persetujuan sesuai kewenangan

  Sekretaris/Admin                    Mengelola data jemaat, pengumuman,
                                      surat, dan administrasi

  Bendahara Pusat                     Mengelola seluruh kas dan transaksi

  Pengurus Komisi                     Mengelola informasi dan melihat
                                      laporan komisinya sesuai izin

  Petugas pelayanan                   Melihat jadwal dan tugas pelayanan
                                      sesuai izin
  -----------------------------------------------------------------------

## 1.4 Public Portal

Portal publik dapat memuat menu berikut:

-   Beranda
-   Profil gereja
-   Jadwal ibadah
-   Pengumuman publik
-   Kegiatan dan kalender
-   Informasi komisi/pelayanan
-   Kontak gereja

Menu publik dan submenu dapat diaktifkan atau dinonaktifkan dari backend
tanpa redeployment.

Status menu yang direncanakan:

-   **ON:** menu dapat dilihat dan diakses.
-   **OFF -- Hidden:** menu disembunyikan dari navigasi publik.
-   **OFF -- Maintenance:** halaman menampilkan pesan pemeliharaan yang
    dapat dikonfigurasi.

Pengamanan harus diterapkan pada endpoint/backend juga. Menyembunyikan
menu saja tidak cukup untuk melindungi data.

Public Portal tidak menampilkan akses login internal. Akses internal
sebaiknya menggunakan URL/subdomain terpisah dan tidak ditautkan pada
navigasi publik.

## 1.5 Internal CCMS

-   Login hanya untuk pengurus/petugas yang membutuhkan akses.
-   Akun dibuat dan dikelola oleh Super Admin.
-   Setiap pengguna memiliki role dan permission.
-   Dashboard dan menu disesuaikan dengan hak akses.
-   Hak akses harus diperiksa pada backend, bukan hanya dengan
    menyembunyikan tombol atau halaman di frontend.

## 1.6 Pengelolaan Data Jemaat

### Data dan keluarga

-   Setiap orang memiliki record jemaat individual.
-   Relasi keluarga bersifat opsional.
-   Seseorang dapat tercatat tanpa harus menjadi anggota suatu keluarga.
-   Data keluarga dikelola terpisah dan dapat dihubungkan ke beberapa
    record jemaat.
-   Data jemaat tidak dihapus permanen melalui aplikasi.
-   Riwayat keuangan dan aktivitas harus tetap terhubung ketika jemaat
    diarsipkan.

### Status jemaat dan archive

Dua atribut ini berdiri sendiri:

  Field             Nilai                   Makna
  ----------------- ----------------------- --------------------
  `member_status`   `Active` / `Inactive`   Status keanggotaan
  `is_archived`     `TRUE` / `FALSE`        Penanda arsip

Aturan laporan:

  Status       Archive Masuk laporan normal?
  ---------- --------- -----------------------
  Active         FALSE Ya
  Inactive       FALSE Ya
  Active          TRUE Tidak
  Inactive        TRUE Tidak

-   Record dengan `is_archived=TRUE` tetap disimpan dan dapat dilihat
    melalui filter arsip.
-   Restore mengubah `is_archived` menjadi `FALSE`, tetapi
    mempertahankan `member_status` sebelumnya.
-   Metadata arsip: `archived_at`, `archived_by`, `archive_reason`.
-   Tidak ada penghapusan permanen data jemaat melalui aplikasi.

### NIK

-   NIK **tidak mandatory**; data jemaat dapat disimpan tanpa NIK.
-   Jika NIK diisi, sistem melakukan pemeriksaan duplikasi.
-   Jika NIK sudah ada, sistem menampilkan alert/warning dan identitas
    record yang cocok sejauh pengguna berhak melihatnya.
-   Warning bukan pemblokiran; petugas tetap dapat melanjutkan setelah
    konfirmasi.
-   NIK kosong tidak memicu warning duplikasi.
-   Pemeriksaan berlaku untuk pendaftaran baru, perubahan data, dan
    impor data.
-   NIK diperlakukan sebagai data pribadi dan bukan sebagai User ID.

### Pendaftaran dan migrasi awal

-   Pendaftaran jemaat baru dapat dilakukan melalui formulir.
-   Sekretaris/Admin memverifikasi pendaftaran sebelum data menjadi data
    jemaat resmi.
-   Form pendaftaran publik tidak otomatis membuat akun login.
-   Migrasi awal data jemaat lama dilakukan satu kali sebelum go-live.
-   Proses impor menggunakan template Excel/CSV, preview, validasi,
    pemeriksaan duplikasi, mapping keluarga, konfirmasi commit,
    verifikasi jumlah/sample, serta catatan batch dan error.
-   Tidak dilakukan pembuatan akun massal untuk jemaat.

## 1.7 Komisi dan Pelayanan

-   Sistem mendukung pengelolaan komisi.
-   Jemaat dapat tergabung dalam satu atau beberapa komisi.
-   Data pengurus komisi dan jadwal pelayanan dikelola sesuai
    permission.
-   Pengurus komisi dapat melihat laporan yang relevan dengan komisinya.
-   Pengurus komisi tidak mengelola kas secara independen dalam sistem.

## 1.8 Keuangan

### Model pengelolaan

-   Pengelolaan kas dan seluruh transaksi dipusatkan pada Bendahara
    Pusat.
-   Terdapat kas pusat dan pencatatan dana/kas per komisi.
-   Bendahara Pusat mengendalikan pencatatan seluruh transaksi, termasuk
    transaksi yang terkait komisi.
-   Laporan dapat dipisahkan berdasarkan komisi, tetapi kewenangan
    pencatatan dan pengelolaan tetap terpusat.

### Pembayaran dan kuitansi

-   Metode pembayaran: tunai dan transfer bank.
-   Pembayaran tunai dicatat/dikonfirmasi oleh bendahara.
-   Transfer harus diverifikasi sebelum dinyatakan lunas.
-   Setiap pembayaran yang telah dikonfirmasi menghasilkan kuitansi
    digital.
-   Pengiriman kuitansi bersifat opsional.
-   Kuitansi dapat diunduh, dicetak, atau dibagikan manual melalui
    WhatsApp.
-   Tombol WhatsApp dapat membuka pesan yang telah disiapkan; tidak
    menggunakan WhatsApp Business API berbayar.
-   File PDF kuitansi disimpan di Google Drive dan referensinya dicatat
    di Google Sheets.
-   Penerima kuitansi tidak perlu memiliki akun/login CCMS.
-   Informasi pembayaran pribadi tidak ditampilkan di portal publik.

## 1.9 Pengumuman dan Kegiatan

### Approval pengumuman

Persetujuan bergantung pada kategori dan konfigurasi aturan:

-   Informasi umum dapat diterbitkan oleh petugas yang berwenang.
-   Pengumuman resmi gereja dapat memerlukan persetujuan
    Pendeta/Majelis.
-   Pengumuman komisi dapat diterbitkan pengurus komisi sesuai
    permission.
-   Informasi sensitif dapat memerlukan persetujuan khusus.

Tidak semua kategori harus melalui alur approval yang sama.

### Status konten

Siklus yang direkomendasikan:

`Draft → Published → Hidden → Published kembali atau Deleted`

-   Hidden berarti konten tidak tampil di portal publik tetapi tetap
    tersimpan.
-   Penghapusan sebaiknya soft delete agar dapat dipulihkan dan memiliki
    jejak audit.
-   Hanya konten yang berstatus Published dan memenuhi aturan publikasi
    yang ditampilkan kepada publik.

## 1.10 Gemini AI Assistant

Fungsi yang direncanakan:

-   Membuat draft pengumuman dari poin-poin.
-   Memperbaiki dan menyusun ulang kalimat.
-   Membuat judul dan versi singkat untuk WhatsApp.
-   Menghasilkan variasi nada formal, ramah, atau pastoral.
-   Membantu deskripsi kegiatan, tujuan, informasi peserta, persyaratan,
    checklist, dan undangan.
-   Terjemahan dapat dipertimbangkan sesuai kebutuhan.

Ketentuan:

-   Hasil AI selalu berupa draft.
-   Manusia wajib meninjau dan menyetujui sebelum publikasi.
-   AI tidak boleh memublikasikan konten atau mengubah data secara
    otonom.
-   Hindari mengirim data pastoral, pribadi, atau keuangan sensitif ke
    model.
-   API Key hanya disimpan di sisi server.

### Pengaturan ON/OFF

-   Super Admin dapat mengaktifkan atau menonaktifkan AI Assistant
    secara global.
-   Jika OFF, menu/tombol AI disembunyikan dan backend menolak request
    AI.
-   Saat OFF, Gemini API tidak dipanggil.
-   Data/riwayat sebelumnya tidak otomatis dihapus.
-   Jika ON kembali, fitur dapat digunakan sesuai permission pengguna.
-   Permission AI dapat dibatasi berdasarkan role meskipun fitur global
    ON.

## 1.11 Keamanan Login

-   Tiga kali kegagalan login berturut-turut menyebabkan login diblokir
    selama lima menit.
-   Ketentuan ini harus ditegakkan di backend.
-   Jangan menambahkan kebijakan lockout lain di luar keputusan awal
    tanpa persetujuan.
-   Password tidak boleh disimpan dalam plaintext; gunakan hashing
    password yang sesuai.
-   Sesi harus memiliki masa berlaku dan dapat diakhiri melalui logout.
-   Aktivitas penting dicatat di audit log.

------------------------------------------------------------------------

# PHASE 2 -- USER JOURNEY & WORKFLOW DESIGN

Phase 2 dinyatakan selesai pada tingkat ringkasan alur dan kebutuhan.
Detail diagram dan matriks final dapat diperdalam dalam spesifikasi
implementasi.

## 2.1 User Journey utama

### Pengunjung/Jemaat -- Public Portal

1.  Membuka URL portal publik.
2.  Melihat beranda dan informasi umum.
3.  Membuka jadwal ibadah, pengumuman, kegiatan, profil, atau kontak.
4.  Tidak diminta login untuk informasi publik.

### Pendaftaran jemaat

1.  Calon jemaat mengisi formulir pendaftaran.
2.  Sistem menerima data sebagai pendaftaran, bukan langsung sebagai
    data resmi.
3.  Sekretaris/Admin memeriksa data.
4.  Sistem melakukan pemeriksaan duplikasi NIK jika NIK diisi.
5.  Jika ada kecocokan NIK, tampil warning; petugas dapat melanjutkan
    setelah konfirmasi.
6.  Petugas menyetujui atau menolak pendaftaran.
7.  Jika disetujui, data dibuat/diintegrasikan ke data jemaat resmi.

### Pengurus -- Internal CCMS

1.  Pengurus membuka URL internal.
2.  Login dengan akun CCMS masing-masing.
3.  Backend memverifikasi identitas dan status sesi.
4.  Backend memeriksa role dan permission.
5.  Dashboard dan menu ditampilkan sesuai hak akses.
6.  Aktivitas penting dicatat.

### Keuangan

1.  Petugas berwenang memasukkan transaksi/pembayaran.
2.  Bendahara Pusat memverifikasi pembayaran sesuai metode.
3.  Transaksi yang dikonfirmasi dicatat pada kas yang sesuai.
4.  Sistem menghasilkan kuitansi PDF.
5.  Kuitansi disimpan di Drive dan referensinya dicatat di Sheets.
6.  Bendahara dapat mengunduh, mencetak, atau membagikan kuitansi secara
    manual melalui WhatsApp.

### Pengumuman

1.  Pengguna berwenang membuat draft.
2.  Sistem memeriksa kategori dan aturan approval.
3.  Jika perlu, draft dikirim ke approver.
4.  Setelah disetujui, konten dapat dipublikasikan.
5.  Konten dapat disembunyikan tanpa menghapus record.

### Pengelolaan menu publik

1.  Super Admin membuka konfigurasi menu.
2.  Memilih ON, OFF-Hidden, atau OFF-Maintenance.
3.  Sistem menerapkan perubahan tanpa redeployment.
4.  Backend tetap memeriksa status dan izin akses endpoint terkait.

## 2.2 Output Phase 2

-   User Role & Permission Matrix.
-   Workflow Diagram.
-   Use Case Summary.

Matriks role-permission terperinci dan diagram teknis tetap menjadi
artefak yang perlu difinalisasi saat spesifikasi API dan implementasi.

------------------------------------------------------------------------

# PHASE 3 -- DATABASE DESIGN

## 3.1 Prinsip database

-   Google Sheets menjadi database awal.
-   Setiap tabel direpresentasikan sebagai sheet.
-   Setiap record memiliki ID unik yang stabil.
-   Relasi menggunakan ID, bukan nama sebagai kunci.
-   Validasi dan otorisasi dilakukan di backend.
-   Hindari akses langsung dari browser ke Sheets.
-   Gunakan mekanisme penguncian untuk operasi yang rawan konflik.
-   Sediakan backup dan riwayat perubahan.
-   Struktur data dibuat agar memungkinkan migrasi ke database lebih
    kuat di masa depan.

## 3.2 Rancangan daftar sheet

Daftar berikut merupakan rancangan awal yang telah dibahas; nama/kolom
final perlu ditetapkan dalam data dictionary.

### A. System & Configuration

1.  `CONFIG`
2.  `PUBLIC_MENU`
3.  `USERS`
4.  `ROLES`
5.  `PERMISSIONS`
6.  `USER_ROLES`

### B. Member & Organization

7.  `JEMAAT`
8.  `KELUARGA`
9.  `KOMISI`
10. `JEMAAT_KOMISI`
11. `PENGURUS`
12. `PENDAFTARAN_JEMAAT`

### C. Finance

13. `KAS`
14. `KATEGORI_TRANSAKSI`
15. `IURAN`
16. `PEMBAYARAN`
17. `TRANSAKSI`
18. `ANGGARAN`
19. `BUKTI_PEMBAYARAN`

### D. Announcement & Event

20. `KATEGORI_PENGUMUMAN`
21. `PENGUMUMAN`
22. `APPROVAL_LOG`
23. `KEGIATAN`
24. `PENDAFTARAN_EVENT`
25. `DOKUMENTASI`

### E. Administration & Services

26. `PERMOHONAN`
27. `JADWAL_PELAYANAN`
28. `SURAT`
29. `DOKUMEN`

### F. Monitoring

30. `AUDIT_LOG`
31. `LOGIN_ATTEMPTS`
32. `MIGRATION_BATCH`
33. `MIGRATION_ERRORS`
34. `AI_USAGE_LOG`

Jumlah rancangan awal: **34 sheet**. Daftar ini perlu ditinjau kembali
pada tahap data dictionary untuk menghindari tabel yang tidak diperlukan
dan memastikan seluruh kebutuhan tercakup.

## 3.3 Relasi data utama

-   `KELUARGA` 1:N `JEMAAT`; `family_id` pada jemaat boleh kosong.
-   `JEMAAT` M:N `KOMISI` melalui `JEMAAT_KOMISI`.
-   `USERS` M:N `ROLES` melalui `USER_ROLES`.
-   `KAS` 1:N `TRANSAKSI`.
-   `JEMAAT` dapat terkait dengan pembayaran dan riwayat transaksi.
-   `KATEGORI_PENGUMUMAN` 1:N `PENGUMUMAN`.
-   `PENGUMUMAN` memiliki catatan approval pada `APPROVAL_LOG`.
-   `KEGIATAN` dapat memiliki pendaftaran dan dokumentasi.
-   `TRANSAKSI` terhubung dengan bukti/kuitansi pada `BUKTI_PEMBAYARAN`.

## 3.4 Kolom penting pada JEMAAT

Kolom inti yang sudah ditetapkan:

  Field              Aturan
  ------------------ -------------------------------------------
  `member_id`        ID unik jemaat
  `family_id`        Nullable
  `full_name`        Nama lengkap
  `nik`              Opsional
  `nik_normalized`   Untuk pencocokan duplikasi jika NIK diisi
  `member_status`    Active / Inactive
  `is_archived`      TRUE / FALSE
  `archived_at`      Nullable
  `archived_by`      Nullable
  `archive_reason`   Nullable

Kolom lain seperti jenis kelamin, tanggal lahir, alamat, telepon, email,
dan tanggal bergabung perlu ditinjau berdasarkan kebutuhan operasional
dan prinsip minimisasi data.

## 3.5 Pengendalian data dan transaksi

-   Gunakan ID unik yang tidak bergantung pada nomor baris.
-   Jangan menghapus record jemaat secara permanen.
-   Hindari cascade delete pada data historis.
-   Catat siapa, kapan, dan perubahan apa yang dilakukan untuk aktivitas
    penting.
-   Gunakan LockService atau mekanisme setara untuk mencegah konflik
    penulisan.
-   Operasi keuangan harus memiliki validasi, referensi transaksi, dan
    kontrol duplikasi.
-   Rancangan harus memperhitungkan kuota Apps Script dan Google Sheets.

------------------------------------------------------------------------

# PHASE 4 -- UI/UX DESIGN

## 4.1 Prinsip desain

Sistem memiliki satu design system dengan dua pengalaman antarmuka:

1.  Public Portal: mobile-first, sederhana, hangat, dan mudah digunakan.
2.  Internal CCMS: profesional, informatif, dan berorientasi
    produktivitas.

Keduanya berbagi standar identitas visual, tipografi, ikon, komponen,
dan pola interaksi, tetapi dapat memiliki pilihan tema yang berbeda.

## 4.2 Public Portal

-   Prioritas desain smartphone.
-   Navigasi sederhana dan mudah dipahami.
-   Informasi penting mudah ditemukan.
-   Tombol nyaman untuk layar sentuh.
-   Jadwal ibadah, pengumuman, dan kegiatan menjadi informasi utama.
-   Tidak memerlukan login untuk informasi publik.
-   Layout responsif untuk tablet dan desktop.

Navigasi yang direncanakan:

-   Beranda
-   Jadwal
-   Pengumuman
-   Kegiatan
-   Profil
-   Kontak

Menu dapat disesuaikan dari backend.

## 4.3 Internal CCMS

-   Dashboard profesional.
-   Sidebar pada desktop dan navigasi yang disesuaikan pada mobile.
-   Dashboard berdasarkan role.
-   Tabel memiliki pencarian dan filter.
-   Form memiliki validasi dan pesan kesalahan yang jelas.
-   Konfirmasi untuk tindakan penting.
-   Ringkasan angka dan grafik untuk informasi yang relevan.

Dashboard berdasarkan peran:

  Peran               Fokus
  ------------------- --------------------------------------
  Super Admin         Statistik, pengguna, konfigurasi
  Pendeta/Majelis     Ringkasan jemaat, kegiatan, approval
  Sekretaris/Admin    Jemaat, surat, pengumuman
  Bendahara Pusat     Kas, transaksi, iuran, laporan
  Pengurus Komisi     Data dan laporan komisi
  Petugas Pelayanan   Jadwal dan tugas pelayanan

## 4.4 Palet warna dan theme configuration

Tiga tema warna yang direncanakan:

  -----------------------------------------------------------------------
  Tema                    Warna utama             Karakter
  ----------------------- ----------------------- -----------------------
  Church Classic          Deep Green, Gold, Warm  Elegan, tenang,
                          Ivory, Charcoal         terpercaya

  Modern Blue             Navy, Blue, Light       Profesional, modern,
                          Background, Charcoal    bersih

  Warm & Friendly         Brown, Terracotta,      Hangat dan bersahabat
                          Cream, Dark Brown       
  -----------------------------------------------------------------------

Warna harus dikelola menggunakan CSS Variables/Design Tokens, bukan
ditulis terpisah pada setiap halaman.

### Pilihan tema publik dan internal

-   Public Portal dan Internal CCMS sama-sama mendukung pilihan tema.
-   Pemilihan tema publik dan internal dapat dilakukan secara
    independen.
-   Tersedia pilihan Light Mode dan Dark Mode sebagai pengaturan
    terpisah.
-   Tema dapat diganti oleh Super Admin tanpa mengubah kode atau
    redeployment.
-   Struktur memungkinkan penambahan tema baru.

## 4.5 Standar UX dan aksesibilitas

-   Responsive untuk smartphone, tablet, dan desktop.
-   Loading indicator untuk proses yang berjalan.
-   Pesan sukses/error yang jelas.
-   Konfirmasi sebelum tindakan penting.
-   Ukuran teks dan kontras warna yang nyaman.
-   Form panjang dibagi menjadi beberapa bagian bila diperlukan.
-   Navigasi dan komponen konsisten.
-   Tampilan harus tetap usable pada koneksi mobile yang tidak selalu
    stabil.

------------------------------------------------------------------------

# PHASE 5 -- TECHNICAL ARCHITECTURE & SPECIFICATION

## 5.1 Keputusan arsitektur

  -----------------------------------------------------------------------
  Komponen                Teknologi               Fungsi
  ----------------------- ----------------------- -----------------------
  Public frontend         HTML, CSS, JavaScript   Portal publik

  Internal frontend       HTML, CSS, JavaScript   Aplikasi pengurus

  Hosting                 Cloudflare Pages        Hosting frontend

  API Gateway             Cloudflare Worker       Perantara request dan
                                                  routing API

  Backend                 Google Apps Script      Autentikasi, otorisasi,
                                                  business logic

  Database                Google Sheets           Data CCMS

  File storage            Google Drive            PDF, foto, dokumen

  AI                      Gemini API              Bantuan penulisan

  System owner            Gmail khusus gereja     Pemilik layanan Google
  -----------------------------------------------------------------------

## 5.2 Akun Google khusus gereja

-   Gereja membuat satu akun Gmail khusus untuk kepemilikan dan
    operasional sistem.
-   Akun tersebut menjadi pemilik/pengelola Google Sheets, Apps Script,
    Drive, dan konfigurasi akses Gemini.
-   Akun bukan akun pribadi pengurus.
-   Pengurus menggunakan akun CCMS masing-masing; mereka tidak perlu
    mengetahui password Gmail pemilik sistem.
-   Aktifkan 2-Step Verification.
-   Siapkan recovery email dan nomor yang dikelola gereja.
-   Dokumentasikan prosedur pergantian pengurus dan pemulihan akses.
-   Pertimbangkan tata kelola kepemilikan dan akses bersama agar sistem
    tidak bergantung pada satu individu.

## 5.3 Arsitektur komunikasi

Alur yang disepakati:

`Browser → Cloudflare Pages → Cloudflare Worker → Google Apps Script → Google Sheets / Google Drive / Gemini API`

Cloudflare Worker menjadi API Gateway untuk routing request,
pengendalian CORS, dan perantara komunikasi ke Apps Script.

Detail implementasi Worker dan Apps Script harus dirancang agar tidak
menganggap Worker saja sudah menjamin keamanan. Autentikasi, otorisasi,
validasi input, dan pemeriksaan permission tetap dilakukan di backend.

## 5.4 Identitas dan autentikasi

Dua jenis identitas dibedakan:

1.  Google Account Gereja: pemilik layanan dan backend.
2.  CCMS User Account: akun pengurus/petugas untuk login ke aplikasi
    internal.

Persyaratan:

-   Akun CCMS dibuat/dikelola Super Admin.
-   Role dan permission diterapkan pada setiap operasi.
-   Password disimpan sebagai hash dengan salt menggunakan metode yang
    sesuai.
-   Sesi memiliki masa berlaku.
-   Logout mengakhiri sesi.
-   Login diblokir selama lima menit setelah tiga kegagalan
    berturut-turut.
-   Login dan aktivitas penting dicatat.
-   Public Portal tidak membutuhkan login.

Detail algoritme sesi, penyimpanan token, CSRF, proteksi replay, dan
pengamanan endpoint harus disusun pada spesifikasi keamanan rinci
sebelum implementasi.

## 5.5 Integrasi Gemini

-   Gemini API dipanggil dari backend, bukan langsung dari browser.
-   API Key disimpan di Script Properties atau secret storage yang
    sesuai.
-   AI menghasilkan draft, bukan memublikasikan konten otomatis.
-   Backend memeriksa status global AI dan permission pengguna sebelum
    memanggil Gemini.
-   Jika AI OFF, request ditolak dan Gemini tidak dipanggil.
-   Catat penggunaan AI secukupnya untuk monitoring dan pengendalian
    biaya.
-   Jangan mengirim informasi sensitif tanpa dasar dan persetujuan yang
    sesuai.

## 5.6 Feature Management

Sistem dirancang memiliki pengaturan ON/OFF untuk fitur yang sesuai.

Contoh awal:

-   Gemini AI Assistant.
-   Menu publik.
-   Modul tertentu yang memang dapat dinonaktifkan secara aman.

Untuk AI:

-   `AI_ASSISTANT_ENABLED` = TRUE/FALSE.
-   `AI_PROVIDER` = GEMINI.
-   `AI_MODEL` = configurable.
-   `AI_DAILY_LIMIT` = configurable.

Pengaturan fitur harus ditegakkan di backend, bukan hanya menyembunyikan
elemen UI.

## 5.7 Keterbatasan dan mitigasi platform

Google Sheets dan Apps Script cocok sebagai pendekatan awal untuk
organisasi dengan kebutuhan dan volume terbatas, tetapi memiliki kuota,
batas waktu eksekusi, dan batas konkurensi.

Mitigasi yang direncanakan:

-   Membaca/menulis data secara batch.
-   Menghindari operasi Sheets berulang yang tidak perlu.
-   Menggunakan LockService untuk operasi bersamaan.
-   Memproses pekerjaan berat secara bertahap.
-   Menangani error dan retry secara terkontrol.
-   Memonitor kuota dan performa.
-   Menyediakan backup yang dapat dipulihkan.
-   Mempertahankan jalur migrasi ke database yang lebih kuat.

Angka kuota harus diverifikasi kembali dari dokumentasi Google resmi
ketika implementasi dimulai karena dapat berubah.

## 5.8 Repository dan deployment source

Struktur repository awal yang direkomendasikan:

``` text
ccms/
├── docs/
│   ├── requirements/
│   ├── architecture/
│   ├── database/
│   ├── api/
│   └── user-guide/
├── frontend/
│   ├── public/
│   ├── internal/
│   └── shared/
├── worker/
│   ├── src/
│   └── tests/
├── backend/
│   ├── apps-script/
│   ├── modules/
│   └── tests/
├── database/
│   └── sheet-schema/
└── deployment/
    ├── cloudflare/
    └── google/
```

Struktur ini merupakan draft. Sinkronisasi/deployment Apps Script dapat
menggunakan Google clasp atau mekanisme lain yang dipilih saat
spesifikasi teknis final.

------------------------------------------------------------------------

# PHASE 6 -- DEVELOPMENT & IMPLEMENTATION FRAMEWORK

**Status:** Draft framework; belum merupakan pekerjaan coding yang
dimulai.

## 6.1 Tujuan

Membangun sistem secara bertahap berdasarkan kebutuhan Phase 1--5.
Setiap modul harus dikembangkan, diuji, didokumentasikan, dan disetujui
sebelum dianggap selesai.

## 6.2 Work Packages

  -----------------------------------------------------------------------
  ID                      Work Package            Ruang lingkup
  ----------------------- ----------------------- -----------------------
  WP-01                   Project Foundation      Repository, struktur
                                                  proyek, environment,
                                                  Cloudflare Pages,
                                                  Worker, Apps Script

  WP-02                   Backend Foundation      API Gateway, API
                                                  response standard,
                                                  error handling, logging

  WP-03                   Authentication &        Login, role,
                          Authorization           permission, session,
                                                  lockout

  WP-04                   Database & System       Sheets, validasi,
                          Configuration           konfigurasi, theme,
                                                  feature management

  WP-05                   Public Portal           Beranda, profil,
                                                  jadwal, pengumuman,
                                                  kegiatan, menu dinamis

  WP-06                   Internal Dashboard      Dashboard role-based,
                                                  navigasi, pengguna,
                                                  profil

  WP-07                   Member Management       Jemaat, keluarga,
                                                  pendaftaran, impor, NIK
                                                  warning, archive

  WP-08                   Committee & Ministry    Komisi, keanggotaan,
                                                  pengurus, jadwal
                                                  pelayanan

  WP-09                   Financial Management    Kas, transaksi, iuran,
                                                  pembayaran, laporan,
                                                  kuitansi

  WP-10                   Announcement & Event    Pengumuman, approval,
                                                  kegiatan, pendaftaran,
                                                  dokumentasi

  WP-11                   AI, Monitoring &        Gemini ON/OFF, audit,
                          Integration             monitoring, backup,
                                                  integrasi akhir
  -----------------------------------------------------------------------

## 6.3 Siklus penyelesaian setiap modul

1.  Design/specification.
2.  Development.
3.  Unit test.
4.  Integration test.
5.  User Acceptance Test (UAT).
6.  Documentation.
7.  Approval.

Modul tidak dinyatakan selesai hanya karena halaman sudah tampil.
Backend, otorisasi, validasi, dan penyimpanan data juga harus diuji.

## 6.4 Urutan pengerjaan yang disarankan

-   Bangun WP-01 sampai WP-04 terlebih dahulu untuk memastikan fondasi,
    keamanan, dan konfigurasi stabil.
-   Lanjutkan WP-05 dan WP-06 untuk portal dan dashboard.
-   Bangun modul data dan operasional WP-07 sampai WP-10.
-   Integrasikan AI, monitoring, dan pemeriksaan akhir pada WP-11.

Urutan dapat disesuaikan jika ada dependensi teknis, tetapi tidak boleh
mengabaikan persetujuan dan pengujian.

## 6.5 Project tracking

Setiap Work Package perlu memiliki:

-   ID dan nama pekerjaan.
-   Deskripsi dan acceptance criteria.
-   PIC/penanggung jawab.
-   Prioritas.
-   Tanggal mulai dan target.
-   Status.
-   Dependensi.
-   Catatan risiko.
-   Bukti pengujian.
-   Persetujuan.

Status yang disarankan:

`Not Started → In Progress → Testing → UAT → Approved`

Status tambahan: `On Hold` dan `Blocked`.

## 6.6 Definition of Done

Sebuah Work Package dianggap selesai jika:

-   Semua kebutuhan dalam scope telah diimplementasikan.
-   Permission dan validasi backend berjalan.
-   Unit dan integration test lulus.
-   Tidak ada defect kritis terbuka.
-   UAT disetujui.
-   Dokumentasi diperbarui.
-   Perubahan source code tersimpan di repository.
-   Prosedur deployment/rollback yang relevan tersedia.

------------------------------------------------------------------------

# PHASE 7 -- TESTING & DEPLOYMENT FRAMEWORK

**Status:** Draft framework; detail test case, prosedur operasional, dan
jadwal belum difinalisasi.

## 7.1 Testing framework

  -----------------------------------------------------------------------
  ID                      Jenis pengujian         Fokus
  ----------------------- ----------------------- -----------------------
  T-01                    Functional Testing      Fungsi setiap modul

  T-02                    UI/UX Testing           Smartphone, tablet,
                                                  desktop

  T-03                    Authentication Testing  Login, logout, sesi,
                                                  lockout

  T-04                    Authorization Testing   Role, permission, akses
                                                  lintas role

  T-05                    Database Testing        Validasi, konsistensi,
                                                  relasi

  T-06                    Financial Testing       Saldo, transaksi,
                                                  verifikasi, kuitansi

  T-07                    Integration Testing     Cloudflare, Apps
                                                  Script, Sheets, Drive,
                                                  Gemini

  T-08                    Security Testing        Akses tanpa izin,
                                                  kebocoran, validasi
                                                  input

  T-09                    Performance Testing     Respons, konkurensi,
                                                  kuota

  T-10                    Backup & Recovery       Backup dan pemulihan
                          Testing                 

  T-11                    User Acceptance Testing Persetujuan pengguna
                                                  akhir
  -----------------------------------------------------------------------

## 7.2 Skenario uji penting

-   Pengunjung dapat mengakses halaman publik tanpa login.
-   Pengunjung tidak dapat membuka fungsi internal.
-   Pengguna internal hanya dapat menjalankan fungsi sesuai permission.
-   Tiga kegagalan login berturut-turut memicu lockout lima menit.
-   NIK kosong dapat disimpan.
-   NIK duplikat menampilkan warning tetapi dapat dilanjutkan setelah
    konfirmasi.
-   Jemaat Inactive tetap masuk laporan normal selama belum diarsipkan.
-   Jemaat Archived tidak masuk laporan normal tetapi tetap dapat dicari
    melalui filter arsip.
-   Restore mempertahankan status Active/Inactive.
-   Pembayaran transfer belum dianggap lunas sebelum diverifikasi.
-   Pembayaran terkonfirmasi menghasilkan kuitansi digital.
-   Kuitansi tersimpan di Drive dan referensinya tercatat.
-   Komisi dapat melihat laporan sesuai hak akses tetapi tidak mengelola
    transaksi secara independen.
-   Approval pengumuman mengikuti kategori dan permission.
-   Konten Hidden tidak muncul di portal publik.
-   AI OFF menyembunyikan UI dan backend menolak request AI.
-   Menu OFF-Maintenance menampilkan pesan yang sesuai dan tidak
    membocorkan fungsi/data yang dinonaktifkan.
-   Backup dapat dipulihkan dalam pengujian.

## 7.3 Environment

Gunakan tiga environment terpisah:

### Development (DEV)

-   Untuk coding dan pengujian awal.
-   Database Sheets dan Drive terpisah.
-   Menggunakan data dummy/sintetis.
-   Tidak menggunakan data jemaat produksi.

### Staging / UAT

-   Untuk simulasi proses dan pengujian pengguna.
-   Database dan Drive terpisah dari produksi.
-   Pengujian impor, keuangan, approval, dan integrasi dilakukan di
    sini.
-   Gunakan data uji atau data yang telah disamarkan.

### Production

-   Sistem resmi yang digunakan gereja.
-   Menggunakan database dan Drive produksi.
-   Akses dibatasi.
-   Backup dan monitoring aktif.
-   Perubahan dilakukan melalui prosedur rilis yang disetujui.

## 7.4 Deployment checklist

Sebelum go-live:

-   [ ] Semua modul dalam scope lulus pengujian.
-   [ ] Role dan permission diverifikasi.
-   [ ] Akun Gmail khusus gereja diamankan.
-   [ ] 2-Step Verification dan recovery disiapkan.
-   [ ] API Key dan secret tidak terekspos.
-   [ ] Sheets dan Drive tidak dapat diakses publik.
-   [ ] Backend memeriksa autentikasi dan otorisasi.
-   [ ] Backup dan recovery telah diuji.
-   [ ] Migrasi data jemaat diverifikasi.
-   [ ] UAT disetujui.
-   [ ] Pengurus mendapatkan pelatihan.
-   [ ] Dokumentasi operasional tersedia.
-   [ ] Rencana rollback disiapkan.
-   [ ] Persetujuan Go-Live diberikan.

## 7.5 Backup dan disaster recovery

Rancangan awal:

-   Backup berkala untuk data Sheets.
-   Backup file penting di Drive.
-   Simpan metadata backup: waktu, cakupan, hasil, dan lokasi.
-   Batasi akses backup.
-   Uji pemulihan secara berkala.
-   Dokumentasikan siapa yang berwenang menjalankan restore.
-   Tetapkan target RPO dan RTO sebelum go-live.
-   Jangan menganggap sinkronisasi atau version history sebagai
    satu-satunya backup.

Frekuensi backup, retensi, lokasi salinan, RPO/RTO, dan prosedur
pemulihan harus ditentukan dalam spesifikasi operasional final.

## 7.6 Rollback

Setiap rilis produksi harus memiliki:

-   Versi source code yang diketahui.
-   Catatan perubahan.
-   Versi deployment sebelumnya.
-   Backup data sebelum perubahan berisiko.
-   Prosedur mengembalikan frontend, Worker, dan Apps Script.
-   Prosedur pemulihan data jika perubahan skema atau migrasi gagal.

------------------------------------------------------------------------

# 8. RISIKO, ASUMSI, DAN HAL YANG BELUM DIFINALISASI

## 8.1 Risiko utama

  -----------------------------------------------------------------------
  Risiko                              Mitigasi
  ----------------------------------- -----------------------------------
  Kuota dan keterbatasan Apps         Batch processing, monitoring,
  Script/Sheets                       locking, jalur migrasi DB

  Akun Gmail menjadi single point of  Recovery, 2FA, tata kelola akses
  failure                             gereja

  Kebocoran data jemaat               Backend authorization, minimisasi
                                      data, akses terbatas

  Transaksi bersamaan                 LockService, validasi, idempotency

  Salah konfigurasi permission        Matriks role, test lintas role,
                                      audit

  API Key bocor                       Secret storage, tidak pernah di
                                      frontend/repository

  Backup tidak dapat dipulihkan       Recovery drill berkala

  Perubahan pengurus                  Dokumentasi dan prosedur transfer
                                      kepemilikan/akses
  -----------------------------------------------------------------------

## 8.2 Asumsi

-   Satu gereja menggunakan sistem pada tahap awal.
-   Gmail khusus gereja menjadi pemilik layanan Google.
-   Pengurus memiliki akun CCMS masing-masing.
-   Public Portal tidak membutuhkan login.
-   Google Sheets adalah database awal.
-   Cloudflare Pages dan Worker menjadi bagian dari infrastruktur
    frontend/API.
-   Gemini adalah penyedia AI awal, tetapi AI dapat dinonaktifkan.

## 8.3 Hal yang harus dirinci sebelum coding

1.  Data dictionary lengkap untuk seluruh sheet.
2.  ERD final dan aturan relasi.
3.  Matriks role-permission final.
4.  Daftar endpoint API, request/response, validasi, dan error code.
5.  Desain autentikasi, session, token, dan keamanan browser/API.
6.  Mekanisme deployment Apps Script dan Worker.
7.  Strategi penyimpanan secret dan konfigurasi environment.
8.  Aturan transaksi keuangan, saldo, pembatalan, koreksi, dan
    rekonsiliasi.
9.  Template kuitansi dan format nomor transaksi.
10. Detail approval pengumuman dan kegiatan.
11. RPO/RTO, retensi backup, dan jadwal recovery drill.
12. Test case rinci dan acceptance criteria.
13. Estimasi kuota, beban pengguna, dan batas kapasitas.
14. Prosedur operasional dan pergantian pengurus.

------------------------------------------------------------------------

# 9. ROADMAP DAN STATUS KESELURUHAN

  -----------------------------------------------------------------------
  Phase                   Nama                    Status
  ----------------------- ----------------------- -----------------------
  1                       Business Requirements   Baseline v0.2
                          (BRD)                   disetujui; perubahan
                                                  dikonsolidasikan di
                                                  dokumen ini

  2                       User Journey & Workflow Selesai pada tingkat
                                                  ringkasan; artefak
                                                  rinci dapat diperdalam

  3                       Database Design         Selesai pada tingkat
                                                  rancangan awal; data
                                                  dictionary final perlu
                                                  dirinci

  4                       UI/UX Design            Konsep dan keputusan
                                                  utama disepakati

  5                       Technical Architecture  Arsitektur baseline
                          & Specification         disepakati; detail
                                                  teknis masih perlu
                                                  dirinci

  6                       Development &           Draft framework; coding
                          Implementation          belum dimulai

  7                       Testing & Deployment    Draft framework;
                                                  pengujian dan
                                                  deployment belum
                                                  dimulai
  -----------------------------------------------------------------------

## Prinsip pelaksanaan proyek

1.  Tidak memulai coding sebelum spesifikasi rinci yang relevan
    disetujui.
2.  Mengembangkan sistem per modul, bukan sekaligus.
3.  Setiap modul harus melewati pengujian dan persetujuan.
4.  Data produksi tidak digunakan untuk eksperimen development.
5.  Keamanan dan privasi menjadi persyaratan sejak awal.
6.  Semua keputusan perubahan dicatat dalam change log.
7.  Sistem harus memiliki dokumentasi agar dapat diteruskan oleh
    pengurus atau developer berikutnya.

------------------------------------------------------------------------

## 10. CATATAN PENTING

Dokumen ini merupakan **dokumen induk konsolidasi perencanaan CCMS**
berdasarkan keputusan dan diskusi Phase 1--7. Dokumen ini belum
menggantikan spesifikasi teknis rinci, data dictionary final, API
contract, test case, maupun SOP operasional.

Sebelum Phase 6 dimulai, dokumen-dokumen rinci yang relevan pada bagian
8.3 harus diselesaikan dan disetujui. Dengan demikian, seluruh
implementasi memiliki dasar yang jelas dan dapat ditelusuri kembali.

**Akhir dokumen.**
