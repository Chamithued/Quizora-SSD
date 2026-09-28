import test, { before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import authRoutes from '../routes/authRoutes.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logoutSession } from '../../frontend/src/services/logoutSession.mjs';

// Real HTTP routes, JWT signatures, password comparison, and schema validation.
// Only database operations are replaced; no .env or real database is accessed.
const secret = 'test-only-secret-not-used-by-the-application';
const userId = '507f1f77bcf86cd799439011';
const password = 'Regression-Test-Password!';
let server, origin, user, sessions;
let failCreate, failRead, failDelete;
const original = {
  findOne: User.findOne, findById: User.findById,
  create: AuthSession.create, sessionFindOne: AuthSession.findOne,
  deleteOne: AuthSession.deleteOne
};
const oldSecret = process.env.JWT_SECRET;
const oldExpiry = process.env.JWT_EXPIRES_IN;

before(async () => {
  process.env.JWT_SECRET = secret;
  process.env.JWT_EXPIRES_IN = '1h';
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/api/users/stats', authenticate, authorize('admin'), (req, res) => {
    res.json({ success: true, stats: { total: 3 } });
  });
  server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    listening.on('error', reject);
  });
  origin = 'http://127.0.0.1:' + server.address().port;
});

beforeEach(async () => {
  sessions = new Map();
  failCreate = failRead = failDelete = false;
  user = new User({
    _id: userId, firstName: 'Test', lastName: 'Admin',
    email: 'admin@example.test', role: 'admin', isActive: true,
    password: await bcrypt.hash(password, 4)
  });
  user.save = async () => user;
  const query = value => Object.assign(Promise.resolve(value), {
    select: () => Promise.resolve(value)
  });
  User.findOne = ({ email }) => query(email === user.email ? user : null);
  User.findById = id => query(String(id) === userId ? user : null);
  AuthSession.create = async doc => {
    if (failCreate) throw new Error('Test storage unavailable');
    await new AuthSession(doc).validate();
    sessions.set(doc._id, { ...doc });
    return doc;
  };
  AuthSession.findOne = async filter => {
    if (failRead) throw new Error('Test storage unavailable');
    const doc = sessions.get(filter._id);
    return doc && String(doc.userId) === String(filter.userId) &&
      doc.expiresAt > filter.expiresAt.$gt ? doc : null;
  };
  AuthSession.deleteOne = async filter => {
    if (failDelete) throw new Error('Test storage unavailable');
    const doc = sessions.get(filter._id);
    const removed = doc && String(doc.userId) === String(filter.userId) ?
      sessions.delete(filter._id) : false;
    return { acknowledged: true, deletedCount: Number(removed) };
  };
});

