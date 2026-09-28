import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { createGoogleAuthHandlers, getGoogleConfig } from '../controllers/googleAuthController.js';
import User from '../models/User.js';

const cfg = {
  enabled: true, clientId: 'test-client', clientSecret: 'test-secret',
  redirectUri: 'http://localhost:5001/api/auth/google/callback',
  frontendOrigin: 'http://localhost:3000', secure: false
};
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
function response() {
  return {
    statusCode: 200, cookies: {}, headers: {},
    set(headers) { Object.assign(this.headers, headers); return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    cookie(name, value, options) { this.cookies[name] = { value, options }; return this; },
    clearCookie() { this.cleared = true; return this; },
    redirect(url) { this.url = url; return this; }
  };
}
const matches = (record, query) => Object.entries(query).every(([key, value]) => {
  if (value?.$gt) return record[key] > value.$gt;
  if (value && '$exists' in Object(value)) return (record[key] !== undefined) === value.$exists;
  return record[key] === value;
});

function fixture({ linked = true, claims = {}, invalidSignature = false, duplicate = false, newUser = false } = {}) {
  const records = new Map();
  let exists = !newUser;
  const user = {
    _id: 'user-1', isActive: true, role: 'lecturer', email: 'local@example.com',
    ...(linked ? { googleId: 'google-subject' } : {}),
    comparePassword: async password => password === 'correct-password',
    toJSON() { return { _id: this._id, role: this.role }; }
  };
  const transactions = {
    async create(record) { records.set(record._id, record); },
    async findOneAndDelete(query) {
      const record = records.get(query._id);
      if (!record || !matches(record, query)) return null;
      records.delete(query._id);
      return record;
    }
  };
  const users = {
    findOne(query) {
      const result = exists && matches(user, query) ? user : null;
      return { select: async () => result, then: resolve => Promise.resolve(result).then(resolve) };
    },
    async create(fields) { Object.assign(user, fields); exists = true; return user; },
    async findOneAndUpdate(query, update) {
      if (!matches(user, query)) return null;
      if (duplicate && update.$set.googleId) throw Object.assign(new Error('Duplicate'), { code: 11000 });
      Object.assign(user, update.$set);
      return user;
    }
  };
  let exchangeCount = 0;
  let expectedNonce;
  const clientFactory = () => {
    const client = new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
    const generate = client.generateAuthUrl.bind(client);
    client.generateAuthUrl = options => { expectedNonce = options.nonce; return generate(options); };
    client.getToken = async options => {
      exchangeCount++;
      assert.ok(options.codeVerifier.length >= 43);
      assert.equal(options.redirect_uri, cfg.redirectUri);
      const now = Math.floor(Date.now() / 1000);
      let token = jwt.sign({
        iss: 'https://accounts.google.com', aud: cfg.clientId, sub: 'google-subject',
        email: 'google@example.com', email_verified: true, nonce: expectedNonce, iat: now, exp: now + 3600, ...claims
      }, keys.privateKey, { algorithm: 'RS256', keyid: 'test-key' });
      if (invalidSignature) {
        const parts = token.split('.');
        const signature = Buffer.from(parts[2], 'base64url');
        signature[0] ^= 1;
        parts[2] = signature.toString('base64url');
        token = parts.join('.');
      }
      return { tokens: { id_token: token } };
    };
    // Use the real Google verifier with a local trusted test key; no network requests.
    client.getFederatedSignonCertsAsync = async () => ({ certs: { 'test-key': publicKey } });
    return client;
  };
  const handlers = createGoogleAuthHandlers({ users, transactions, clientFactory, config: () => cfg, issueToken: id => `jwt-for-${id}` });
  const request = (extra = {}) => ({ headers: { origin: cfg.frontendOrigin }, body: {}, ...extra });
  const begin = async (linking = false) => {
    const res = response();
    await handlers[linking === 'signup' ? 'signup' : linking ? 'link' : 'start'](request({ body: {
      email: user.email, password: 'correct-password', firstName: 'New', lastName: 'User', requestedRole: 'admin',
      approvalStatus: 'approved', role: 'admin'
    } }), res);
    return res;
  };
  const callback = async (start, query = {}) => {
    const res = response();
    await handlers.callback({
      headers: { cookie: `quizora_google=${start.cookies.quizora_google.value}` },
      query: { state: new URL(start.body.url).searchParams.get('state'), code: 'authorization-code', ...query }
    }, res);
    return res;
  };
  return { handlers, user, records, request, begin, callback, exchanges: () => exchangeCount };
}

test('code flow uses PKCE and nonce, preserves role, and completes only once', async () => {
  const f = fixture();
  const start = await f.begin();
  const url = new URL(start.body.url);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'openid email');
  assert.ok(url.searchParams.get('nonce'));
  assert.equal(start.cookies.quizora_google.options.httpOnly, true);
  const callback = await f.callback(start);
  assert.equal(callback.url, `${cfg.frontendOrigin}/login?google=complete`);
  const req = f.request({ headers: { origin: cfg.frontendOrigin, cookie: `quizora_google=${callback.cookies.quizora_google.value}` } });
  const done = response();
  await f.handlers.complete(req, done);
  assert.equal(done.body.token, 'jwt-for-user-1');
  assert.equal(done.body.user.role, 'lecturer');
  assert.equal(done.headers['Cache-Control'], 'no-store');
  const replay = response();
  await f.handlers.complete(req, replay);
  assert.equal(replay.statusCode, 401);
  assert.match((await f.callback(start)).url, /invalid_state$/);
  assert.equal(f.exchanges(), 1);
});

