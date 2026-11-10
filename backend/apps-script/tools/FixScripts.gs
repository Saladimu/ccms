/**
 * Fix Admin Role — Jalankan SETELAH deploy ulang.
 * Assign role SUPER_ADMIN ke user admin (USR-M4K7A2B1C9).
 */
function fixAdminRole() {
  var ss = SpreadsheetApp.openById('1Yq_ef8bxiwbDxmoeLxo3929pOnd1YH3tMLe3Lh40-MQ');
  
  // Cari role_id SUPER_ADMIN
  var rolesSh = ss.getSheetByName('ROLES');
  var rolesData = rolesSh.getDataRange().getValues();
  var superRoleId = '';
  for (var i = 1; i < rolesData.length; i++) {
    if (rolesData[i][1] === 'SUPER_ADMIN') superRoleId = rolesData[i][0];
  }
  if (!superRoleId) {
    Logger.log('ERROR: Role SUPER_ADMIN tidak ditemukan di sheet ROLES');
    return;
  }
  
  // Cek USER_ROLES
  var urSh = ss.getSheetByName('USER_ROLES');
  var urData = urSh.getDataRange().getValues();
  var exists = false;
  for (var i = 1; i < urData.length; i++) {
    if (urData[i][1] === 'USR-M4K7A2B1C9' && urData[i][2] === superRoleId) {
      exists = true;
      break;
    }
  }
  
  if (!exists) {
    urSh.appendRow([Utilities.getUuid(), 'USR-M4K7A2B1C9', superRoleId, new Date(), 'SYSTEM']);
    Logger.log('SUPER_ADMIN role assigned to admin');
  } else {
    Logger.log('Role sudah ada');
  }
}

/**
 * Recreate Admin Clean — Buat ulang admin dengan hash benar & role SUPER_ADMIN.
 * Jalankan jika admin perlu dibuat ulang total.
 */
function recreateAdminClean() {
  var ss = SpreadsheetApp.openById('1Yq_ef8bxiwbDxmoeLxo3929pOnd1YH3tMLe3Lh40-MQ');
  var sh = ss.getSheetByName('USERS');
  
  // Hapus sheet USERS lama & buat baru
  if (sh) ss.deleteSheet(sh);
  var newSh = ss.insertSheet('USERS');
  
  // Header
  var headers = ['user_id','username','password_hash','full_name','email','phone',
                 'is_active','must_change_password','locked_until','consecutive_failures',
                 'last_login_at','created_at','created_by','updated_at','updated_by'];
  newSh.getRange(1, 1, 1, headers.length).setValues([headers]);
  newSh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Hash & tulis admin
  var hash = Auth.hashPassword('Admin123!');
  newSh.appendRow([
    'USR-M4K7A2B1C9', 'admin', hash, 'Super Admin', '', '',
    true, true, '', 0, '', new Date(), 'SYSTEM', new Date(), 'SYSTEM'
  ]);
  
  // Assign SUPER_ADMIN role
  var rolesSh = ss.getSheetByName('ROLES');
  var rolesData = rolesSh.getDataRange().getValues();
  var superRoleId = '';
  for (var i = 1; i < rolesData.length; i++) {
    if (rolesData[i][1] === 'SUPER_ADMIN') superRoleId = rolesData[i][0];
  }
  if (superRoleId) {
    var urSh = ss.getSheetByName('USER_ROLES');
    urSh.appendRow([Utilities.getUuid(), 'USR-M4K7A2B1C9', superRoleId, new Date(), 'SYSTEM']);
  }
  
  newSh.protect().setDescription('Terkendali Apps Script CCMS');
  Logger.log('Admin recreated with SUPER_ADMIN role. Hash: ' + Auth.hashPassword('Admin123!'));
}

/**
 * Verify All Sheets — Cek integritas data semua sheet utama.
 */
function verifyAllSheets() {
  var ss = SpreadsheetApp.openById('1Yq_ef8bxiwbDxmoeLxo3929pOnd1YH3tMLe3Lh40-MQ');
  var sheets = ['USERS', 'ROLES', 'PERMISSIONS', 'USER_ROLES', 'CONFIG', 'PUBLIC_MENU', 'AUDIT_LOG', 'LOGIN_ATTEMPTS'];
  var report = [];
  
  sheets.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      report.push(name + ': SHEET HILANG!');
      return;
    }
    var data = sh.getDataRange().getValues();
    var rowCount = data.length - 1; // exclude header
    var emptyRows = 0;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || '') === '') emptyRows++;
    }
    report.push(name + ': ' + rowCount + ' rows, ' + emptyRows + ' empty');
  });
  
  // Cek admin
  var us = ss.getSheetByName('USERS');
  var usData = us.getDataRange().getValues();
  var adminFound = false;
  for (var i = 1; i < usData.length; i++) {
    if (String(usData[i][1]).toLowerCase() === 'admin') {
      adminFound = true;
      break;
    }
  }
  report.push('Admin user: ' + (adminFound ? 'ADA' : 'TIDAK ADA!'));
  
  // Cek SUPER_ADMIN role assignment
  var urSh = ss.getSheetByName('USER_ROLES');
  var urData = urSh.getDataRange().getValues();
  var roleAssigned = false;
  for (var i = 1; i < urData.length; i++) {
    if (urData[i][1] === 'USR-M4K7A2B1C9') {
      report.push('USER_ROLES: admin punya role');
      roleAssigned = true;
      break;
    }
  }
  if (!roleAssigned) report.push('USER_ROLES: admin TIDAK punya role!');
  
  Logger.log('=== VERIFICATION REPORT ===');
  report.forEach(function(r) { Logger.log(r); });
}