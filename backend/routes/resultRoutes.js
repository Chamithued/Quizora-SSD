import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as resultController from '../controllers/resultController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student: Get all finalized results (graded/reviewed)
router.get('/student', authorize('student'), resultController.getStudentResults);

export default router;