import Result from '../models/Result.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/question.js';
import User from '../models/User.js';

// Get all submissions requiring manual grading for a lecturer
export const getPendingGradingSubmissions = async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const { moduleCode, quizId, limit = 50, page = 1 } = req.query;

    // Build query filter
    const filter = {
      lecturerId,
      status: 'pending_manual_review'
    };

    if (moduleCode) {
      filter.moduleCode = moduleCode;
    }

    if (quizId) {
      filter.quizId = quizId;
    }

    // Get submissions with pagination
    const skip = (page - 1) * limit;
    const submissions = await Result.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('quizId', 'title description')
      .populate('moduleId', 'moduleCode moduleName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await Result.countDocuments(filter);

    // Group submissions by quiz for better organization
    const submissionsByQuiz = {};
    submissions.forEach(submission => {
      const quizId = submission.quizId._id.toString();
      if (!submissionsByQuiz[quizId]) {
        submissionsByQuiz[quizId] = {
          quiz: submission.quizId,
          module: submission.moduleId,
          submissions: []
        };
      }
      submissionsByQuiz[quizId].submissions.push({
        _id: submission._id,
        student: submission.studentId,
        studentName: submission.studentName,
        studentEmail: submission.studentEmail,
        timeTaken: submission.timeTaken,
        submittedAt: submission.createdAt,
        answersCount: submission.answers.length,
        structuredEssayCount: submission.answers.filter(ans => 
          ans.questionType === 'Structured' || ans.questionType === 'Essay'
        ).length
      });
    });

    res.json({
      success: true,
      data: {
        submissionsByQuiz,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get pending grading submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get detailed submission for grading (supports both pending and graded submissions)
export const getSubmissionForGrading = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const lecturerId = req.user._id;

    // Get the submission (allow both pending and graded status for re-grading)
    const submission = await Result.findOne({
      _id: submissionId,
      lecturerId,
      status: { $in: ['pending_manual_review', 'graded'] }
    })
    .populate('studentId', 'firstName lastName email')
    .populate('quizId', 'title description')
    .populate('moduleId', 'moduleCode moduleName');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Get the questions to show correct answers and question details
    const questionIds = submission.answers.map(ans => ans.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    // Create a map for easy lookup
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q._id.toString()] = q;
    });

    // Enhance answers with question details
    const enhancedAnswers = submission.answers.map(answer => {
      const question = questionMap[answer.questionId.toString()];
      return {
        ...answer.toObject(),
        questionDetails: question ? {
          _id: question._id,
          questionText: question.questionText,
          type: question.type,
          correctAnswer: question.answer,
          options: question.options,
          image: question.image,
          equations: question.equations
        } : null
      };
    });

    // Separate questions by type for better organization
    const mcqAnswers = enhancedAnswers.filter(ans => ans.questionType === 'MCQ');
    const structuredAnswers = enhancedAnswers.filter(ans => ans.questionType === 'Structured');
    const essayAnswers = enhancedAnswers.filter(ans => ans.questionType === 'Essay');

    res.json({
      success: true,
      data: {
        submission: {
          _id: submission._id,
          student: submission.studentId,
          quiz: submission.quizId,
          module: submission.moduleId,
          timeTaken: submission.timeTaken,
          submittedAt: submission.createdAt,
          status: submission.status
        },
        answers: {
          mcq: mcqAnswers,
          structured: structuredAnswers,
          essay: essayAnswers,
          total: enhancedAnswers.length
        }
      }
    });

  } catch (error) {
    console.error('Get submission for grading error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update manual grades for a submission
export const updateManualGrades = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { gradedAnswers } = req.body;
    const lecturerId = req.user._id;

    // Get the submission (allow both pending and graded status for re-grading)
    const submission = await Result.findOne({
      _id: submissionId,
      lecturerId,
      status: { $in: ['pending_manual_review', 'graded'] }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update the answers with manual grades
    let totalManualScore = 0;
    let totalManualMarks = 0;
    let mcqScore = 0;
    let mcqMarks = 0;

    submission.answers.forEach(answer => {
      const gradedAnswer = gradedAnswers.find(ga => 
        ga.questionId === answer.questionId.toString()
      );

      if (gradedAnswer && (answer.questionType === 'Structured' || answer.questionType === 'Essay')) {
        // Update manual grades
        answer.marks = gradedAnswer.marks || 0;
        answer.maxMarks = gradedAnswer.maxMarks || 1;
        
        // Add rubric scoring if provided
        if (gradedAnswer.rubricScoring) {
          answer.rubricScoring = gradedAnswer.rubricScoring;
        }
        
        totalManualScore += answer.marks;
        totalManualMarks += answer.maxMarks;
      } else if (answer.questionType === 'MCQ') {
        // Keep existing MCQ grades
        mcqScore += answer.marks || 0;
        mcqMarks += answer.maxMarks || 1;
      }
    });

    // Calculate final scores
    const finalScore = mcqScore + totalManualScore;
    const finalTotalMarks = mcqMarks + totalManualMarks;
    const finalPercentage = finalTotalMarks > 0 ? Math.round((finalScore / finalTotalMarks) * 100) : 0;

    // Update submission
    submission.score = finalScore;
    submission.totalMarks = finalTotalMarks;
    submission.percentage = finalPercentage;
    submission.status = 'graded';

    await submission.save();

    res.json({
      success: true,
      message: 'Grades updated successfully',
      data: {
        finalScore,
        finalTotalMarks,
        finalPercentage,
        grade: submission.grade,
        status: submission.status
      }
    });

  } catch (error) {
    console.error('Update manual grades error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get already graded submissions for review and re-grading
export const getGradedSubmissions = async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const { moduleCode, quizId, limit = 50, page = 1 } = req.query;

    // Build query filter for graded submissions
    const filter = {
      lecturerId,
      status: 'graded',
      // Only include submissions that have manual questions
      'answers.questionType': { $in: ['Structured', 'Essay'] }
    };

    if (moduleCode) {
      filter.moduleCode = moduleCode;
    }

    if (quizId) {
      filter.quizId = quizId;
    }

    // Get submissions with pagination
    const skip = (page - 1) * limit;
    const submissions = await Result.find(filter)
      .populate('studentId', 'firstName lastName email')
      .populate('quizId', 'title description')
      .populate('moduleId', 'moduleCode moduleName')
      .sort({ updatedAt: -1 }) // Sort by last modified
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await Result.countDocuments(filter);

    // Group submissions by quiz for better organization
    const submissionsByQuiz = {};
    submissions.forEach(submission => {
      const quizId = submission.quizId._id.toString();
      if (!submissionsByQuiz[quizId]) {
        submissionsByQuiz[quizId] = {
          quiz: submission.quizId,
          module: submission.moduleId,
          submissions: []
        };
      }
      submissionsByQuiz[quizId].submissions.push({
        _id: submission._id,
        studentName: submission.studentName,
        studentEmail: submission.studentEmail,
        score: submission.score,
        totalMarks: submission.totalMarks,
        percentage: submission.percentage,
        grade: submission.grade,
        submittedAt: submission.createdAt,
        gradedAt: submission.updatedAt,
        timeTaken: submission.timeTaken,
        // Count manual questions for display
        manualQuestions: submission.answers.filter(ans => 
          ans.questionType === 'Structured' || ans.questionType === 'Essay'
        ).length
      });
    });

    res.json({
      success: true,
      data: {
        submissionsByQuiz,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get graded submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get grading statistics for lecturer dashboard
export const getGradingStats = async (req, res) => {
  try {
    const lecturerId = req.user._id;

    // Get counts by status
    const stats = await Result.aggregate([
      { $match: { lecturerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    // Get recent pending submissions
    const recentPending = await Result.find({
      lecturerId,
      status: 'pending_manual_review'
    })
    .populate('studentId', 'firstName lastName')
    .populate('quizId', 'title')
    .populate('moduleId', 'moduleCode')
    .sort({ createdAt: -1 })
    .limit(5);

    // Get count of graded submissions with manual questions for review access
    const gradedManualCount = await Result.countDocuments({
      lecturerId,
      status: 'graded',
      'answers.questionType': { $in: ['Structured', 'Essay'] }
    });

    res.json({
      success: true,
      data: {
        pendingCount: statsMap.pending_manual_review || 0,
        gradedCount: statsMap.graded || 0,
        gradedManualCount: gradedManualCount, // New field for graded manual submissions
        submittedCount: statsMap.submitted || 0,
        reviewedCount: statsMap.reviewed || 0,
        recentPending: recentPending.map(sub => ({
          _id: sub._id,
          studentName: sub.studentName,
          quizTitle: sub.quizId?.title,
          moduleCode: sub.moduleId?.moduleCode,
          submittedAt: sub.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get grading stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};