test('link requires password and stores stable subject without changing account role', async () => {
  const f = fixture({ linked: false });
  const denied = response();
  await f.handlers.link(f.request({ body: { email: f.user.email, password: 'wrong' } }), denied);
  assert.equal(denied.statusCode, 401);
  assert.equal(f.records.size, 0);
  const result = await f.callback(await f.begin(true));
  assert.match(result.url, /google=complete$/);
  assert.equal(f.user.googleId, 'google-subject');
  assert.equal(f.user.role, 'lecturer');
});

for (const [name, options] of Object.entries({
  'wrong audience': { claims: { aud: 'attacker-client' } },
  'wrong issuer': { claims: { iss: 'https://attacker.example' } },
  'expired token': { claims: { exp: Math.floor(Date.now() / 1000) - 600 } },
  'wrong nonce': { claims: { nonce: 'wrong' } },
  'unverified email': { claims: { email_verified: false } },
  'wrong authorized party': { claims: { azp: 'attacker-client' } },
  'missing subject': { claims: { sub: '' } },
  'invalid signature': { invalidSignature: true }
})) {
  test(`rejects ${name}`, async () => {
    const f = fixture(options);
    assert.match((await f.callback(await f.begin())).url, /google_error=failed$/);
    assert.equal(f.records.size, 0);
  });
}

test('rejects unlinked and inactive accounts; never auto-links matching email', async () => {
  const f = fixture({ linked: false, claims: { email: 'local@example.com' } });
  assert.match((await f.callback(await f.begin())).url, /not_linked$/);
  assert.equal(f.user.googleId, undefined);
  f.user.googleId = 'google-subject';
  f.user.isActive = false;
  assert.match((await f.callback(await f.begin())).url, /not_linked$/);
});

test('duplicate Google identity cannot be linked', async () => {
  const f = fixture({ linked: false, duplicate: true });
  assert.match((await f.callback(await f.begin(true))).url, /link_failed$/);
});

test('rejects wrong state, wrong browser, expired transactions, and handles denial', async () => {
  const f = fixture();
  const start = await f.begin();
  assert.match((await f.callback(start, { state: 'x'.repeat(43) })).url, /invalid_state$/);
  const wrongBrowser = { ...start, cookies: { quizora_google: { value: 'x'.repeat(43) } } };
  assert.match((await f.callback(wrongBrowser)).url, /invalid_state$/);
  for (const record of f.records.values()) record.expiresAt = new Date(0);
  assert.match((await f.callback(start)).url, /invalid_state$/);
  assert.match((await f.callback(await f.begin(), { error: 'access_denied' })).url, /cancelled$/);
  assert.equal(f.exchanges(), 0);
});

test('POST endpoints require configured frontend origin', async () => {
  const f = fixture();
  for (const action of ['start', 'signup', 'link', 'complete']) {
    const res = response();
    await f.handlers[action](f.request({ headers: { origin: 'https://attacker.example' } }), res);
    assert.equal(res.statusCode, 403);
  }
});

test('new Google signup is pending even when admin is requested; client approval fields are ignored', async () => {
  const f = fixture({ newUser: true });
  assert.match((await f.callback(await f.begin('signup'))).url, /google=complete$/);
  assert.equal(f.user.approvalStatus, 'pending');
  assert.equal(f.user.requestedRole, 'admin');
  assert.equal(f.user.role, 'student');
  assert.equal(f.user.authProvider, 'google');
});

test('repeat signup preserves rejected status and cannot self-approve', async () => {
  const f = fixture();
  f.user.approvalStatus = 'rejected';
  await f.callback(await f.begin('signup'));
  assert.equal(f.user.approvalStatus, 'rejected');
});

test('signup cannot take over an existing local email', async () => {
  const f = fixture({ linked: false, claims: { email: 'local@example.com' } });
  assert.match((await f.callback(await f.begin('signup'))).url, /existing_account$/);
  assert.equal(f.user.googleId, undefined);
});

test('pending Google users need no password or academic details; approved students require details', async () => {
  const user = new User({ firstName: 'New', lastName: 'Student', email: 'new@example.com',
    googleId: 'subject', authProvider: 'google', role: 'student', approvalStatus: 'pending' });
  await user.validate();
  user.approvalStatus = 'approved';
  await assert.rejects(user.validate(), /degreeTitle/);
});

test('deactivation before completion blocks session issuance', async () => {
  const f = fixture();
  const callback = await f.callback(await f.begin());
  f.user.isActive = false;
  const res = response();
  await f.handlers.complete(f.request({ headers: { origin: cfg.frontendOrigin, cookie: `quizora_google=${callback.cookies.quizora_google.value}` } }), res);
  assert.equal(res.statusCode, 401);
});

test('configuration disables missing credentials and requires HTTPS in production', () => {
  assert.equal(getGoogleConfig({}).enabled, false);
  assert.throws(() => getGoogleConfig({ NODE_ENV: 'production' }), /HTTPS/);
  assert.throws(() => getGoogleConfig({ GOOGLE_FRONTEND_URL: 'https://app.example/evil' }), /origin/);
});

test('Google identity has unique sparse index and is omitted from serialized users', () => {
  assert.ok(User.schema.indexes().some(([keys, options]) => keys.googleId === 1 && options.unique && options.sparse));
  const user = new User({ googleId: 'private-subject', password: 'secret' });
  assert.equal(user.toJSON().googleId, undefined);
  assert.equal(user.toJSON().password, undefined);
});
