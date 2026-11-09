/**
 * PublicMenu — pengelolaan status & navigasi menu publik.
 */

var PublicMenu = (function () {

  function list(ctx) {
    return Db.readAll('PUBLIC_MENU');
  }

  function setStatus(ctx) {
    var menuKey = String(ctx.payload.menu_key || '').trim();
    var status = String(ctx.payload.status || '').trim().toUpperCase();

    if (!menuKey) throw new AppError('VALIDATION', 'menu_key wajib diisi', 400);
    var validStatuses = ['ON', 'OFF_HIDDEN', 'OFF_MAINTENANCE'];
    if (validStatuses.indexOf(status) === -1) {
      throw new AppError('VALIDATION', 'status harus salah satu dari: ON, OFF_HIDDEN, OFF_MAINTENANCE', 400);
    }

    var menus = Db.readAll('PUBLIC_MENU');
    var target = null;
    menus.forEach(function (m) { if (m.menu_key === menuKey) target = m; });
    if (!target) throw new AppError('NOT_FOUND', 'Menu tidak ditemukan: ' + menuKey, 404);

    Db.write('PUBLIC_MENU', function () {
      return {
        update: [{
          _row: target._row,
          status: status,
          updated_at: Db.now(),
          updated_by: ctx.user.user_id,
        }],
      };
    });

    Audit.log(ctx, 'MENU_SET', 'SYSTEM', 'PUBLIC_MENU', target.menu_id, { menu_key: menuKey, status: status });
    return { menu_key: menuKey, status: status };
  }

  return { list: list, setStatus: setStatus };
})();
