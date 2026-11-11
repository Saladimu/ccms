const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

const repo = path.resolve(__dirname, '../../..');
const tables = {
  USERS: [], ROLES: [], USER_ROLES: [], PERMISSIONS: [],
  REVOKED_SESSIONS: [], LOGIN_ATTEMPTS: [], PUBLIC_MENU: [], CONFIG: [], AUDIT_LOG: []
};
const scriptProps = { SESSION_SECRET: 'sit-secret-not-for-production' };

function bytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return Buffer.from(value);
  return Buffer.from(String(value), 'utf8');
}
const Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA-256' },
  newBlob(value) {
    const b = bytes(value);
    return {
      getBytes: () => Array.from(b),
      getDataAsString: () => b.toString('utf8')
    };
  },
  computeDigest(_algorithm, value) {
    return Array.from(crypto.createHash('sha256').update(bytes(value)).digest());
  },
  computeHmacSha256Signature(value, key) {
    return Array.from(crypto.createHmac('sha256', bytes(key)).update(bytes(value)).digest());
  },
  base64EncodeWebSafe(value) {
    return bytes(value).toString('base64url');
  },
  base64DecodeWebSafe(value) {
    return Array.from(Buffer.from(value, 'base64url'));
  },
  getUuid() {
    return crypto.randomUUID();
  },
  formatDate(date) {
    return date.toISOString();
  }
};

function AppError(code, message, httpStatus) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.httpStatus = httpStatus || 400;
}
AppError.prototype = Object.create(Error.prototype);

const Db = {
  readAll(name) { return (tables[name] || []).map(row => ({ ...row })); },
  spreadsheet() { return { getSheetByName: name => name === 'REVOKED_SESSIONS' ? {} : null }; },
  write(name, callback) {
    const change = callback();
    if (change.append) tables[name].push(...change.append.map(row => ({ ...row })));
    if (change.update) {
      for (const update of change.update) {
        const row = tables[name].find(item => item._row === update._row);
        if (row) Object.assign(row, update);
      }
    }
    return change;
  },
  now() { return new Date().toISOString(); },
  newId(prefix) { return prefix + '-' + crypto.randomUUID(); }
};

const context = {
  Utilities,
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => scriptProps[key] || null
  }) },
  Db,
  AppError,
  Audit: { log() {}, list() { return [{ audit_id: 'AUD-1' }]; } },
  Config: {
    getNumber(_key, fallback) { return fallback; },
    get(_key, fallback) { return fallback === undefined ? '' : fallback; },
    getBool(_key, fallback) { return fallback; }
  },
  Logger: { log() {} },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput(text) {
      return { text, setMimeType() { return this; } };
    }
  },
  console,
  Date,
  JSON,
  Math,
  String,
  Number,
  Array,
  Object,
  Error,
  isFinite,
  parseInt
};
vm.createContext(context);

function load(relativePath) {
  const source = fs.readFileSync(path.join(repo, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}
load('backend/apps-script/Auth.gs');
load('backend/apps-script/Users.gs');
load('backend/apps-script/Public.gs');
load('backend/apps-script/PublicMenu.gs');
load('backend/apps-script/Router.gs');
load('backend/apps-script/Code.gs');

function signedToken({ sub = 'USR-1', role = 'PASTOR', exp, iat, alg = 'HS256', jti = 'SIT-SESSION' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub, username: 'sit.user', name: 'SIT User',
    iat: iat === undefined ? now : iat,
    exp: exp === undefined ? now + 3600 : exp,
    jti
  })).toString('base64url');
  const input = header + '.' + payload;
  const signature = crypto.createHmac('sha256', scriptProps.SESSION_SECRET).update(input).digest('base64url');
  return input + '.' + signature;
}

