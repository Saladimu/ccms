/**
 * Auth — otentikasi, pembuatan/verifikasi token JWT, lockout, dan hashing password.
 */

var Auth = (function () {

  // PBKDF2-HMAC-SHA256. Iterasi awal 120.000 sebagai baseline yang
  // wajib diuji pada Apps Script runtime sebelum rilis ke pengguna.
  var PBKDF2_ITERATIONS = 120000;
  var LEGACY_MAX_ITERATIONS = 100000;
  var PBKDF2_MAX_ITERATIONS = 300000;

  function hashPassword(password, saltHex, iterations) {
    saltHex = saltHex || generateSalt();
    iterations = iterations || PBKDF2_ITERATIONS;
    if (!/^[0-9a-f]{32,128}$/i.test(saltHex)) throw new AppError('AUTH_ERROR', 'Salt password tidak valid', 500);
    if (iterations < 10000 || iterations > PBKDF2_MAX_ITERATIONS) throw new AppError('AUTH_ERROR', 'Parameter KDF tidak valid', 500);
    var passwordBytes = Utilities.newBlob(String(password)).getBytes();
    var saltBytes = hexToBytes(saltHex);
    var block = saltBytes.concat([0, 0, 0, 1]);
    var u = Utilities.computeHmacSha256Signature(block, passwordBytes);
    var derived = u.slice();
    for (var i = 1; i < iterations; i++) {
      u = Utilities.computeHmacSha256Signature(u, passwordBytes);
      for (var j = 0; j < derived.length; j++) derived[j] = derived[j] ^ u[j];
    }
    return 'pbkdf2-sha256$' + iterations + '$' + saltHex.toLowerCase() + '$' + bytesToHex(derived);
  }

  function legacyHashPassword(password, saltHex, iterations) {
    var bytes = Utilities.newBlob(String(password) + ':' + saltHex).getBytes();
    for (var i = 0; i < iterations; i++) {
      bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    }
    return 'sha256$' + iterations + '$' + saltHex + '$' + bytesToHex(bytes);
  }

  function verifyPassword(password, storedHash) {
    try {
      if (typeof storedHash !== 'string') return false;
      var parts = storedHash.split('$');
      if (parts.length !== 4) return false;
      var iterations = Number(parts[1]);
      if (!Number.isInteger(iterations)) return false;
      var computed;
      if (parts[0] === 'pbkdf2-sha256') {
        if (iterations < 10000 || iterations > PBKDF2_MAX_ITERATIONS) return false;
        computed = hashPassword(password, parts[2], iterations);
      } else if (parts[0] === 'sha256') {
        if (iterations < 1 || iterations > LEGACY_MAX_ITERATIONS) return false;
        computed = legacyHashPassword(password, parts[2], iterations);
      } else return false;
      return constantTimeEqual(computed, storedHash);
    } catch (e) { return false; }
  }

  function needsPasswordRehash(storedHash) {
    return typeof storedHash === 'string' && storedHash.indexOf('sha256$') === 0;
  }

  function constantTimeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function hexToBytes(hex) {
    var out = [];
    for (var i = 0; i < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16));
    return out;
  }

  function generateSalt() {
    return Utilities.getUuid().replace(/-/g, '').toLowerCase();
  }

  function bytesToHex(bytes) {
    return bytes.map(function (b) {
      var h = (b < 0 ? b + 256 : b).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  }

  /** Sign token JWT HS256 sederhana. */
  function createToken(user, ttlMinutes) {
    var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
    if (!secret) throw new AppError('AUTH_ERROR', 'SESSION_SECRET belum dikonfigurasi', 500);

    var header = { alg: 'HS256', typ: 'JWT' };
    var nowSec = Math.floor(Date.now() / 1000);
    var expSec = nowSec + (ttlMinutes * 60);

    var payload = {
      sub: user.user_id,
      jti: Utilities.getUuid(),
      username: user.username,
      name: user.full_name,
      iat: nowSec,
      exp: expSec,
    };

    var b64Header = base64UrlEncode(JSON.stringify(header));
    var b64Payload = base64UrlEncode(JSON.stringify(payload));
    var toSign = b64Header + '.' + b64Payload;
    var signature = Utilities.computeHmacSha256Signature(toSign, secret);
    var b64Sig = base64UrlEncodeBytes(signature);

    return toSign + '.' + b64Sig;
  }

  /** Verifikasi token JWT. Return payload objek bila valid. */
  function verifyToken(token) {
    if (!token) throw new AppError('UNAUTHORIZED', 'Sesi tidak ditemukan. Silakan login.', 401);
    var secret = PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
    if (!secret) throw new AppError('AUTH_ERROR', 'SESSION_SECRET belum dikonfigurasi', 500);
    var parts = token.split('.');
    if (parts.length !== 3 || parts.some(function (part) { return !part; })) {
      throw new AppError('UNAUTHORIZED', 'Format token tidak valid', 401);
    }
    var header;
    var payload;
    try {
      header = JSON.parse(base64UrlDecode(parts[0]));
      payload = JSON.parse(base64UrlDecode(parts[1]));
    } catch (decodeError) {
      throw new AppError('UNAUTHORIZED', 'Token tidak valid', 401);
    }
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new AppError('UNAUTHORIZED', 'Algoritma token tidak diizinkan', 401);
    }
    var toSign = parts[0] + '.' + parts[1];
    var expectedSig = base64UrlEncodeBytes(Utilities.computeHmacSha256Signature(toSign, secret));
    if (!constantTimeEqual(expectedSig, parts[2])) {
      throw new AppError('UNAUTHORIZED', 'Token tidak valid / signature tidak cocok', 401);
    }
    var nowSec = Math.floor(Date.now() / 1000);
    if (!payload || typeof payload.sub !== 'string' || !payload.sub ||
        typeof payload.exp !== 'number' || typeof payload.iat !== 'number' ||
        payload.exp <= nowSec || payload.iat > nowSec + 60 ||
        payload.exp <= payload.iat || payload.exp - payload.iat > 86400) {
      throw new AppError('UNAUTHORIZED', 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', 401);
    }

    // BRD: akun yang dinonaktifkan tidak boleh meneruskan request privat,
    // termasuk bila token diterbitkan sebelum akun dinonaktifkan.
    var activeUser = null;
    Db.readAll('USERS').forEach(function (u) {
      if (String(u.user_id) === String(payload.sub)) activeUser = u;
    });
    if (!activeUser || !(activeUser.is_active === true || String(activeUser.is_active).toUpperCase() === 'TRUE')) {
      throw new AppError('UNAUTHORIZED', 'Akun tidak aktif atau tidak ditemukan.', 401);
    }
    var activeAccess = getUserRolesAndPermissions(payload.sub);
    if (!activeAccess.roles.length) {
      throw new AppError('UNAUTHORIZED', 'Akun tidak memiliki role aktif. Hubungi Super Admin.', 401);
    }

    // Logout revocation is enforced server-side. Legacy JWTs without jti are
    // assigned a deterministic ID from their signed token during transition.
    var sessionId = payload.jti || bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
    var revokedSheet = Db.spreadsheet().getSheetByName('REVOKED_SESSIONS');
    if (!revokedSheet) throw new AppError('DB_MIGRATION_REQUIRED', 'Database perlu migrasi REVOKED_SESSIONS sebelum autentikasi dapat digunakan.', 503);
    var revoked = Db.readAll('REVOKED_SESSIONS').some(function (row) {
      return String(row.session_id) === String(sessionId);
    });
    if (revoked) throw new AppError('UNAUTHORIZED', 'Sesi telah diakhiri. Silakan login kembali.', 401);
    payload.jti = sessionId;
    return payload;
  }

  function base64UrlEncode(str) {
    return Utilities.base64EncodeWebSafe(str).replace(/=+$/, '');
  }

  function base64UrlEncodeBytes(bytes) {
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
  }

  function base64UrlDecode(str) {
    var padded = str;
    while (padded.length % 4 !== 0) padded += '=';
    return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString();
  }

  /** Handler auth.login */
  function login(ctx) {
    var username = String(ctx.payload.username || '').trim().toLowerCase();
    var password = String(ctx.payload.password || '');

    if (!username || !password) {
      throw new AppError('BAD_CREDENTIALS', 'Username dan password wajib diisi', 400);
    }

    var users = Db.readAll('USERS');
    var user = null;
    users.forEach(function (u) { if (String(u.username).toLowerCase() === username) user = u; });

    var nowIso = Db.now();

    if (!user || user.is_active === false || String(user.is_active).toUpperCase() === 'FALSE') {
      recordAttempt(username, false, 'BAD_CREDENTIALS', ctx);
      throw new AppError('BAD_CREDENTIALS', 'Username atau password salah', 401);
    }

    // Cek Lockout
    if (user.locked_until) {
      var lockTime = new Date(user.locked_until).getTime();
      if (Date.now() < lockTime) {
        recordAttempt(username, false, 'LOCKED', ctx);
        throw new AppError('LOCKED', 'Akun diblokir sementara karena 3x gagal login. Coba lagi 5 menit.', 429);
      }
    }

    // Verifikasi Password
    var ok = verifyPassword(password, user.password_hash);
    var maxFail = Config.getNumber('LOGIN_MAX_ATTEMPTS', 3);
    var lockMins = Config.getNumber('LOGIN_LOCKOUT_MINUTES', 5);

    if (!ok) {
      var newFailures = (user.consecutive_failures || 0) + 1;
      var newLock = null;
      if (newFailures >= maxFail) {
        newLock = Utilities.formatDate(new Date(Date.now() + lockMins * 60 * 1000), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ssXXX");
      }

      Db.write('USERS', function () {
        return {
          update: [{
            _row: user._row,
            consecutive_failures: newFailures,
            locked_until: newLock,
            updated_at: nowIso,
          }],
        };
      });

      recordAttempt(username, false, 'BAD_CREDENTIALS', ctx);
      if (newLock) {
        throw new AppError('LOCKED', 'Akun diblokir 5 menit karena 3 kali berturut-turut gagal login.', 429);
      }
      throw new AppError('BAD_CREDENTIALS', 'Username atau password salah', 401);
    }

    // Login sukses: reset lockout dan upgrade hash legacy secara transparan.
    var successfulLoginUpdate = {
      _row: user._row,
      consecutive_failures: 0,
      locked_until: null,
      last_login_at: nowIso,
      updated_at: nowIso,
    };
    if (needsPasswordRehash(user.password_hash)) successfulLoginUpdate.password_hash = hashPassword(password);
    Db.write('USERS', function () { return { update: [successfulLoginUpdate] }; });

    recordAttempt(username, true, null, ctx);

    var ttl = Config.getNumber('SESSION_TTL_MINUTES', 480);
    var token = createToken(user, ttl);

    // Ambil roles & permissions
    var userRoles = getUserRolesAndPermissions(user.user_id);

    Audit.log(ctx, 'LOGIN', 'AUTH', 'USERS', user.user_id, { username: user.username });

    return {
      token: token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        must_change_password: user.must_change_password === true || String(user.must_change_password).toUpperCase() === 'TRUE',
        roles: userRoles.roles,
        permissions: userRoles.permissions,
      },
    };
  }

  function recordAttempt(username, success, reason, ctx) {
    Db.write('LOGIN_ATTEMPTS', function () {
      return {
        append: [{
          attempt_id: Db.newId('ATT'),
          timestamp: Db.now(),
          username: username,
          success: success,
          failure_reason: reason,
          ip_address: ctx.ip,
          user_agent: ctx.userAgent,
        }],
      };
    });
  }

  function getUserRolesAndPermissions(userId) {
    var ur = Db.readAll('USER_ROLES').filter(function (r) { return r.user_id === userId; });
    var roleIds = ur.map(function (r) { return r.role_id; });

    var roles = Db.readAll('ROLES').filter(function (r) { return roleIds.indexOf(r.role_id) !== -1 && (r.is_active === true || String(r.is_active).toUpperCase() === 'TRUE'); });
    var roleCodes = roles.map(function (r) { return r.role_code; });

    // Baseline resmi: docs/database/DATA_DICTIONARY_TAHAP1.md §10.
    // Permission future-stage tidak efektif sebelum stage implementasinya aktif.
    var ACTIVE_IMPLEMENTATION_STAGE = 1;
    var rolePermissionMatrix = {
      SUPER_ADMIN: ['USER_MANAGE', 'SYSTEM_CONFIG', 'MENU_CONFIG', 'AUDIT_VIEW',
        'MEMBER_READ', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_ARCHIVE', 'REGISTRATION_REVIEW', 'IMPORT_RUN',
        'COMMITTEE_MANAGE', 'SCHEDULE_VIEW', 'SCHEDULE_MANAGE',
        'FINANCE_READ', 'FINANCE_WRITE', 'FINANCE_VERIFY', 'RECEIPT_VIEW',
        'ANNOUNCE_DRAFT', 'ANNOUNCE_APPROVE', 'ANNOUNCE_PUBLISH', 'EVENT_MANAGE', 'REPORT_VIEW', 'AI_USE'],
      PASTOR: ['AUDIT_VIEW', 'MEMBER_READ', 'SCHEDULE_VIEW', 'FINANCE_READ',
        'ANNOUNCE_DRAFT', 'ANNOUNCE_APPROVE', 'ANNOUNCE_PUBLISH', 'REPORT_VIEW', 'AI_USE'],
      SECRETARY: ['MEMBER_READ', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_ARCHIVE',
        'REGISTRATION_REVIEW', 'IMPORT_RUN', 'SCHEDULE_VIEW', 'SCHEDULE_MANAGE',
        'RECEIPT_VIEW', 'ANNOUNCE_DRAFT', 'ANNOUNCE_PUBLISH', 'EVENT_MANAGE', 'REPORT_VIEW', 'AI_USE'],
      TREASURER: ['FINANCE_READ', 'FINANCE_WRITE', 'FINANCE_VERIFY', 'RECEIPT_VIEW', 'REPORT_VIEW', 'AI_USE'],
      COMMITTEE_HEAD: ['MEMBER_READ', 'COMMITTEE_MANAGE', 'SCHEDULE_VIEW', 'SCHEDULE_MANAGE',
        'ANNOUNCE_DRAFT', 'ANNOUNCE_PUBLISH', 'EVENT_MANAGE', 'REPORT_VIEW', 'AI_USE'],
      STAFF: ['SCHEDULE_VIEW'],
    };

    var allPerms = Db.readAll('PERMISSIONS').filter(function (p) {
      var active = p.is_active === true || String(p.is_active).toUpperCase() === 'TRUE';
      var stage = Number(p.stage || 1);
      return active && stage <= ACTIVE_IMPLEMENTATION_STAGE;
    });
    var activeCodes = allPerms.map(function (p) { return p.permission_code; });
    var permCodes = [];

    roleCodes.forEach(function (roleCode) {
      var grants = rolePermissionMatrix[roleCode] || [];
      grants.forEach(function (code) {
        if (activeCodes.indexOf(code) !== -1 && permCodes.indexOf(code) === -1) permCodes.push(code);
      });
    });

    return { roles: roleCodes, permissions: permCodes };
  }

  /** Handler auth.changePassword — wajib mengganti password awal / password sendiri. */
  function changePassword(ctx) {
    var currentPassword = String(ctx.payload.current_password || '');
    var newPassword = String(ctx.payload.new_password || '');
    if (!currentPassword || !newPassword) {
      throw new AppError('VALIDATION', 'Password lama dan password baru wajib diisi', 400);
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new AppError('VALIDATION', 'Password baru minimal 8 karakter dan wajib mengandung huruf serta angka', 400);
    }

    var users = Db.readAll('USERS');
    var target = null;
    users.forEach(function (u) {
      if (String(u.user_id) === String(ctx.user.user_id)) target = u;
    });
    if (!target) throw new AppError('NOT_FOUND', 'User tidak ditemukan', 404);
    if (!(target.is_active === true || String(target.is_active).toUpperCase() === 'TRUE')) {
      throw new AppError('UNAUTHORIZED', 'Akun tidak aktif.', 401);
    }
    if (!verifyPassword(currentPassword, target.password_hash)) {
      throw new AppError('BAD_CREDENTIALS', 'Password lama tidak sesuai', 401);
    }
    if (verifyPassword(newPassword, target.password_hash)) {
      throw new AppError('VALIDATION', 'Password baru harus berbeda dari password lama', 400);
    }

    var nowIso = Db.now();
    Db.write('USERS', function () {
      return {
        update: [{
          _row: target._row,
          password_hash: hashPassword(newPassword),
          must_change_password: false,
          consecutive_failures: 0,
          locked_until: null,
          updated_at: nowIso,
          updated_by: ctx.user.user_id,
        }],
      };
    });

    // Cabut sesi saat ini; pengguna harus login kembali dengan password baru.
    var sessionId = String(ctx.user.session_id || '');
    if (!sessionId) throw new AppError('UNAUTHORIZED', 'ID sesi tidak tersedia. Silakan login kembali.', 401);
    var alreadyRevoked = Db.readAll('REVOKED_SESSIONS').some(function (row) {
      return String(row.session_id) === sessionId;
    });
    if (!alreadyRevoked) {
      Db.write('REVOKED_SESSIONS', function () {
        return {
          append: [{
            session_id: sessionId,
            user_id: ctx.user.user_id,
            revoked_at: nowIso,
            expires_at: ctx.user.session_expires_at || '',
          }],
        };
      });
    }

    Audit.log(ctx, 'PASSWORD_CHANGE', 'AUTH', 'USERS', ctx.user.user_id, {
      username: ctx.user.username,
      must_change_password: false,
      session_revoked: true,
    });
    return { passwordChanged: true, must_change_password: false, reauthenticationRequired: true };
  }

  /** Handler auth.logout */
  function logout(ctx) {
    var sessionId = ctx.user.session_id;
    if (!sessionId) throw new AppError('UNAUTHORIZED', 'ID sesi tidak tersedia. Silakan login kembali.', 401);

    var existing = Db.readAll('REVOKED_SESSIONS').some(function (row) {
      return String(row.session_id) === String(sessionId);
    });
    if (!existing) {
      Db.write('REVOKED_SESSIONS', function () {
        return {
          append: [{
            session_id: sessionId,
            user_id: ctx.user.user_id,
            revoked_at: Db.now(),
            expires_at: ctx.user.session_expires_at || '',
          }],
        };
      });
    }
    Audit.log(ctx, 'LOGOUT', 'AUTH', 'USERS', ctx.user.user_id, { username: ctx.user.username, session_revoked: true });
    return { loggedOut: true };
  }

  /** Handler auth.me */
  function me(ctx) {
    var user = null;
    Db.readAll('USERS').forEach(function (u) { if (u.user_id === ctx.user.user_id) user = u; });
    if (!user) throw new AppError('NOT_FOUND', 'User tidak ditemukan', 404);
    var rp = getUserRolesAndPermissions(user.user_id);

    return {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      must_change_password: user.must_change_password === true || String(user.must_change_password).toUpperCase() === 'TRUE',
      roles: rp.roles,
      permissions: rp.permissions,
    };
  }

  return {
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    needsPasswordRehash: needsPasswordRehash,
    verifyToken: verifyToken,
    login: login,
    changePassword: changePassword,
    logout: logout,
    me: me,
    getUserRolesAndPermissions: getUserRolesAndPermissions,
  };
})();
