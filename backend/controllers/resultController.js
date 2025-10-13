//backend\controllers\resultController.js

import Result from '../models/Result.js';

// Get all published results for the logged-in student
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Publish only:
    // - reviewed (finalized) submissions
    // - OR graded submissions that are MCQ-only (no Structured/Essay answers)
    const results = await Result.find({
      studentId,
      $or: [
        { status: 'reviewed' },
        {
          status: 'graded',
          'answers.questionType': { $nin: ['Structured', 'Essay'] }
        }
      ]
    })
      .populate('quizId', 'title moduleId')
      .populate('moduleId', 'moduleCode moduleName')
      .sort({ createdAt: -1 });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};