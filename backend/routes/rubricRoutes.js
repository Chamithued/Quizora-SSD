import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as rubricController from '../controllers/rubricController.js';

const router = Router();

// All routes require authentication and lecturer authorization
router.use(authenticate);
router.use(authorize('lecturer'));

// Get all rubrics for the lecturer
router.get('/', rubricController.getRubrics);

// Debug endpoint to test authentication
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Rubrics API is working',
    user: req.user ? { id: req.user._id, role: req.user.role } : null,
    timestamp: new Date()
  });
});

// Get rubric templates
router.get('/templates', rubricController.getRubricTemplates);

// Get rubrics suitable for a specific question type
router.get('/question-type/:questionType', rubricController.getRubricsForQuestionType);

// Calculate rubric score
router.post('/calculate-score', rubricController.calculateRubricScore);

// Get a specific rubric by ID
router.get('/:id', rubricController.getRubricById);

// Create a new rubric
router.post('/', rubricController.createRubric);

// Update an existing rubric
router.put('/:id', rubricController.updateRubric);

// Delete a rubric (soft delete)
router.delete('/:id', rubricController.deleteRubric);

// Duplicate a rubric
router.post('/:id/duplicate', rubricController.duplicateRubric);

export default router;