/**
 * Migration: add REVOKED_SESSIONS to an existing CCMS database.
 *
 * Run manually once per environment after verifying CCMS_ENV and
 * CCMS_SPREADSHEET_ID. This function does not create or switch databases.
 */
function migrateSessionRevocationSheet() {
  var props = PropertiesService.getScriptProperties();
  var env = String(props.getProperty('CCMS_ENV') || '').toUpperCase();
  var spreadsheetId = props.getProperty('CCMS_SPREADSHEET_ID');
  if (['DEV', 'STAGING', 'PROD'].indexOf(env) === -1 || !spreadsheetId) {
    throw new Error('CCMS_ENV dan CCMS_SPREADSHEET_ID harus dikonfigurasi sebelum migrasi.');
  }
  if (env === 'PROD' && String(props.getProperty('CCMS_ALLOW_SCHEMA_MIGRATION') || '').toUpperCase() !== 'TRUE') {
    throw new Error('Migrasi PROD memerlukan CCMS_ALLOW_SCHEMA_MIGRATION=TRUE setelah backup dan persetujuan.');
  }

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var expectedName = 'CCMS-' + env + '-DB';
  if (ss.getName() !== expectedName) {
    throw new Error('Migrasi dihentikan: nama database aktual tidak cocok dengan CCMS_ENV. Expected ' + expectedName + ', found ' + ss.getName() + '. Periksa pointer database sebelum melanjutkan.');
  }
  if (ss.getSheetByName('REVOKED_SESSIONS')) {
    Logger.log('REVOKED_SESSIONS sudah tersedia; tidak ada perubahan.');
    return;
  }

  var sh = ss.insertSheet('REVOKED_SESSIONS');
  sh.getRange(1, 1, 1, 4).setValues([['session_id', 'user_id', 'revoked_at', 'expires_at']]);
  sh.getRange(1, 1, 1, 4).setFontWeight('bold');
  sh.protect().setDescription('Terkendali oleh Apps Script CCMS');
  Logger.log('REVOKED_SESSIONS berhasil ditambahkan pada environment ' + env + '.');
}
