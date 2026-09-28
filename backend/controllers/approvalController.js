import User from '../models/User.js';
import { DEGREE_OPTIONS } from './userController.js';

export function createApprovalHandlers(users = User) {
  return {
    async pending(req, res) {
      try {
        const pending = await users.find({ approvalStatus: 'pending' }).select('-password').sort({ createdAt: 1 }).limit(100);
        res.json({ users: pending });
      } catch {
        res.status(500).json({ message: 'Unable to load pending registrations.' });
      }
    },
    async approve(req, res) {
      const { role, firstName, lastName, degreeTitle, currentYear, currentSemester } = req.body || {};
      if (!['student', 'lecturer', 'admin'].includes(role) ||
          ![firstName, lastName].every(value => typeof value === 'string' && value.trim() && value.length <= 100)) {
        return res.status(400).json({ message: 'A valid role and full name are required.' });
      }
      if (role === 'student' && (!DEGREE_OPTIONS.some(degree => degree.code === degreeTitle) ||
          !Number.isInteger(currentYear) || currentYear < 1 || currentYear > 4 || ![1, 2].includes(currentSemester))) {
        return res.status(400).json({ message: 'Choose a valid degree, year and semester for this student.' });
      }
      if (String(req.user._id) === req.params.id) {
        return res.status(403).json({ message: 'You cannot approve your own registration.' });
      }
      try {
        const fields = {
          role, firstName: firstName.trim(), lastName: lastName.trim(), approvalStatus: 'approved',
          approvedBy: req.user._id, approvedAt: new Date()
        };
        if (role === 'student') Object.assign(fields, { degreeTitle, currentYear, currentSemester });
        const user = await users.findOneAndUpdate({ _id: req.params.id, approvalStatus: 'pending' },
          { $set: fields }, { new: true, runValidators: true });
        if (!user) return res.status(409).json({ message: 'This registration is no longer pending.' });
        return res.json({ success: true, user: user.toJSON() });
      } catch {
        return res.status(400).json({ message: 'Unable to approve this registration.' });
      }
    },
    async reject(req, res) {
      try {
        const user = await users.findOneAndUpdate({ _id: req.params.id, approvalStatus: 'pending' },
          { $set: { approvalStatus: 'rejected' } }, { new: true });
        if (!user) return res.status(409).json({ message: 'This registration is no longer pending.' });
        res.json({ success: true });
      } catch {
        res.status(400).json({ message: 'Unable to reject this registration.' });
      }
    }
  };
}

export const approvals = createApprovalHandlers();
