/**
 * Db — akses Google Sheets.
 *
 * Aturan:
 *  - Semua baca/tulis batch; jangan pernah loop getRange per baris.
 *  - Semua tulis memakai LockService (getScriptLock) via Db.write.
 *  - ID record digenerate Db.newId(prefix), tidak bergantung nomor baris.
 *  - Spreadsheet ID dibaca dari Script Properties (CCMS_SPREADSHEET_ID).
 */

var Db = (function () {

  var cache = { spreadsheet: null };

  function spreadsheet() {
    if (!cache.spreadsheet) {
      var id = PropertiesService.getScriptProperties().getProperty('CCMS_SPREADSHEET_ID');
      if (!id) throw new AppError('DB_NOT_SETUP', 'Database belum di-setup. Jalankan setupDatabase().', 500);
      cache.spreadsheet = SpreadsheetApp.openById(id);
    }
    return cache.spreadsheet;
  }

  /** Baca seluruh sheet sebagai array objek (header → key). */
  function readAll(sheetName) {
    var sh = spreadsheet().getSheetByName(sheetName);
    if (!sh) throw new AppError('SHEET_MISSING', 'Sheet tidak ditemukan: ' + sheetName, 500);
    var values = sh.getDataRange().getValues();
    if (values.length < 2) return [];
    var head = values[0];
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (String(row[0] || '') === '') continue; // skip baris kosong
      var obj = {};
      for (var c = 0; c < head.length; c++) obj[head[c]] = row[c];
      obj._row = i + 1; // nomor baris fisik (untuk update)
      rows.push(obj);
    }
    return rows;
  }

  /**
   * Tulis aman: fn(rows) mengembalikan {append: [...], update: [{_row, ...}]}
   * dieksekusi dalam satu lock.
   * PERBAIKAN: update sekarang merge dengan data existing, tidak overwrite kosong.
   */
  function write(sheetName, fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      var result = fn();
      var sh = spreadsheet().getSheetByName(sheetName);
      if (result.append && result.append.length) {
        var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        var matrix = result.append.map(function (rec) {
          return head.map(function (col) {
            return rec[col] !== undefined ? rec[col] : '';
          });
        });
        sh.getRange(sh.getLastRow() + 1, 1, matrix.length, head.length).setValues(matrix);
      }
      if (result.update && result.update.length) {
        var head2 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        result.update.forEach(function (u) {
          // Baca data existing row untuk di-merge dengan update
          var existingRow = sh.getRange(u._row, 1, 1, head2.length).getValues()[0];
          var existingObj = {};
          for (var c = 0; c < head2.length; c++) {
            existingObj[head2[c]] = existingRow[c];
          }
          // Merge: existing + update (update wins)
          var merged = Object.assign({}, existingObj, u);
          // Tulis merged row
          var rowVals = head2.map(function (col) {
            if (col === '_row') return u._row;
            return merged[col] !== undefined ? merged[col] : '';
          });
          sh.getRange(u._row, 1, 1, head2.length).setValues([rowVals]);
        });
      }
      return result;
    } finally {
      lock.releaseLock();
    }
  }

  /** Generate ID unik: PREFIX-<base36 timestamp><3 char acak>. */
  function newId(prefix) {
    var t = Date.now().toString(36).toUpperCase();
    var r = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    while (r.length < 2) r = '0' + r;
    return prefix + '-' + t + r;
  }

  /** Timestamp ISO zona Jakarta. */
  function now() {
    return Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  return { readAll: readAll, write: write, newId: newId, now: now, spreadsheet: spreadsheet };
})();