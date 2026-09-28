import express from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUserStats,
  getDegreeOptions
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { approvals } from '../controllers/approvalController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get degree options (available to all authenticated users)
router.get('/degrees', getDegreeOptions);

// Admin only routes
router.get('/pending', authorize('admin'), approvals.pending);
router.post('/:id/approve', authorize('admin'), approvals.approve);
router.post('/:id/reject', authorize('admin'), approvals.reject);
router.get('/', authorize('admin'), getUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);
router.get('/stats', authorize('admin'), getUserStats);

export default router;
