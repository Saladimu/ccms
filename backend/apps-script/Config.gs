/**
 * Config — akses sheet CONFIG dengan cache in-memory per eksekusi.
 * Nilai is_secret=TRUE tidak boleh keluar lewat apiGet.
 */

var Config = (function () {

  var cache = null;

  function load(force) {
    if (cache === null || force) {
      cache = {};
      Db.readAll('CONFIG').forEach(function (row) {
        cache[row.config_key] = {
          value: row.config_value,
          type: row.value_type,
          isSecret: row.is_secret === true || String(row.is_secret).toUpperCase() === 'TRUE',
        };
      });
    }
    return cache;
  }

  function get(key, fallback) {
    var c = load();
    return Object.prototype.hasOwnProperty.call(c, key) ? c[key].value : fallback;
  }

  function getNumber(key, fallback) {
    var v = parseFloat(get(key, fallback));
    return isNaN(v) ? fallback : v;
  }

  function getBool(key, fallback) {
    var v = get(key, fallback);
    if (v === true) return true;
    return String(v).toUpperCase() === 'TRUE';
  }

  /** Handler API: config.get (non-secret saja untuk semua admin; secret hanya nilai tidak pernah keluar). */
  function apiGet(ctx) {
    var c = load();
    var out = {};
    Object.keys(c).forEach(function (k) {
      out[k] = { value: c[k].isSecret ? '***' : c[k].value, type: c[k].type, isSecret: c[k].isSecret };
    });
    return out;
  }

  /** Handler API: config.set { key, value } */
  function apiSet(ctx) {
    var key = String(ctx.payload.key || '').trim();
    if (!key) throw new AppError('VALIDATION', 'config key wajib diisi');
    var rows = Db.readAll('CONFIG');
    var target = null;
    rows.forEach(function (r) { if (r.config_key === key) target = r; });
    if (!target) throw new AppError('NOT_FOUND', 'Config key tidak ditemukan: ' + key, 404);
    if (key === 'SESSION_SECRET') throw new AppError('FORBIDDEN', 'SESSION_SECRET tidak boleh diubah via API', 403);

    Db.write('CONFIG', function () {
      return {
        update: [{
          _row: target._row,
          config_value: String(ctx.payload.value),
          updated_at: Db.now(),
          updated_by: ctx.user.user_id,
        }],
      };
    });
    load(true);

    Audit.log(ctx, 'CONFIG_SET', 'SYSTEM', 'CONFIG', key, { to: String(ctx.payload.value) });
    return { key: key, value: String(ctx.payload.value) };
  }

  return { get: get, getNumber: getNumber, getBool: getBool, apiGet: apiGet, apiSet: apiSet };
})();