function setupRole(roleCode = 'PASTOR', userId = 'USR-1') {
  tables.USERS = [{ _row: 2, user_id: userId, username: 'sit.user', is_active: true }];
  tables.ROLES = [
    { role_id: 'R-1', role_code: 'PASTOR', is_active: true },
    { role_id: 'R-2', role_code: 'SUPER_ADMIN', is_active: true },
    { role_id: 'R-3', role_code: 'SECRETARY', is_active: true },
    { role_id: 'R-4', role_code: 'STAFF', is_active: true },
    { role_id: 'R-5', role_code: 'TREASURER', is_active: true },
    { role_id: 'R-6', role_code: 'COMMITTEE_HEAD', is_active: true }
  ];
  const role = tables.ROLES.find(r => r.role_code === roleCode);
  tables.USER_ROLES = [{ _row: 2, user_id: userId, role_id: role.role_id }];
  const stageOne = ['USER_MANAGE','SYSTEM_CONFIG','MENU_CONFIG','AUDIT_VIEW'];
  const all = [
    ...stageOne,
    'MEMBER_READ','MEMBER_CREATE','MEMBER_EDIT','MEMBER_ARCHIVE','REGISTRATION_REVIEW','IMPORT_RUN',
    'COMMITTEE_MANAGE','SCHEDULE_VIEW','SCHEDULE_MANAGE','FINANCE_READ','FINANCE_WRITE','FINANCE_VERIFY',
    'RECEIPT_VIEW','ANNOUNCE_DRAFT','ANNOUNCE_APPROVE','ANNOUNCE_PUBLISH','EVENT_MANAGE','REPORT_VIEW','AI_USE'
  ];
  tables.PERMISSIONS = all.map((permission_code, i) => ({
    permission_code,
    stage: stageOne.includes(permission_code) ? 1 : (permission_code === 'FINANCE_READ' || permission_code === 'AI_USE' ? 3 : 2),
    is_active: true
  }));
  tables.REVOKED_SESSIONS = [];
}

test('C-02 PBKDF2 output matches Node PBKDF2-HMAC-SHA256 test oracle', () => {
  const password = 'SITpassword123';
  const salt = 'a'.repeat(32);
  const encoded = context.Auth.hashPassword(password, salt, 10000);
  const parts = encoded.split('$');
  assert.equal(parts[0], 'pbkdf2-sha256');
  const expected = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 10000, 32, 'sha256').toString('hex');
  assert.equal(parts[3], expected);
  assert.equal(context.Auth.verifyPassword(password, encoded), true);
  assert.equal(context.Auth.verifyPassword('wrong-password', encoded), false);
});

test('C-02 legacy SHA256 hashes verify and are marked for upgrade', () => {
  const password = 'LegacyPass123';
  const salt = 'b'.repeat(32);
  let digest = Buffer.from(password + ':' + salt);
  for (let i = 0; i < 10000; i++) digest = crypto.createHash('sha256').update(digest).digest();
  const legacy = 'sha256$10000$' + salt + '$' + digest.toString('hex');
  assert.equal(context.Auth.verifyPassword(password, legacy), true);
  assert.equal(context.Auth.needsPasswordRehash(legacy), true);
  assert.equal(context.Auth.verifyPassword('wrong', legacy), false);
  assert.equal(context.Auth.verifyPassword(password, 'sha256$999999999$' + salt + '$00'), false);
});

test('C-01 role matrix grants only stage-1 permissions and follows official matrix', () => {
  const expected = {
    SUPER_ADMIN: ['USER_MANAGE','SYSTEM_CONFIG','MENU_CONFIG','AUDIT_VIEW'],
    PASTOR: ['AUDIT_VIEW'],
    SECRETARY: [],
    TREASURER: [],
    COMMITTEE_HEAD: [],
    STAFF: []
  };
  for (const role of Object.keys(expected)) {
    setupRole(role);
    const actual = context.Auth.getUserRolesAndPermissions('USR-1').permissions.sort();
    assert.deepEqual(Array.from(actual), expected[role].slice().sort(), role);
  }
});

