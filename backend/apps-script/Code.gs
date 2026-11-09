/**
 * CCMS — Google Apps Script Backend (Tahap 1)
 *
 * Prinsip:
 *  - Satu entry point: doPost(). Semua request datang dari Cloudflare Worker.
 *  - Setiap request: parse → route → auth (bila perlu) → permission → handler.
 *  - Selalu membalas HTTP 200 + JSON { status, ok, data | error }.
 *    (Web app GAS selalu HTTP 200; status "asli" dikirim di field `status`.)
 *  - Keamanan (auth, permission, validasi) SELURUHNYA di sini.
 *    Frontend/Worker tidak pernah dipercaya.
 *
 * Modul (lihat tiap file):
 *  - Router.gs      : routing action → handler + permission
 *  - Auth.gs        : session, token, lockout, password
 *  - Db.gs          : akses sheet (read/write dengan LockService)
 *  - Config.gs      : CONFIG cache
 *  - Users.gs       : manajemen akun
 *  - PublicMenu.gs  : menu publik
 *  - Public.gs      : endpoint publik
 *  - Audit.gs       : audit log
 *  - tools/SetupDatabase.gs : setup awal (sheet + seed), jalankan sekali
 */

function doPost(e) {
  var ctx = { action: '', payload: {}, token: '', ip: '', userAgent: '', user: null };
  var status = 200;
  var ok = true;
  var data = null;
  var error = null;

  try {
    var body = JSON.parse(e.postData.contents || '{}');
    ctx.action = String(body.action || '');
    ctx.payload = body.payload || {};
    ctx.token = (body.meta && body.meta.token) || '';
    ctx.ip = (body.meta && body.meta.ip) || '';
    ctx.userAgent = (body.meta && body.meta.userAgent) || '';

    var route = Router.resolve(ctx.action);

    if (route.needsSession) {
      var payload = Auth.verifyToken(ctx.token);
      var rp = Auth.getUserRolesAndPermissions(payload.sub);
      ctx.user = {
        user_id: payload.sub,
        username: payload.username,
        name: payload.name,
        roles: rp.roles,
        permissions: rp.permissions,
      };
      if (route.permission && ctx.user.permissions.indexOf(route.permission) === -1) {
        throw new AppError('FORBIDDEN', 'Anda tidak memiliki izin untuk aksi ini', 403);
      }
    }

    data = route.handler(ctx);
  } catch (err) {
    var known = (err instanceof AppError);
    status = known ? err.httpStatus : 500;
    ok = false;
    error = {
      code: known ? err.code : 'INTERNAL_ERROR',
      message: known ? err.message : 'Terjadi kesalahan internal. Silakan coba lagi.',
    };
    try {
      Logger.log(JSON.stringify({
        at: new Date().toISOString(),
        action: ctx.action,
        err: String((err && err.message) || err),
        stack: (err && err.stack) ? String(err.stack).slice(0, 500) : '',
      }));
    } catch (ignored) {}
  }

  var out = { status: status, ok: ok, data: data };
  if (error) out.error = error;
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Error baku aplikasi. */
function AppError(code, message, httpStatus) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.httpStatus = httpStatus || 400;
}
AppError.prototype = Object.create(Error.prototype);
