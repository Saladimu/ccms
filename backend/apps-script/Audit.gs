/**
 * Audit — pencatatan audit log append-only.
 */

var Audit = (function () {

  function log(ctx, action, module, recordType, recordId, detail) {
    try {
      Db.write('AUDIT_LOG', function () {
        return {
          append: [{
            audit_id: Db.newId('AUD'),
            timestamp: Db.now(),
            session_id: ctx && ctx.user && ctx.user.session_id ? ctx.user.session_id : '',
            user_id: ctx && ctx.user ? ctx.user.user_id : '',
            username: ctx && ctx.user ? ctx.user.username : '',
            action: action,
            module: module,
            record_type: recordType || '',
            record_id: recordId || '',
            detail: detail ? JSON.stringify(detail) : '',
            ip_address: ctx ? ctx.ip : '',
          }],
        };
      });
    } catch (e) {
      Logger.log('Audit log failure: ' + e.message);
    }
  }

  function list(ctx) {
    var logs = Db.readAll('AUDIT_LOG');
    // Urutkan paling baru pertama (descending)
    logs.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    return logs.slice(0, 100); // Ambil 100 log terbaru
  }

  return { log: log, list: list };
})();