test('C-03 rejects malformed, expired, bad-algorithm and invalid-signature tokens', () => {
  setupRole('PASTOR');
  const valid = signedToken();
  assert.throws(() => context.Auth.verifyToken('not.a.jwt'), e => e.code === 'UNAUTHORIZED');
  assert.throws(() => context.Auth.verifyToken(signedToken({ exp: Math.floor(Date.now()/1000)-1 })), e => e.code === 'UNAUTHORIZED');
  assert.throws(() => context.Auth.verifyToken(signedToken({ alg: 'none' })), e => e.code === 'UNAUTHORIZED');
  assert.throws(() => context.Auth.verifyToken(valid.slice(0, -2) + 'xx'), e => e.code === 'UNAUTHORIZED');
});

test('C-03 blocks inactive users and fails closed without SESSION_SECRET', () => {
  setupRole('PASTOR');
  const token = signedToken();
  tables.USERS[0].is_active = false;
  assert.throws(() => context.Auth.verifyToken(token), e => e.code === 'UNAUTHORIZED');
  tables.USERS[0].is_active = true;
  const old = scriptProps.SESSION_SECRET;
  delete scriptProps.SESSION_SECRET;
  assert.throws(() => context.Auth.verifyToken(token), e => e.httpStatus === 500);
  scriptProps.SESSION_SECRET = old;
});

test('C-04 logout revokes the session and prevents token reuse', () => {
  setupRole('PASTOR');
  const token = signedToken();
  const payload = context.Auth.verifyToken(token);
  context.Auth.logout({
    user: {
      user_id: payload.sub, username: payload.username,
      session_id: payload.jti,
      session_expires_at: new Date(payload.exp * 1000).toISOString()
    }
  });
  assert.equal(tables.REVOKED_SESSIONS.length, 1);
  assert.throws(() => context.Auth.verifyToken(token), e => e.code === 'UNAUTHORIZED');
});


test('C-05 authenticated password change clears first-login flag and revokes current session', () => {
  setupRole('SUPER_ADMIN');
  const oldPassword = 'InitialPass123';
  tables.USERS[0] = {
    _row: 2, user_id: 'USR-1', username: 'sit.user', full_name: 'SIT User',
    is_active: true, must_change_password: true,
    password_hash: context.Auth.hashPassword(oldPassword, 'd'.repeat(32), 10000),
    consecutive_failures: 0, locked_until: null
  };
  const token = signedToken();
  const response = context.doPost({ postData: { contents: JSON.stringify({
    action: 'auth.changePassword',
    payload: { current_password: oldPassword, new_password: 'ReplacementPass456' },
    meta: { token }
  }) } });
  const body = JSON.parse(response.text);
  assert.equal(body.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.must_change_password, false);
  assert.equal(tables.USERS[0].must_change_password, false);
  assert.equal(context.Auth.verifyPassword('ReplacementPass456', tables.USERS[0].password_hash), true);
  assert.equal(tables.REVOKED_SESSIONS.length, 1);
  assert.throws(() => context.Auth.verifyToken(token), e => e.code === 'UNAUTHORIZED');
});

test('C-05 password change rejects wrong current password and weak replacement', () => {
  setupRole('SUPER_ADMIN');
  tables.USERS[0] = {
    _row: 2, user_id: 'USR-1', username: 'sit.user', full_name: 'SIT User',
    is_active: true, must_change_password: true,
    password_hash: context.Auth.hashPassword('InitialPass123', 'e'.repeat(32), 10000),
    consecutive_failures: 0, locked_until: null
  };
  const token = signedToken();
  const wrongCurrent = context.doPost({ postData: { contents: JSON.stringify({
    action: 'auth.changePassword',
    payload: { current_password: 'WrongPass123', new_password: 'ReplacementPass456' },
    meta: { token }
  }) } });
  assert.equal(JSON.parse(wrongCurrent.text).status, 401);
  const weakNew = context.doPost({ postData: { contents: JSON.stringify({
    action: 'auth.changePassword',
    payload: { current_password: 'InitialPass123', new_password: 'short' },
    meta: { token }
  }) } });
  assert.equal(JSON.parse(weakNew.text).status, 400);
  assert.equal(tables.USERS[0].must_change_password, true);
  assert.equal(tables.REVOKED_SESSIONS.length, 0);
});

