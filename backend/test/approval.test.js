import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createAuthenticate, authorize } from '../middleware/auth.js';
import { createApprovalHandlers } from '../controllers/approvalController.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
test('pending and rejected users cannot access protected APIs, including with an admin role', async () => {
  process.env.JWT_SECRET = 'unit-test-only-secret';
  for (const approvalStatus of ['pending', 'rejected']) {
    const user = { _id: 'pending', role: 'admin', isActive: true, approvalStatus };
    const users = { findById: () => ({ select: async () => user }) };
    const req = { header: () => `Bearer ${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}` };
    let nextCalled = false;
    const res = response();
    await createAuthenticate(false, users)(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
    const profile = response();
    await createAuthenticate(true, users)(req, profile, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    const admin = response();
    authorize('admin')({ user }, admin, () => assert.fail('Pending admin gained access'));
    assert.equal(admin.statusCode, 403);
  }
});

test('approved students and lecturers cannot perform admin approval', () => {
  for (const role of ['student', 'lecturer']) {
    const res = response();
    authorize('admin')({ user: { role, approvalStatus: 'approved' } }, res, () => assert.fail('Not admin'));
    assert.equal(res.statusCode, 403);
  }
});

test('approval validates student details, assigns chosen role and records approver atomically', async () => {
  const calls = [];
  const users = { async findOneAndUpdate(...args) {
    calls.push(args);
    return { toJSON: () => ({ ...args[1].$set }) };
  } };
  const handlers = createApprovalHandlers(users);
  const req = { user: { _id: 'admin-1' }, params: { id: 'new-user' }, body: { firstName: 'New', lastName: 'User', role: 'student' } };
  const invalid = response();
  await handlers.approve(req, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls.length, 0);
  Object.assign(req.body, { degreeTitle: 'COM-102', currentYear: 2, currentSemester: 1 });
  const valid = response();
  await handlers.approve(req, valid);
  assert.equal(valid.body.user.approvalStatus, 'approved');
  assert.equal(valid.body.user.approvedBy, 'admin-1');
  assert.equal(valid.body.user.role, 'student');
  assert.deepEqual(calls[0][0], { _id: 'new-user', approvalStatus: 'pending' });
});

test('self approval and duplicate approval are rejected', async () => {
  const handlers = createApprovalHandlers({ findOneAndUpdate: async () => null });
  const req = { user: { _id: 'same' }, params: { id: 'same' }, body: { firstName: 'New', lastName: 'User', role: 'admin' } };
  const self = response();
  await handlers.approve(req, self);
  assert.equal(self.statusCode, 403);
  req.params.id = 'different';
  const duplicate = response();
  await handlers.approve(req, duplicate);
  assert.equal(duplicate.statusCode, 409);
});