afterEach(() => {
  User.findOne = original.findOne;
  User.findById = original.findById;
  AuthSession.create = original.create;
  AuthSession.findOne = original.sessionFindOne;
  AuthSession.deleteOne = original.deleteOne;
});
after(async () => {
  if (oldSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = oldSecret;
  if (oldExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
  else process.env.JWT_EXPIRES_IN = oldExpiry;
  if (server) await new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  });
});

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' })
    },
    ...(body && { body: JSON.stringify(body) })
  });
  return { status: response.status, body: await response.json() };
}
async function login() {
  const response = await request('/api/auth/login', {
    method: 'POST', body: { email: user.email, password }
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.password, undefined);
  return response.body.token;
}
const stats = token => request('/api/users/stats', { token });
const logout = token => request('/api/auth/logout', { method: 'POST', token });

test('F-01: logout rejects replay; no-token control fails; fresh login succeeds', async () => {
  const token = await login();
  assert.equal((await stats(token)).status, 200);
  assert.deepEqual(await logout(token), {
    status: 200, body: { success: true, message: 'Logged out successfully' }
  });
  assert.equal((await stats(token)).status, 401);
  assert.equal((await request('/api/auth/profile', { token })).status, 401);
  assert.equal((await logout(token)).status, 401);
  assert.equal((await stats()).status, 401);
  const fresh = await login();
  assert.notEqual(fresh, token);
  assert.equal((await stats(fresh)).status, 200);
});

test('rapid logins have independent sessions; logout revokes only the presented session', async () => {
  const first = await login();
  const second = await login();
  assert.notEqual(jwt.decode(first).jti, jwt.decode(second).jti);
  await logout(first);
  assert.equal((await stats(first)).status, 401);
  assert.equal((await stats(second)).status, 200);
});

test('pre-fix tokens and signed tokens without a stored session are rejected', async () => {
  const legacy = jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
  const unknown = jwt.sign({ id: userId }, secret, { expiresIn: '1h', jwtid: randomUUID() });
  assert.equal((await stats(legacy)).status, 401);
  assert.equal((await stats(unknown)).status, 401);
});

test('session lookup binds user identity and independently checks expiry', async () => {
  const token = await login();
  const record = sessions.get(jwt.decode(token).jti);
  record.userId = '507f1f77bcf86cd799439012';
  assert.equal((await stats(token)).status, 401);
  record.userId = userId;
  record.expiresAt = new Date(Date.now() - 1000);
  assert.equal((await stats(token)).status, 401);
});

test('expired, tampered, and wrong-algorithm tokens are rejected', async () => {
  const token = await login();
  const claims = jwt.decode(token);
  const expired = jwt.sign({ id: userId, jti: claims.jti }, secret, { expiresIn: -1 });
  const forged = jwt.sign({ id: userId, jti: claims.jti }, 'wrong-test-secret', { expiresIn: '1h' });
  const wrongAlgorithm = jwt.sign({ id: userId, jti: claims.jti }, secret, {
    algorithm: 'HS384', expiresIn: '1h'
  });
  for (const invalid of [expired, forged, wrongAlgorithm]) {
    assert.equal((await stats(invalid)).status, 401);
  }
});

test('inactive accounts and role restrictions still deny access', async () => {
  const token = await login();
  user.role = 'student';
  assert.equal((await stats(token)).status, 403);
  user.isActive = false;
  assert.equal((await request('/api/auth/profile', { token })).status, 401);
});

test('incorrect password cannot create a session', async () => {
  const result = await request('/api/auth/login', {
    method: 'POST', body: { email: user.email, password: 'incorrect' }
  });
  assert.equal(result.status, 401);
  assert.equal(sessions.size, 0);
});

test('session creation failure does not issue a token', async () => {
  failCreate = true;
  const result = await request('/api/auth/login', {
    method: 'POST', body: { email: user.email, password }
  });
  assert.equal(result.status, 500);
  assert.equal(result.body.token, undefined);
});

test('session storage failures deny access and do not claim successful logout', async () => {
  const token = await login();
  failRead = true;
  assert.equal((await stats(token)).status, 503);
  failRead = false;
  failDelete = true;
  const result = await logout(token);
  assert.equal(result.status, 503);
  assert.equal(result.body.success, undefined);
  assert.equal((await stats(token)).status, 200); // Failed logout did not revoke.
  failDelete = false;
  assert.equal((await logout(token)).status, 200);
  assert.equal((await stats(token)).status, 401);
});

test('browser logout waits for server revocation before clearing its token', async () => {
  const events = [];
  await logoutSession({
    post: async (path, body) => {
      assert.equal(path, '/auth/logout');
      assert.deepEqual(body, {});
      events.push('server-revoked');
    }
  }, {
    removeItem: key => { assert.equal(key, 'token'); events.push('token-cleared'); }
  }, () => events.push('state-cleared'));
  assert.deepEqual(events, ['server-revoked', 'token-cleared', 'state-cleared']);
});

test('browser logout retains token/state when revocation fails so it can be retried', async () => {
  const events = [];
  await assert.rejects(logoutSession({
    post: async () => { throw new Error('Network unavailable'); }
  }, { removeItem: () => events.push('cleared') }, () => events.push('logged-out')),
  /Network unavailable/);
  assert.deepEqual(events, []);
});