test('C-01 direct API authorization denies PASTOR user management but allows audit', () => {
  setupRole('PASTOR');
  const token = signedToken();
  const denied = context.doPost({ postData: { contents: JSON.stringify({
    action: 'users.list', payload: {}, meta: { token }
  }) } });
  assert.equal(JSON.parse(denied.text).status, 403);
  const allowed = context.doPost({ postData: { contents: JSON.stringify({
    action: 'audit.list', payload: {}, meta: { token }
  }) } });
  assert.equal(JSON.parse(allowed.text).status, 200);
});

test('C-01 private endpoint without token returns 401', () => {
  setupRole('PASTOR');
  const response = context.doPost({ postData: { contents: JSON.stringify({
    action: 'users.list', payload: {}, meta: {}
  }) } });
  assert.equal(JSON.parse(response.text).status, 401);
});

function post(action, role, extra = {}) {
  setupRole(role);
  const token = extra.token === undefined ? signedToken({ role }) : extra.token;
  return JSON.parse(context.doPost({ postData: { contents: JSON.stringify({
    action, payload: extra.payload || {}, meta: token ? { token } : {}
  }) } }).text);
}

test('C-01 direct API denies SECRETARY, TREASURER, COMMITTEE_HEAD and STAFF from users.list', () => {
  for (const role of ['SECRETARY', 'TREASURER', 'COMMITTEE_HEAD', 'STAFF']) {
    assert.equal(post('users.list', role).status, 403, role);
  }
});

test('C-01 SUPER_ADMIN can call stage-1 private routes', () => {
  assert.equal(post('users.list', 'SUPER_ADMIN').status, 200);
  assert.equal(post('audit.list', 'SUPER_ADMIN').status, 200);
  assert.equal(post('menu.list', 'SUPER_ADMIN').status, 200);
});

test('C-01 inactive permission is not granted even to SUPER_ADMIN', () => {
  setupRole('SUPER_ADMIN');
  tables.PERMISSIONS.find(p => p.permission_code === 'USER_MANAGE').is_active = false;
  const actual = context.Auth.getUserRolesAndPermissions('USR-1').permissions;
  assert.equal(actual.includes('USER_MANAGE'), false);
  const denied = JSON.parse(context.doPost({ postData: { contents: JSON.stringify({
    action: 'users.list', payload: {}, meta: { token: signedToken({ role: 'SUPER_ADMIN' }) }
  }) } }).text);
  assert.equal(denied.status, 403);
});

test('C-01 inactive role is ignored; no active role rejects the session', () => {
  setupRole('PASTOR');
  tables.ROLES.find(r => r.role_code === 'PASTOR').is_active = false;
  assert.throws(() => context.Auth.verifyToken(signedToken()), e => e.code === 'UNAUTHORIZED');
});

test('C-01 multi-role unions only active stage-1 grants', () => {
  setupRole('PASTOR');
  tables.USER_ROLES.push({ _row: 3, user_id: 'USR-1', role_id: 'R-3' });
  const actual = context.Auth.getUserRolesAndPermissions('USR-1');
  assert.deepEqual(Array.from(actual.roles).sort(), ['PASTOR', 'SECRETARY']);
  assert.deepEqual(Array.from(actual.permissions).sort(), ['AUDIT_VIEW']);
});

test('C-01 deleted USER_ROLES rows are ignored', () => {
  setupRole('PASTOR');
  tables.USER_ROLES.push({ _row: 3, user_id: 'USR-1', role_id: 'R-2', deleted: true });
  const actual = context.Auth.getUserRolesAndPermissions('USR-1');
  assert.deepEqual(Array.from(actual.roles), ['PASTOR']);
});

