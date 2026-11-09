/**
 * Router — pemetaan action → handler + permission.
 *
 * Konvensi nama action: domain.verb (camelCase), contoh auth.login.
 * Route public: tidak butuh sesi.
 * Route lain: butuh sesi valid + permission (null = hanya butuh login).
 */

var Router = (function () {

  var PUBLIC = {
    'public.info':   Public.info,          // identitas + menu publik (status ON saja)
    'public.page':   Public.page,          // isi halaman publik per menu_key
  };

  var AUTH = {
    'auth.login':    null,                 // khusus: tidak butuh token, handled Auth.login
  };

  var PRIVATE = {
    'auth.logout':        { handler: Auth.logout,        permission: null },
    'auth.me':            { handler: Auth.me,            permission: null },

    'users.list':         { handler: Users.list,         permission: 'USER_MANAGE' },
    'users.create':       { handler: Users.create,       permission: 'USER_MANAGE' },
    'users.update':       { handler: Users.update,       permission: 'USER_MANAGE' },
    'users.resetPassword':{ handler: Users.resetPassword,permission: 'USER_MANAGE' },

    'roles.list':         { handler: Users.listRoles,    permission: 'USER_MANAGE' },
    'roles.assign':       { handler: Users.assignRole,   permission: 'USER_MANAGE' },
    'roles.revoke':       { handler: Users.revokeRole,   permission: 'USER_MANAGE' },

    'menu.list':          { handler: PublicMenu.list,    permission: null },
    'menu.setStatus':     { handler: PublicMenu.setStatus, permission: 'MENU_CONFIG' },

    'config.get':         { handler: Config.apiGet,      permission: 'SYSTEM_CONFIG' },
    'config.set':         { handler: Config.apiSet,      permission: 'SYSTEM_CONFIG' },

    'audit.list':         { handler: Audit.list,         permission: 'AUDIT_VIEW' },
  };

  function resolve(action) {
    if (Object.prototype.hasOwnProperty.call(PUBLIC, action)) {
      return { handler: PUBLIC[action], needsSession: false, permission: null };
    }
    if (action === 'auth.login') {
      return { handler: Auth.login, needsSession: false, permission: null };
    }
    if (Object.prototype.hasOwnProperty.call(PRIVATE, action)) {
      return { handler: PRIVATE[action].handler, needsSession: true, permission: PRIVATE[action].permission };
    }
    throw new AppError('UNKNOWN_ACTION', 'Action tidak dikenal: ' + action, 404);
  }

  return { resolve: resolve };
})();
