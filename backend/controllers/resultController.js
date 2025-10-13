import Result from '../models/Result.js';

// Get all finalized results for the logged-in student
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Only show results that are finalized (graded or reviewed)
    const results = await Result.find({
      studentId,
      status: { $in: ['graded', 'reviewed'] }
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