test('H-02 replaceRolesByCode replaces prior roles instead of appending', () => {
  setupRole('STAFF');
  tables.USERS.push({ _row: 3, user_id: 'USR-ADMIN', username: 'admin', is_active: true });
  tables.USER_ROLES.push({ _row: 3, user_id: 'USR-ADMIN', role_id: 'R-2' });
  context.Users.update({
    user: { user_id: 'USR-ADMIN' },
    payload: { user_id: 'USR-1', role_codes: ['PASTOR'] }
  });
  const remaining = tables.USER_ROLES.filter(r => r.user_id === 'USR-1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].role_id, 'R-1');
});

test('H-02 last Super Admin cannot be deactivated', () => {
  setupRole('SUPER_ADMIN');
  assert.throws(() => context.Users.update({
    user: { user_id: 'USR-1' },
    payload: { user_id: 'USR-1', is_active: false }
  }), e => e.code === 'CONFLICT');
});

test('C-05 public pages serve seven BRD menus and hide OFF_HIDDEN content', () => {
  tables.PUBLIC_MENU = [
    { menu_key: 'home', status: 'ON', sort_order: 1 },
    { menu_key: 'profile', status: 'ON', sort_order: 2 },
    { menu_key: 'schedule', status: 'ON', sort_order: 3 },
    { menu_key: 'announcements', status: 'ON', sort_order: 4 },
    { menu_key: 'events', status: 'ON', sort_order: 5 },
    { menu_key: 'ministries', status: 'ON', sort_order: 6 },
    { menu_key: 'contact', status: 'ON', sort_order: 7 }
  ];
  context.Config.get = (_key, fallback) => fallback || 'SIT';
  for (const key of ['home', 'profile', 'schedule', 'announcements', 'events', 'ministries', 'contact']) {
    const body = JSON.parse(context.doPost({ postData: { contents: JSON.stringify({
      action: 'public.page', payload: { menu_key: key }
    }) } }).text);
    assert.equal(body.status, 200, key);
    assert.equal(body.data.status, 'OK', key);
  }
  tables.PUBLIC_MENU.find(m => m.menu_key === 'schedule').status = 'OFF_HIDDEN';
  const hidden = JSON.parse(context.doPost({ postData: { contents: JSON.stringify({
    action: 'public.page', payload: { menu_key: 'schedule' }
  }) } }).text);
  assert.equal(hidden.status, 404);
  tables.PUBLIC_MENU.find(m => m.menu_key === 'events').status = 'OFF_MAINTENANCE';
  const maintenance = JSON.parse(context.doPost({ postData: { contents: JSON.stringify({
    action: 'public.page', payload: { menu_key: 'events' }
  }) } }).text);
  assert.equal(maintenance.status, 200);
  assert.equal(maintenance.data.status, 'MAINTENANCE');
});


test('C-02 successful legacy login upgrades stored password hash to PBKDF2', () => {
  setupRole('SUPER_ADMIN');
  const password = 'LegacyPass123';
  const salt = 'c'.repeat(32);
  let digest = Buffer.from(password + ':' + salt);
  for (let i = 0; i < 10000; i++) digest = crypto.createHash('sha256').update(digest).digest();
  tables.USERS[0] = {
    _row: 2, user_id: 'USR-1', username: 'sit.user', full_name: 'SIT User',
    is_active: true, password_hash: 'sha256$10000$' + salt + '$' + digest.toString('hex'),
    consecutive_failures: 0, locked_until: null
  };
  const result = context.Auth.login({
    payload: { username: 'sit.user', password },
    ip: '127.0.0.1',
    userAgent: 'SIT'
  });
  assert.ok(result.token);
  assert.match(tables.USERS[0].password_hash, /^pbkdf2-sha256\$/);
});
