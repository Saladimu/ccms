/**
 * Router — pemetaan action → handler + permission.
 * 
 * PERBAIKAN: Definisi route dibuat LAZY (di dalam fungsi resolve)
 * agar tidak bergantung pada urutan load file .gs di Apps Script.
 */

var Router = (function () {

  // Mapping string action -> { module: 'NamaModul', handler: 'namaFungsi', permission: 'KODE_PERM' }
  var ROUTE_MAP = {
    // Public (tanpa login)
    'public.info':   { module: 'Public',   handler: 'info',   permission: null, needsSession: false },
    'public.page':   { module: 'Public',   handler: 'page',   permission: null, needsSession: false },

    // Auth khusus
    'auth.login':    { module: 'Auth',     handler: 'login',  permission: null, needsSession: false },

    // Private (butuh session + permission)
    'auth.logout':        { module: 'Auth',     handler: 'logout',        permission: null, needsSession: true },
    'auth.me':            { module: 'Auth',     handler: 'me',            permission: null, needsSession: true },
    'auth.changePassword': { module: 'Auth',     handler: 'changePassword', permission: null, needsSession: true },

    'users.list':         { module: 'Users',    handler: 'list',          permission: 'USER_MANAGE', needsSession: true },
    'users.create':       { module: 'Users',    handler: 'create',        permission: 'USER_MANAGE', needsSession: true },
    'users.update':       { module: 'Users',    handler: 'update',        permission: 'USER_MANAGE', needsSession: true },
    'users.resetPassword':{ module: 'Users',    handler: 'resetPassword', permission: 'USER_MANAGE', needsSession: true },

    'roles.list':         { module: 'Users',    handler: 'listRoles',     permission: 'USER_MANAGE', needsSession: true },
    'roles.assign':       { module: 'Users',    handler: 'assignRole',    permission: 'USER_MANAGE', needsSession: true },
    'roles.revoke':       { module: 'Users',    handler: 'revokeRole',    permission: 'USER_MANAGE', needsSession: true },

    'menu.list':          { module: 'PublicMenu', handler: 'list',       permission: 'MENU_CONFIG', needsSession: true },
    'menu.setStatus':     { module: 'PublicMenu', handler: 'setStatus',  permission: 'MENU_CONFIG', needsSession: true },

    'config.get':         { module: 'Config',   handler: 'apiGet',       permission: 'SYSTEM_CONFIG', needsSession: true },
    'config.set':         { module: 'Config',   handler: 'apiSet',       permission: 'SYSTEM_CONFIG', needsSession: true },

    'audit.list':         { module: 'Audit',    handler: 'list',         permission: 'AUDIT_VIEW', needsSession: true },
  };

  function resolve(action) {
    var route = ROUTE_MAP[action];
    if (!route) {
      throw new AppError('UNKNOWN_ACTION', 'Action tidak dikenal: ' + action, 404);
    }

    // Resolve handler function dynamically from global scope at runtime
    var root = (typeof globalThis !== 'undefined') ? globalThis : this;
    var mod = root[route.module]; // module pada global scope Apps Script V8
    if (!mod || typeof mod[route.handler] !== 'function') {
      throw new AppError('INTERNAL_ERROR', 'Handler tidak ditemukan: ' + route.module + '.' + route.handler, 500);
    }

    return {
      handler: mod[route.handler],
      needsSession: route.needsSession,
      permission: route.permission,
    };
  }

  return { resolve: resolve };
})();