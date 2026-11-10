/**
 * Users — manajemen akun internal (Super Admin), penugasan role, dan reset password.
 */

var Users = (function () {

  function list(ctx) {
    var users = Db.readAll('USERS');
    var userRoles = Db.readAll('USER_ROLES');
    var roles = Db.readAll('ROLES');

    var roleMap = {};
    roles.forEach(function (r) { roleMap[r.role_id] = r.role_code; });

    return users.map(function (u) {
      var myRoleIds = userRoles.filter(function (ur) { return ur.user_id === u.user_id; }).map(function (ur) { return ur.role_id; });
      var myRoleCodes = myRoleIds.map(function (rid) { return roleMap[rid]; }).filter(Boolean);

      return {
        user_id: u.user_id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        is_active: u.is_active === true || String(u.is_active).toUpperCase() === 'TRUE',
        must_change_password: u.must_change_password === true || String(u.must_change_password).toUpperCase() === 'TRUE',
        roles: myRoleCodes,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
      };
    });
  }

  function create(ctx) {
    var username = String(ctx.payload.username || '').trim().toLowerCase();
    var password = String(ctx.payload.password || '');
    var fullName = String(ctx.payload.full_name || '').trim();

    if (!username || username.length < 3) throw new AppError('VALIDATION', 'Username minimal 3 karakter', 400);
    if (!password || password.length < 8) throw new AppError('VALIDATION', 'Password minimal 8 karakter', 400);
    if (!fullName) throw new AppError('VALIDATION', 'Nama lengkap wajib diisi', 400);

    var existing = Db.readAll('USERS');
    existing.forEach(function (u) {
      if (String(u.username).toLowerCase() === username) {
        throw new AppError('DUPLICATE', 'Username sudah terpakai', 409);
      }
    });

    var userId = Db.newId('USR');
    var hash = Auth.hashPassword(password);
    var nowIso = Db.now();

    Db.write('USERS', function () {
      return {
        append: [{
          user_id: userId,
          username: username,
          password_hash: hash,
          full_name: fullName,
          email: ctx.payload.email || '',
          phone: ctx.payload.phone || '',
          is_active: true,
          must_change_password: true,
          consecutive_failures: 0,
          created_at: nowIso,
          created_by: ctx.user.user_id,
          updated_at: nowIso,
          updated_by: ctx.user.user_id,
        }],
      };
    });

    // Assign default role STAFF bila role_codes dikirim
    var roleCodes = ctx.payload.role_codes || ['STAFF'];
    assignRolesByCode(userId, roleCodes, ctx.user.user_id);

    Audit.log(ctx, 'CREATE', 'USER', 'USERS', userId, { username: username, roles: roleCodes });
    return { user_id: userId, username: username, full_name: fullName };
  }

  function update(ctx) {
    var userId = String(ctx.payload.user_id || '');
    if (!userId) throw new AppError('VALIDATION', 'user_id wajib diisi', 400);

    var users = Db.readAll('USERS');
    var target = null;
    users.forEach(function (u) { if (u.user_id === userId) target = u; });
    if (!target) throw new AppError('NOT_FOUND', 'User tidak ditemukan', 404);

    var nowIso = Db.now();
    var updateObj = { _row: target._row, updated_at: nowIso, updated_by: ctx.user.user_id };

    if (ctx.payload.full_name !== undefined) updateObj.full_name = String(ctx.payload.full_name).trim();
    if (ctx.payload.email !== undefined) updateObj.email = String(ctx.payload.email).trim();
    if (ctx.payload.phone !== undefined) updateObj.phone = String(ctx.payload.phone).trim();
    if (ctx.payload.is_active !== undefined) updateObj.is_active = ctx.payload.is_active === true || String(ctx.payload.is_active).toUpperCase() === 'TRUE';

    Db.write('USERS', function () { return { update: [updateObj] }; });

    if (Array.isArray(ctx.payload.role_codes)) {
      assignRolesByCode(userId, ctx.payload.role_codes, ctx.user.user_id);
    }

    Audit.log(ctx, 'UPDATE', 'USER', 'USERS', userId, { update: ctx.payload });
    return { updated: true };
  }

  function resetPassword(ctx) {
    var userId = String(ctx.payload.user_id || '');
    var newPassword = String(ctx.payload.new_password || '');
    if (!userId || !newPassword || newPassword.length < 8) {
      throw new AppError('VALIDATION', 'user_id dan new_password (min 8 char) wajib diisi', 400);
    }

    var users = Db.readAll('USERS');
    var target = null;
    users.forEach(function (u) { if (u.user_id === userId) target = u; });
    if (!target) throw new AppError('NOT_FOUND', 'User tidak ditemukan', 404);

    var hash = Auth.hashPassword(newPassword);
    var nowIso = Db.now();

    Db.write('USERS', function () {
      return {
        update: [{
          _row: target._row,
          password_hash: hash,
          must_change_password: true,
          consecutive_failures: 0,
          locked_until: null,
          updated_at: nowIso,
          updated_by: ctx.user.user_id,
        }],
      };
    });

    Audit.log(ctx, 'PASSWORD_RESET', 'USER', 'USERS', userId, { target_username: target.username });
    return { passwordReset: true };
  }

  function listRoles(ctx) {
    return Db.readAll('ROLES');
  }

  function assignRole(ctx) {
    var userId = ctx.payload.user_id;
    var roleCode = ctx.payload.role_code;
    assignRolesByCode(userId, [roleCode], ctx.user.user_id);
    Audit.log(ctx, 'ROLE_ASSIGN', 'USER', 'USER_ROLES', userId, { role_code: roleCode });
    return { assigned: true };
  }

  function revokeRole(ctx) {
    var userId = ctx.payload.user_id;
    var roleCode = ctx.payload.role_code;
    var roles = Db.readAll('ROLES');
    var roleId = null;
    roles.forEach(function (r) { if (r.role_code === roleCode) roleId = r.role_id; });
    if (!roleId) throw new AppError('NOT_FOUND', 'Role tidak ditemukan: ' + roleCode, 404);

    var userRoles = Db.readAll('USER_ROLES');
    var targetUr = null;
    userRoles.forEach(function (ur) { if (ur.user_id === userId && ur.role_id === roleId) targetUr = ur; });

    if (targetUr) {
      // Hapus baris dengan mengosongkan semua field (soft delete)
      Db.write('USER_ROLES', function () {
        return { 
          update: [{ 
            _row: targetUr._row, 
            user_role_id: '', 
            user_id: '', 
            role_id: '', 
            assigned_at: '', 
            assigned_by: '',
            deleted: true,
            deleted_at: Db.now(),
            deleted_by: ctx.user.user_id
          }] 
        };
      });
    }

    Audit.log(ctx, 'ROLE_REVOKE', 'USER', 'USER_ROLES', userId, { role_code: roleCode });
    return { revoked: true };
  }

  function assignRolesByCode(userId, roleCodes, assignedBy) {
    var roles = Db.readAll('ROLES');
    var roleMap = {};
    roles.forEach(function (r) { roleMap[r.role_code] = r.role_id; });

    var existingUr = Db.readAll('USER_ROLES').filter(function (ur) { return ur.user_id === userId; });
    var existingRoleIds = existingUr.map(function (ur) { return ur.role_id; });

    var newAppends = [];
    roleCodes.forEach(function (code) {
      var rid = roleMap[code];
      if (rid && existingRoleIds.indexOf(rid) === -1) {
        newAppends.push({
          user_role_id: Db.newId('UR'),
          user_id: userId,
          role_id: rid,
          assigned_at: Db.now(),
          assigned_by: assignedBy,
        });
      }
    });

    if (newAppends.length > 0) {
      Db.write('USER_ROLES', function () { return { append: newAppends }; });
    }
  }

  return {
    list: list,
    create: create,
    update: update,
    resetPassword: resetPassword,
    listRoles: listRoles,
    assignRole: assignRole,
    revokeRole: revokeRole,
  };
})();
