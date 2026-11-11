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

  function validateConfigValue(target, rawValue) {
    var type = String(target.value_type || '').toUpperCase();
    var value = String(rawValue === undefined || rawValue === null ? '' : rawValue).trim();

    if (type === 'STRING') {
      if (value.length > 2000) throw new AppError('VALIDATION', 'Nilai konfigurasi terlalu panjang (maksimal 2000 karakter)', 400);
      return value;
    }
    if (type === 'BOOLEAN') {
      var bool = value.toUpperCase();
      if (bool !== 'TRUE' && bool !== 'FALSE') throw new AppError('VALIDATION', 'Nilai harus TRUE atau FALSE', 400);
      return bool;
    }
    if (type === 'NUMBER') {
      var number = Number(value);
      if (!value || !isFinite(number) || number < 0 || number > 1000000) {
        throw new AppError('VALIDATION', 'Nilai harus berupa angka valid antara 0 dan 1000000', 400);
      }
      if (target.config_key === 'LOGIN_MAX_ATTEMPTS' && number !== 3) {
        throw new AppError('FORBIDDEN', 'BRD menetapkan lockout setelah tepat 3 kegagalan login', 403);
      }
      if (target.config_key === 'LOGIN_LOCKOUT_MINUTES' && number !== 5) {
        throw new AppError('FORBIDDEN', 'BRD menetapkan durasi lockout 5 menit', 403);
      }
      if (target.config_key === 'SESSION_TTL_MINUTES' && (number < 15 || number > 1440)) {
        throw new AppError('VALIDATION', 'SESSION_TTL_MINUTES harus 15–1440 menit', 400);
      }
      return String(number);
    }
    if (type === 'ENUM') {
      var enumValues = {
        THEME_PUBLIC: ['CLASSIC', 'MODERN', 'WARM'],
        THEME_INTERNAL: ['CLASSIC', 'MODERN', 'WARM'],
      };
      var allowed = enumValues[target.config_key] || [];
      if (allowed.indexOf(value.toUpperCase()) === -1) {
        throw new AppError('VALIDATION', 'Nilai enum tidak valid untuk ' + target.config_key, 400);
      }
      return value.toUpperCase();
    }
    if (type === 'JSON') {
      try { JSON.parse(value); } catch (e) {
        throw new AppError('VALIDATION', 'Nilai harus JSON yang valid', 400);
      }
      return value;
    }
    throw new AppError('VALIDATION', 'Tipe konfigurasi tidak didukung: ' + type, 400);
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
    if (target.is_secret === true || String(target.is_secret).toUpperCase() === 'TRUE') {
      throw new AppError('FORBIDDEN', 'Config rahasia hanya dapat diubah melalui prosedur server-side yang aman.', 403);
    }

    var validatedValue = validateConfigValue(target, ctx.payload.value);

    Db.write('CONFIG', function () {
      return {
        update: [{
          _row: target._row,
          config_value: validatedValue,
          updated_at: Db.now(),
          updated_by: ctx.user.user_id,
        }],
      };
    });
    load(true);

    // Jangan merekam nilai konfigurasi pada audit log; cukup catat key dan tipe.
    Audit.log(ctx, 'CONFIG_SET', 'SYSTEM', 'CONFIG', key, { value_updated: true, value_type: target.value_type });
    return { key: key, value: validatedValue };
  }

  return { get: get, getNumber: getNumber, getBool: getBool, apiGet: apiGet, apiSet: apiSet };
})();
