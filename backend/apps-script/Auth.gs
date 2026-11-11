/**
 * Auth — otentikasi, pembuatan/verifikasi token JWT, lockout, dan hashing password.
 */

var Auth = (function () {

  /** Iterasi default hashing (PBKDF2-like SHA-256). */
  var DEFAULT_ITERATIONS = 50000;

  /** Hash password dengan salt hex. Format: sha256$<iterasi>$<salt-hex>$<hash-hex> */
  function hashPassword(password, saltHex, iterations) {
    iterations = iterations || DEFAULT_ITERATIONS;
    saltHex = saltHex || generateSalt();
    var text = password + ':' + saltHex;
    var bytes = Utilities.newBlob(text).getBytes();
    for (var i = 0; i < iterations; i++) {
      bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
    }
    var hashHex = bytesToHex(bytes);
    return 'sha256$' + iterations + '$' + saltHex + '$' + hashHex;
  }

  function verifyPassword(password, storedHash) {
    var parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'sha256') return false;
    var iterations = parseInt(parts[1], 10);
    var saltHex = parts[2];
    var computed = hashPassword(password, saltHex, iterations);
    return computed === storedHash;
  }

  function generateSalt() {
    var bytes = [];
    for (var i = 0; i < 16; i++) {
      bytes.push(Math.floor(Math.random() * 256) - 128);
    }
    return bytesToHex(bytes);
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
    if (parts.length !== 3) throw new AppError('UNAUTHORIZED', 'Format token tidak valid', 401);

    var toSign = parts[0] + '.' + parts[1];
    var expectedSig = base64UrlEncodeBytes(Utilities.computeHmacSha256Signature(toSign, secret));
    if (expectedSig !== parts[2]) throw new AppError('UNAUTHORIZED', 'Token tidak valid / signature tidak cocok', 401);

    var payloadStr = base64UrlDecode(parts[1]);
    var payload = JSON.parse(payloadStr);

    var nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) {
      throw new AppError('UNAUTHORIZED', 'Sesi telah berakhir. Silakan login kembali.', 401);
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

    // Login Sukses -> Reset failures & lock
    Db.write('USERS', function () {
      return {
        update: [{
          _row: user._row,
          consecutive_failures: 0,
          locked_until: null,
          last_login_at: nowIso,
          updated_at: nowIso,
        }],
      };
    });

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
      PASTOR: ['AUDIT_VIEW', 'SCHEDULE_VIEW', 'FINANCE_READ', 'ANNOUNCE_DRAFT', 'ANNOUNCE_APPROVE', 'ANNOUNCE_PUBLISH', 'REPORT_VIEW', 'AI_USE'],
      SECRETARY: ['MEMBER_READ', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_ARCHIVE', 'REGISTRATION_REVIEW', 'IMPORT_RUN', 'SCHEDULE_VIEW', 'RECEIPT_VIEW', 'ANNOUNCE_DRAFT', 'ANNOUNCE_PUBLISH', 'EVENT_MANAGE', 'REPORT_VIEW', 'AI_USE'],
      TREASURER: ['FINANCE_READ', 'FINANCE_WRITE', 'FINANCE_VERIFY', 'RECEIPT_VIEW', 'REPORT_VIEW', 'AI_USE'],
      COMMITTEE_HEAD: ['MEMBER_READ', 'COMMITTEE_MANAGE', 'SCHEDULE_VIEW', 'SCHEDULE_MANAGE', 'ANNOUNCE_DRAFT', 'ANNOUNCE_PUBLISH', 'EVENT_MANAGE', 'REPORT_VIEW', 'AI_USE'],
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

  /** Handler auth.logout */
  function logout(ctx) {
    Audit.log(ctx, 'LOGOUT', 'AUTH', 'USERS', ctx.user.user_id, { username: ctx.user.username });
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
    verifyToken: verifyToken,
    login: login,
    logout: logout,
    me: me,
    getUserRolesAndPermissions: getUserRolesAndPermissions,
  };
})();
