import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as gradingController from '../controllers/gradingController.js';

const router = Router();

// All routes require authentication and lecturer authorization
router.use(authenticate);
router.use(authorize('lecturer'));

// Get grading statistics for dashboard
router.get('/stats', gradingController.getGradingStats);

// Debug endpoint to get all submissions for a lecturer
router.get('/all', gradingController.getAllSubmissionsForLecturer);

// Get all submissions requiring manual grading
router.get('/pending', gradingController.getPendingGradingSubmissions);

// Get all already graded submissions for review/re-grading
router.get('/graded', gradingController.getGradedSubmissions);

// Get all finalized (reviewed) submissions
router.get('/finalized', gradingController.getFinalizedSubmissions);

// Get detailed submission for grading (supports both pending and graded)
router.get('/submission/:submissionId', gradingController.getSubmissionForGrading);

// Update manual grades for a submission (supports both pending and graded)
router.put('/submission/:submissionId/grades', gradingController.updateManualGrades);

// Finalize grades for a submission (lock further edits)
router.post('/submission/:submissionId/finalize', gradingController.finalizeSubmission);

// Unfinalize grades for a submission (allow edits again)
router.post('/submission/:submissionId/unfinalize', gradingController.unfinalizeSubmission);

export default router;