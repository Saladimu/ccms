/**
 * Cleanup ledger REVOKED_SESSIONS setelah token melewati masa berlaku.
 * Jalankan terjadwal hanya setelah verifikasi environment.
 * PROD memerlukan CCMS_ALLOW_SESSION_CLEANUP=TRUE.
 */
function cleanupRevokedSessions() {
  var props = PropertiesService.getScriptProperties();
  var env = String(props.getProperty('CCMS_ENV') || '').toUpperCase();
  var spreadsheetId = props.getProperty('CCMS_SPREADSHEET_ID');
  if (['DEV', 'STAGING', 'PROD'].indexOf(env) === -1 || !spreadsheetId) throw new Error('CCMS_ENV dan CCMS_SPREADSHEET_ID wajib valid.');
  if (env === 'PROD' && String(props.getProperty('CCMS_ALLOW_SESSION_CLEANUP') || '').toUpperCase() !== 'TRUE') throw new Error('Cleanup PROD memerlukan CCMS_ALLOW_SESSION_CLEANUP=TRUE setelah persetujuan.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Tidak dapat memperoleh lock untuk cleanup sesi.');
  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sh = ss.getSheetByName('REVOKED_SESSIONS');
    if (!sh) throw new Error('REVOKED_SESSIONS belum tersedia; jalankan migrasi terlebih dahulu.');
    var values = sh.getDataRange().getValues();
    if (values.length <= 1) return { deleted: 0 };
    var expiryIndex = values[0].indexOf('expires_at');
    if (expiryIndex < 0) throw new Error('Kolom expires_at tidak ditemukan.');
    var now = Date.now();
    var deleted = 0;
    for (var i = values.length - 1; i >= 1; i--) {
      var raw = values[i][expiryIndex];
      var expiry = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
      if (isFinite(expiry) && expiry > 0 && expiry <= now) { sh.deleteRow(i + 1); deleted++; }
    }
    Logger.log('Session revocation cleanup ENV=' + env + ', deleted=' + deleted);
    return { deleted: deleted };
  } finally { lock.releaseLock(); }
}