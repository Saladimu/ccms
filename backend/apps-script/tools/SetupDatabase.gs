/**
 * SetupDatabase — dijalankan SEKALI per environment dari editor Apps Script.
 *
 * Fungsi:
 *  1. Membuat spreadsheet CCMS-<ENV>-DB dengan 8 sheet Tahap 1 + header + seed.
 *  2. Menghasilkan SESSION_SECRET dan menyimpan CCMS_SPREADSHEET_ID ke Script Properties.
 *  3. Membuat akun Super Admin awal (username: admin, password: dicetak di log).
 *  4. Mencetak langkah berikutnya di log.
 *
 * PENTING: Ganti nama folder Drive (DRIVE_FOLDER_NAME) sesuai environment
 * sebelum menjalankan (DEV / STAGING / PROD).
 */

function setupDatabase() {
  var props = PropertiesService.getScriptProperties();
  var existingSpreadsheetId = props.getProperty('CCMS_SPREADSHEET_ID');
  if (existingSpreadsheetId) {
    throw new Error('Setup dihentikan: CCMS_SPREADSHEET_ID sudah terisi. Jangan membuat database baru di atas environment yang sudah terpasang. Untuk reset, lakukan prosedur migrasi/reset terpisah dan eksplisit.');
  }

  var envName = String(props.getProperty('CCMS_ENV') || 'DEV').toUpperCase();
  if (['DEV', 'STAGING', 'PROD'].indexOf(envName) === -1) {
    throw new Error('CCMS_ENV harus DEV, STAGING, atau PROD.');
  }
  if (envName === 'PROD' && String(props.getProperty('CCMS_ALLOW_PROD_SETUP') || '').toUpperCase() !== 'TRUE') {
    throw new Error('Setup PROD memerlukan CCMS_ALLOW_PROD_SETUP=TRUE sebagai konfirmasi eksplisit.');
  }

  // Nama database mengikuti environment yang disetel pada Script Properties.
  var ss = SpreadsheetApp.create('CCMS-' + envName + '-DB');

  createSheet(ss, 'CONFIG', ['config_key', 'config_value', 'value_type', 'is_secret', 'description', 'updated_at', 'updated_by'], [
    ['CHURCH_NAME', 'Gereja (ganti di setup)', 'STRING', 'FALSE', 'Nama resmi gereja', Db.now(), 'SYSTEM'],
    ['CHURCH_TAGLINE', '', 'STRING', 'FALSE', 'Slogan gereja', Db.now(), 'SYSTEM'],
    ['CHURCH_ADDRESS', '', 'STRING', 'FALSE', 'Alamat gereja', Db.now(), 'SYSTEM'],
    ['CHURCH_PHONE', '', 'STRING', 'FALSE', 'Telepon gereja', Db.now(), 'SYSTEM'],
    ['CHURCH_EMAIL', '', 'STRING', 'FALSE', 'Email kontak', Db.now(), 'SYSTEM'],
    ['CHURCH_LOGO_URL', '', 'STRING', 'FALSE', 'URL logo (Drive share)', Db.now(), 'SYSTEM'],
    ['THEME_PUBLIC', 'CLASSIC', 'ENUM', 'FALSE', 'Tema portal publik', Db.now(), 'SYSTEM'],
    ['THEME_INTERNAL', 'MODERN', 'ENUM', 'FALSE', 'Tema aplikasi internal', Db.now(), 'SYSTEM'],
    ['PUBLIC_DARK_MODE', 'FALSE', 'BOOLEAN', 'FALSE', 'Dark mode portal publik', Db.now(), 'SYSTEM'],
    ['INTERNAL_DARK_MODE', 'FALSE', 'BOOLEAN', 'FALSE', 'Dark mode internal', Db.now(), 'SYSTEM'],
    ['MAINTENANCE_MESSAGE', 'Sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanannya.', 'STRING', 'FALSE', 'Pesan menu OFF-Maintenance', Db.now(), 'SYSTEM'],
    ['SESSION_TTL_MINUTES', '480', 'NUMBER', 'FALSE', 'Masa berlaku sesi (menit)', Db.now(), 'SYSTEM'],
    ['LOGIN_MAX_ATTEMPTS', '3', 'NUMBER', 'FALSE', 'Maks gagal login sebelum lockout', Db.now(), 'SYSTEM'],
    ['LOGIN_LOCKOUT_MINUTES', '5', 'NUMBER', 'FALSE', 'Durasi lockout (menit)', Db.now(), 'SYSTEM'],
    ['AI_ASSISTANT_ENABLED', 'FALSE', 'BOOLEAN', 'FALSE', 'Feature flag AI (Tahap 3)', Db.now(), 'SYSTEM'],
    ['AI_PROVIDER', 'GEMINI', 'STRING', 'FALSE', 'Provider AI', Db.now(), 'SYSTEM'],
    ['AI_MODEL', '', 'STRING', 'FALSE', 'Model AI (isi Tahap 3)', Db.now(), 'SYSTEM'],
    ['AI_DAILY_LIMIT', '50', 'NUMBER', 'FALSE', 'Batas pemanggilan AI per hari', Db.now(), 'SYSTEM'],
  ]);

  createSheet(ss, 'PUBLIC_MENU', ['menu_id', 'menu_key', 'menu_label', 'parent_menu_id', 'url_path', 'status', 'sort_order', 'updated_at', 'updated_by'], [
    [Db.newId('MENU'), 'home', 'Beranda', '', '/', 'ON', 1, Db.now(), 'SYSTEM'],
    [Db.newId('MENU'), 'schedule', 'Jadwal Ibadah', '', '/jadwal', 'ON', 2, Db.now(), 'SYSTEM'],
    [Db.newId('MENU'), 'announcements', 'Pengumuman', '', '/pengumuman', 'ON', 3, Db.now(), 'SYSTEM'],
    [Db.newId('MENU'), 'events', 'Kegiatan', '', '/kegiatan', 'ON', 4, Db.now(), 'SYSTEM'],
    [Db.newId('MENU'), 'profile', 'Profil Gereja', '', '/profil', 'ON', 5, Db.now(), 'SYSTEM'],
    [Db.newId('MENU'), 'contact', 'Kontak', '', '/kontak', 'ON', 6, Db.now(), 'SYSTEM'],
  ]);

  createSheet(ss, 'USERS', ['user_id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'is_active', 'must_change_password', 'locked_until', 'consecutive_failures', 'last_login_at', 'created_at', 'created_by', 'updated_at', 'updated_by'], []);

  createSheet(ss, 'ROLES', ['role_id', 'role_code', 'role_name', 'description', 'is_system', 'is_active', 'created_at', 'created_by'], [
    [Db.newId('ROL'), 'SUPER_ADMIN', 'Super Admin', 'Kelola konfigurasi, akun, role, permission, fitur', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
    [Db.newId('ROL'), 'PASTOR', 'Pendeta/Majelis', 'Ringkasan & persetujuan', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
    [Db.newId('ROL'), 'SECRETARY', 'Sekretaris/Admin', 'Data jemaat, pengumuman, surat', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
    [Db.newId('ROL'), 'TREASURER', 'Bendahara Pusat', 'Kas, transaksi, iuran, laporan', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
    [Db.newId('ROL'), 'COMMITTEE_HEAD', 'Pengurus Komisi', 'Data dan laporan komisi', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
    [Db.newId('ROL'), 'STAFF', 'Petugas Pelayanan', 'Jadwal dan tugas pelayanan', 'TRUE', 'TRUE', Db.now(), 'SYSTEM'],
  ]);

  createSheet(ss, 'PERMISSIONS', ['permission_id', 'permission_code', 'permission_name', 'module', 'stage', 'is_active', 'description'], [
    [Db.newId('PERM'), 'USER_MANAGE', 'Kelola akun CCMS', 'SYSTEM', 1, 'TRUE', ''],
    [Db.newId('PERM'), 'SYSTEM_CONFIG', 'Ubah konfigurasi sistem', 'SYSTEM', 1, 'TRUE', ''],
    [Db.newId('PERM'), 'MENU_CONFIG', 'Kelola menu publik', 'SYSTEM', 1, 'TRUE', ''],
    [Db.newId('PERM'), 'AUDIT_VIEW', 'Lihat audit log', 'SYSTEM', 1, 'TRUE', ''],
    [Db.newId('PERM'), 'MEMBER_READ', 'Lihat data jemaat', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'MEMBER_CREATE', 'Buat jemaat baru', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'MEMBER_EDIT', 'Ubah data jemaat', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'MEMBER_ARCHIVE', 'Arsip/restore jemaat', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'REGISTRATION_REVIEW', 'Verifikasi pendaftaran', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'IMPORT_RUN', 'Jalankan impor/migrasi', 'MEMBER', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'COMMITTEE_MANAGE', 'Kelola komisi', 'COMMITTEE', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'SCHEDULE_VIEW', 'Lihat jadwal pelayanan', 'COMMITTEE', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'SCHEDULE_MANAGE', 'Ubah jadwal pelayanan', 'COMMITTEE', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'FINANCE_READ', 'Lihat kas/transaksi', 'FINANCE', 3, 'TRUE', ''],
    [Db.newId('PERM'), 'FINANCE_WRITE', 'Catat transaksi', 'FINANCE', 3, 'TRUE', ''],
    [Db.newId('PERM'), 'FINANCE_VERIFY', 'Verifikasi pembayaran', 'FINANCE', 3, 'TRUE', ''],
    [Db.newId('PERM'), 'RECEIPT_VIEW', 'Unduh/bagikan kuitansi', 'FINANCE', 3, 'TRUE', ''],
    [Db.newId('PERM'), 'ANNOUNCE_DRAFT', 'Buat draft pengumuman', 'ANNOUNCEMENT', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'ANNOUNCE_APPROVE', 'Persetujuan pengumuman', 'ANNOUNCEMENT', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'ANNOUNCE_PUBLISH', 'Publish/hidden pengumuman', 'ANNOUNCEMENT', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'EVENT_MANAGE', 'Kelola kegiatan', 'EVENT', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'REPORT_VIEW', 'Lihat laporan', 'REPORT', 2, 'TRUE', ''],
    [Db.newId('PERM'), 'AI_USE', 'Pakai AI Assistant', 'AI', 3, 'TRUE', ''],
  ]);

  createSheet(ss, 'USER_ROLES', ['user_role_id', 'user_id', 'role_id', 'assigned_at', 'assigned_by'], []);
  createSheet(ss, 'AUDIT_LOG', ['audit_id', 'timestamp', 'session_id', 'user_id', 'username', 'action', 'module', 'record_type', 'record_id', 'detail', 'ip_address'], []);
  createSheet(ss, 'LOGIN_ATTEMPTS', ['attempt_id', 'timestamp', 'username', 'success', 'failure_reason', 'ip_address', 'user_agent'], []);

  // Script Properties: simpan pointer database untuk environment project ini.
  props.setProperty('CCMS_SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('SESSION_SECRET')) {
    var secret = [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()].join('').replace(/-/g, '');
    props.setProperty('SESSION_SECRET', secret);
  }

  // Folder Drive
  var root = DriveApp.getRootFolder();
  var folders = root.getFoldersByName('CCMS');
  var parent = folders.hasNext() ? folders.next() : root.createFolder('CCMS');
  var envFolders = parent.getFoldersByName(envName);
  var envFolder = envFolders.hasNext() ? envFolders.next() : parent.createFolder(envName);
  // Spreadsheet harus benar-benar dipindahkan ke folder environment, bukan
  // hanya membuat folder terpisah sementara file tetap berada di My Drive root.
  DriveApp.getFileById(ss.getId()).moveTo(envFolder);

  // Super Admin awal - pakai Db.write untuk konsistensi
  var adminPassword = 'CCMS-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  var adminUserId = Db.newId('USR');
  var roles = ss.getSheetByName('ROLES').getDataRange().getValues();
  var superRoleId = '';
  for (var i = 1; i < roles.length; i++) {
    if (roles[i][1] === 'SUPER_ADMIN') superRoleId = roles[i][0];
  }

  Db.write('USERS', function () {
    return {
      append: [{
        user_id: adminUserId,
        username: 'admin',
        password_hash: Auth.hashPassword(adminPassword),
        full_name: 'Super Admin Awal',
        email: '',
        phone: '',
        is_active: true,
        must_change_password: true,
        locked_until: '',
        consecutive_failures: 0,
        last_login_at: '',
        created_at: Db.now(),
        created_by: 'SYSTEM',
        updated_at: Db.now(),
        updated_by: 'SYSTEM',
      }]
    };
  });

  if (superRoleId) {
    Db.write('USER_ROLES', function () {
      return {
        append: [{
          user_role_id: Db.newId('UR'),
          user_id: adminUserId,
          role_id: superRoleId,
          assigned_at: Db.now(),
          assigned_by: 'SYSTEM',
        }]
      };
    });
  }

  Logger.log('====================================');
  Logger.log('CCMS setup selesai. ENV: ' + envName);
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Folder Drive: ' + envFolder.getUrl());
  Logger.log('SUPER ADMIN AWAL — username: admin');
  Logger.log('SUPER ADMIN AWAL — password: ' + adminPassword);
  Logger.log('SEGERA ubah password setelah login pertama (users.resetPassword).');
  Logger.log('Langkah berikutnya: Deploy web app (Execute as: Me, Access: Anyone)');
  Logger.log('  lalu salin URL /exec ke wrangler.toml (GAS_URL).');
  Logger.log('====================================');
}

function createSheet(ss, name, headers, seedRows) {
  var sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  if (seedRows.length) {
    sh.getRange(2, 1, seedRows.length, headers.length).setValues(seedRows);
  }
  // Proteksi sheet: hanya editor yang punya akses (Apps Script)
  sh.protect().setDescription('Terkendali oleh Apps Script CCMS');
  return sh;
}
