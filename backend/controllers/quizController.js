// backend/controllers/quizController.js

import Quiz from '../models/Quiz.js';
import Module from '../models/Module.js';
import Question from '../models/question.js';
import User from '../models/User.js';
import Result from '../models/Result.js';
import QuizAccess from '../models/QuizAccess.js';
import mongoose from 'mongoose';

// Shared eligibility check so the same rule is enforced everywhere a student
// interacts with a quiz (verify-passcode, fetch questions, submit).
const isStudentEligible = (quiz, student) => {
  return quiz.eligibilityCriteria.some(criteria => {
    const degreeMatch = criteria.degreeTitle === student.degreeTitle;
    const yearMatch = criteria.year === (student.academicYear || student.currentYear);
    const semesterMatch = criteria.semester === (student.semester || student.currentSemester);
    return degreeMatch && yearMatch && semesterMatch;
  });
};

// Helper function to calculate grade
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  else if (percentage >= 85) return 'A';
  else if (percentage >= 80) return 'A-';
  else if (percentage >= 75) return 'B+';
  else if (percentage >= 70) return 'B';
  else if (percentage >= 65) return 'B-';
  else if (percentage >= 60) return 'C+';
  else if (percentage >= 55) return 'C';
  else if (percentage >= 50) return 'C-';
  else if (percentage >= 45) return 'D+';
  else if (percentage >= 40) return 'D';
  else return 'F';
};

// ============================
// LECTURER ENDPOINTS
// ============================

export const getQuizzes = async (req, res) => {
  try {
    const { status, moduleCode } = req.query;
    const query = { createdBy: req.user._id, isActive: true };

    if (moduleCode) query.moduleCode = moduleCode;

    let quizzes = await Quiz.find(query)
      .populate('moduleId', 'moduleCode moduleName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Filter by status if requested
    if (status && status !== 'all') {
      quizzes = quizzes.filter(quiz => quiz.status === status);
    }

    res.json({
      success: true,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const {
      title,
      description,
      moduleId,
      startDateTime,
      endDateTime,
      duration,
      eligibilityCriteria,
      instructions,
      passcode,
      shuffleQuestions,
      showResultsImmediately,
      allowLateSubmission,
      maxAttempts
    } = req.body;

    // Validate module exists
    const module = await Module.findOne({
      _id: moduleId,
      createdBy: req.user._id,
      isActive: true
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Validate dates
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const now = new Date();

    if (start <= now) {
      return res.status(400).json({ 
        message: 'Start date must be in the future' 
      });
    }

    if (end <= start) {
      return res.status(400).json({ 
        message: 'End date must be after start date' 
      });
    }

    // Check if there are questions for this module
    const questionCount = await Question.countDocuments({
      moduleId: module._id,
      createdBy: req.user._id,
      isActive: true
    });

    if (questionCount === 0) {
      return res.status(400).json({ 
        message: 'No questions found for this module. Add questions before creating a quiz.' 
      });
    }

    const quizData = {
      title,
      description,
      moduleId,
      moduleCode: module.moduleCode,
      moduleYear: module.moduleYear,
      moduleSemester: module.moduleSemester,
      startDateTime: start,
      endDateTime: end,
      duration,
      eligibilityCriteria,
      instructions,
      passcode,
      questionCount,
      shuffleQuestions: shuffleQuestions || false,
      showResultsImmediately: showResultsImmediately || false,
      allowLateSubmission: allowLateSubmission || false,
      maxAttempts: maxAttempts || 1,
      status: 'scheduled',
      createdBy: req.user._id
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    await quiz.populate('moduleId', 'moduleCode moduleName');

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findOne({
      _id: id,
      createdBy: req.user._id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    const quizStart = new Date(quiz.startDateTime);
    const quizEnd = new Date(quiz.endDateTime);
    
    const isQuizActive = now >= quizStart && now <= quizEnd;
    const hasQuizEnded = now > quizEnd;
    
    if (hasQuizEnded) {
      return res.status(400).json({ 
        message: 'Cannot edit quiz that has already ended' 
      });
    }

    const updateData = { ...req.body };

    if (isQuizActive) {
      const allowedFields = ['endDateTime', 'allowLateSubmission', 'instructions'];
      const requestedFields = Object.keys(updateData);
      const invalidFields = requestedFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return res.status(400).json({ 
          message: `Quiz is currently active. Only these fields can be modified: ${allowedFields.join(', ')}`,
          allowedFields,
          invalidFields
        });
      }
    }

    if (updateData.endDateTime) {
      const newEndDate = new Date(updateData.endDateTime);
      if (isQuizActive && newEndDate <= now) {
        return res.status(400).json({ 
          message: 'New end date must be in the future for active quiz' 
        });
      }
    }

    Object.assign(quiz, updateData);
    quiz.updatedAt = new Date();
    await quiz.save();

    await quiz.populate('moduleId', 'moduleCode moduleName');

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      quiz,
      warning: isQuizActive ? 'Quiz is currently active. Limited fields were updated.' : null
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findOne({
      _id: id,
      createdBy: req.user._id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    const quizStart = new Date(quiz.startDateTime);
    const quizEnd = new Date(quiz.endDateTime);
    const isActive = now >= quizStart && now <= quizEnd;

    if (isActive) {
      quiz.status = 'cancelled';
      await quiz.save();
      
      res.json({
        success: true,
        message: 'Active quiz has been cancelled',
        warning: 'Quiz was active and has been cancelled instead of deleted'
      });
    } else {
      quiz.isActive = false;
      await quiz.save();
      
      res.json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    }
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findOne({
      _id: id,
      createdBy: req.user._id,
      isActive: true
    }).populate('moduleId', 'moduleCode moduleName');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuizEditability = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findOne({
      _id: id,
      createdBy: req.user._id,
      isActive: true
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    const start = new Date(quiz.startDateTime);
    const end = new Date(quiz.endDateTime);
    
    const isActive = now >= start && now <= end;
    const hasEnded = now > end;

    let editability;
    
    if (hasEnded || quiz.status === 'completed') {
      editability = {
        canEdit: false,
        canDelete: true,
        restrictions: ['Quiz has ended - editing disabled'],
        status: 'ended'
      };
    } else if (isActive) {
      editability = {
        canEdit: true,
        canDelete: true,
        restrictions: ['Only end time, late submission, and instructions can be modified'],
        status: 'active',
        allowedFields: ['endDateTime', 'allowLateSubmission', 'instructions']
      };
    } else {
      editability = {
        canEdit: true,
        canDelete: true,
        restrictions: [],
        status: 'scheduled'
      };
    }

    res.json({
      success: true,
      editability,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        startDateTime: quiz.startDateTime,
        endDateTime: quiz.endDateTime,
        status: quiz.status
      }
    });
  } catch (error) {
    console.error('Get quiz editability error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuizStats = async (req, res) => {
  try {
    const stats = await Quiz.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
        }
      }
    ]);

    const moduleStats = await Quiz.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: '$moduleCode',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalQuizzes: stats[0]?.totalQuizzes || 0,
        scheduled: stats[0]?.scheduled || 0,
        active: stats[0]?.active || 0,
        completed: stats[0]?.completed || 0,
        moduleStats
      }
    });
  } catch (error) {
    console.error('Get quiz stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================
// STUDENT ENDPOINTS
// ============================

export const getStudentQuizzes = async (req, res) => {
  try {
    const student = req.user;
    console.log('Getting quizzes for student:', student.email);

    const quizzes = await Quiz.find({
      isActive: true,
      status: { $in: ['scheduled', 'active'] },
      'eligibilityCriteria': {
        $elemMatch: {
          degreeTitle: student.degreeTitle,
          year: student.currentYear || student.academicYear,
          semester: student.currentSemester || student.semester
        }
      }
    })
    .populate('moduleId', 'moduleCode moduleName')
    .sort({ startDateTime: 1 });

    const availableQuizzes = quizzes.filter(quiz => {
      return quiz.status === 'scheduled' || quiz.status === 'active';
    });

    console.log(`Found ${availableQuizzes.length} available quizzes for student`);

    res.json({
      success: true,
      quizzes: availableQuizzes
    });
  } catch (error) {
    console.error('Get student quizzes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const verifyQuizPasscode = async (req, res) => {
  try {
    const { id } = req.params;
    const { passcode } = req.body;

    console.log('=== PASSCODE VERIFICATION ===');
    console.log('Quiz ID:', id);
    console.log('Provided passcode:', `"${passcode}"`);

    const quiz = await Quiz.findOne({ 
      _id: id, 
      isActive: true 
    }).populate('moduleId', 'moduleCode moduleName');

    console.log('Quiz found:', !!quiz);

    if (!quiz) {
      console.log('Quiz not found or inactive');
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log('Quiz details:', {
      title: quiz.title,
      passcode: `"${quiz.passcode}"`,
      status: quiz.status
    });

    if (quiz.status === 'cancelled') {
      return res.status(400).json({ message: 'This quiz has been cancelled by the instructor' });
    }

    const student = req.user;
    console.log('Student details:', {
      id: student._id,
      name: `${student.firstName} ${student.lastName}`,
      degreeTitle: student.degreeTitle,
      currentYear: student.currentYear,
      semester: student.currentSemester
    });

    const isEligible = quiz.eligibilityCriteria.some(criteria => {
      const degreeMatch = criteria.degreeTitle === student.degreeTitle;
      const yearMatch = criteria.year === (student.academicYear || student.currentYear);
      const semesterMatch = criteria.semester === (student.semester || student.currentSemester);
      
      return degreeMatch && yearMatch && semesterMatch;
    });

    if (!isEligible) {
      console.log('Student not eligible for quiz');
      return res.status(403).json({ message: 'You are not eligible for this quiz' });
    }

    const now = new Date();
    const quizStart = new Date(quiz.startDateTime);
    const quizEnd = new Date(quiz.endDateTime);
    const isCurrentlyActive = now >= quizStart && now <= quizEnd;

    console.log('Time check:', {
      now: now.toISOString(),
      start: quizStart.toISOString(),
      end: quizEnd.toISOString(),
      isCurrentlyActive
    });

    if (!isCurrentlyActive) {
      return res.status(400).json({ 
        message: quiz.status === 'scheduled' ? 'Quiz has not started yet' : 'Quiz has ended'
      });
    }

    const passcodeMatch = String(passcode).trim() === String(quiz.passcode).trim();
    console.log('Passcode comparison:', {
      provided: `"${String(passcode).trim()}"`,
      expected: `"${String(quiz.passcode).trim()}"`,
      match: passcodeMatch
    });

    if (!passcodeMatch) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    const existingResult = await Result.findOne({
      studentId: student._id,
      quizId: quiz._id
    });

    if (existingResult) {
      return res.status(400).json({ 
        message: 'You have already taken this quiz',
        result: {
          score: existingResult.score,
          totalMarks: existingResult.totalMarks,
          percentage: existingResult.percentage,
          grade: existingResult.grade
        }
      });
    }

    console.log('Passcode verification successful');

    // Record a server-side access grant so getQuizQuestions/submitQuiz can
    // confirm this student passed the passcode + eligibility gate. The grant
    // lasts for the student's allowed duration (plus a small buffer) but never
    // beyond the quiz end time.
    const grantBufferMs = 5 * 60 * 1000; // 5 minute buffer for clock skew / network
    const durationMs = (quiz.duration || 0) * 60 * 1000;
    const grantExpiry = new Date(Math.min(
      Date.now() + durationMs + grantBufferMs,
      quizEnd.getTime() + grantBufferMs
    ));
    await QuizAccess.findOneAndUpdate(
      { studentId: student._id, quizId: quiz._id },
      { studentId: student._id, quizId: quiz._id, expiresAt: grantExpiry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Passcode verified successfully',
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        moduleCode: quiz.moduleCode,
        duration: quiz.duration,
        startDateTime: quiz.startDateTime,
        endDateTime: quiz.endDateTime,
        instructions: quiz.instructions,
        questionCount: quiz.questionCount,
        shuffleQuestions: quiz.shuffleQuestions
      }
    });

  } catch (error) {
    console.error('=== PASSCODE VERIFICATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuizQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const student = req.user;

    console.log('=== GET QUIZ QUESTIONS ===');
    console.log('Quiz ID:', id);
    console.log('Student:', student.email);

    const quiz = await Quiz.findOne({ 
      _id: id, 
      isActive: true 
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const now = new Date();
    const quizStart = new Date(quiz.startDateTime);
    const quizEnd = new Date(quiz.endDateTime);
    const isCurrentlyActive = now >= quizStart && now <= quizEnd;

    if (!isCurrentlyActive) {
      return res.status(400).json({
        message: quiz.status === 'scheduled' ? 'Quiz has not started yet' : 'Quiz has ended'
      });
    }

    // Enforce eligibility server-side (not just in verify-passcode).
    if (!isStudentEligible(quiz, student)) {
      return res.status(403).json({ message: 'You are not eligible for this quiz' });
    }

    // Require a valid access grant proving this student passed the passcode gate.
    const accessGrant = await QuizAccess.findOne({
      studentId: student._id,
      quizId: quiz._id,
      expiresAt: { $gt: new Date() }
    });

    if (!accessGrant) {
      return res.status(403).json({ message: 'Passcode verification required before accessing this quiz' });
    }

    const existingResult = await Result.findOne({
      studentId: student._id,
      quizId: quiz._id
    });

    if (existingResult) {
      return res.status(400).json({
        message: 'You have already taken this quiz'
      });
    }

    let questions = await Question.find({
      moduleId: quiz.moduleId,
      isActive: true
    }).select('questionText type options image tags difficulty');

    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    const sanitizedQuestions = questions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      type: q.type,
      options: q.options?.map(opt => ({
        _id: opt._id,
        text: opt.text
      })),
      image: q.image,
      tags: q.tags,
      difficulty: q.difficulty
    }));

    console.log(`Returning ${sanitizedQuestions.length} questions for quiz`);

    res.json({
      success: true,
      questions: sanitizedQuestions
    });

  } catch (error) {
    console.error('Get quiz questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// FIXED: Submit Quiz with proper duration handling
export const submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, timeTaken, startTime } = req.body;

    console.log('=== QUIZ SUBMISSION START ===');
    console.log('Quiz ID:', id);
    console.log('Student:', req.user.email);
    console.log('Answers received:', answers?.length || 0);
    console.log('Time taken (ms):', timeTaken);
    console.log('Start time:', startTime);

    const quiz = await Quiz.findOne({ 
      _id: id, 
      isActive: true 
    }).populate('moduleId');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Enforce eligibility server-side (not just in verify-passcode).
    if (!isStudentEligible(quiz, req.user)) {
      return res.status(403).json({ message: 'You are not eligible for this quiz' });
    }

    // Require a valid access grant proving this student passed the passcode gate.
    const accessGrant = await QuizAccess.findOne({
      studentId: req.user._id,
      quizId: quiz._id,
      expiresAt: { $gt: new Date() }
    });

    if (!accessGrant) {
      return res.status(403).json({ message: 'Passcode verification required before submitting this quiz' });
    }

    // Check if student already submitted
    const existingResult = await Result.findOne({
      studentId: req.user._id,
      quizId: quiz._id
    });

    if (existingResult) {
      return res.status(400).json({ message: 'Quiz already submitted' });
    }

    // Validate submission timing
    const submissionTime = new Date();
    const quizStartTime = new Date(quiz.startDateTime);
    const quizEndTime = new Date(quiz.endDateTime);
    const studentStartTime = new Date(startTime);
    
    console.log('=== TIMING VALIDATION ===');
    console.log('Quiz start time:', quizStartTime.toISOString());
    console.log('Quiz end time:', quizEndTime.toISOString());
    console.log('Student start time:', studentStartTime.toISOString());
    console.log('Submission time:', submissionTime.toISOString());
    console.log('Quiz duration (minutes):', quiz.duration);

    // Check if submission is within quiz period
    if (submissionTime < quizStartTime || submissionTime > quizEndTime) {
      return res.status(400).json({ 
        message: 'Quiz submission outside allowed time period' 
      });
    }

    // Calculate maximum allowed time for this student
    const maxDurationMs = quiz.duration * 60 * 1000; // Convert minutes to milliseconds
    const studentQuizEndTime = new Date(Math.min(
      studentStartTime.getTime() + maxDurationMs,
      quizEndTime.getTime()
    ));

    console.log('Student quiz end time:', studentQuizEndTime.toISOString());
    console.log('Max duration (ms):', maxDurationMs);

    // Check if student exceeded their allowed time (with 30 second grace period)
    const graceTimeMs = 30 * 1000; // 30 seconds grace period
    if (submissionTime.getTime() > studentQuizEndTime.getTime() + graceTimeMs) {
      console.log('Submission time exceeded allowed duration');
      return res.status(400).json({ 
        message: 'Quiz submission time exceeded. Quiz has been auto-submitted.' 
      });
    }

    // Calculate actual time taken (more accurate)
    const actualTimeTaken = submissionTime.getTime() - studentStartTime.getTime();
    const timeTakenMinutes = Math.round(actualTimeTaken / 60000); // Convert to minutes

    console.log('Actual time taken (ms):', actualTimeTaken);
    console.log('Time taken (minutes):', timeTakenMinutes);

    // Get questions for grading
    const questions = await Question.find({
      moduleId: quiz.moduleId,
      isActive: true
    });

    const gradedAnswers = [];
    let totalScore = 0;
    let totalMarks = 0;
    let hasManualGradingQuestions = false;

    // Grade each answer
    for (const answerData of answers) {
      const question = questions.find(q => q._id.toString() === answerData.questionId);
      if (!question) {
        console.log('Question not found for ID:', answerData.questionId);
        continue;
      }
      const maxMarks = 1;
      let isCorrect = false;
      let marks = 0;
      // Auto-grade MCQ questions
      if (question.type === 'MCQ' && question.options) {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && answerData.answer === correctOption.text) {
          isCorrect = true;
          marks = maxMarks;
          totalScore += marks;
        }
        totalMarks += maxMarks;
      } else if (question.type === 'Structured' || question.type === 'Essay') {
        hasManualGradingQuestions = true;
        marks = 0;
      }
      gradedAnswers.push({
        questionId: question._id,
        questionText: question.questionText,
        questionType: question.type,
        studentAnswer: answerData.answer,
        correctAnswer: question.type === 'MCQ' ? 
          question.options?.find(opt => opt.isCorrect)?.text : 
          question.answer,
        isCorrect,
        marks,
        maxMarks
      });
    }

    // Check if all questions are MCQ (even if answers are empty)
    const allQuestionsAreMCQ = questions.length > 0 && questions.every(q => q.type === 'MCQ');
    const endTime = new Date();

    console.log('=== SCORE CALCULATION ===');
    console.log('Total score:', totalScore);
    console.log('Total marks:', totalMarks);
    console.log('Has manual grading questions:', hasManualGradingQuestions);
    console.log('All questions are MCQ:', allQuestionsAreMCQ);

    let resultData;
    let status = 'submitted';
    let percentage = 0;
    let grade = 'F';

    if (hasManualGradingQuestions) {
      status = 'pending_manual_review';
      percentage = 0;
      grade = 'F';
      console.log('Quiz requires manual grading - setting status to pending_manual_review');
    } else if (allQuestionsAreMCQ) {
      percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
      grade = calculateGrade(percentage);
      status = 'graded';
      console.log('MCQ-only quiz (even with empty answers) - setting status to graded:', grade);
    } else {
      // Fallback for other cases
      status = 'submitted';
      percentage = 0;
      grade = 'F';
    }

    resultData = {
      studentId: req.user._id,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
      studentEmail: req.user.email,
      quizId: quiz._id,
      quizTitle: quiz.title,
      moduleCode: quiz.moduleCode,
      moduleId: quiz.moduleId._id,
      lecturerId: quiz.createdBy,
      answers: gradedAnswers,
      score: totalScore,
      totalMarks: hasManualGradingQuestions ? 0 : totalMarks, // Set to 0 for manual review
      percentage,
      grade: grade,
      timeTaken: timeTakenMinutes, // Store in minutes
      startTime: studentStartTime,
      endTime,
      submissionType: 'normal',
      status: status
    };

    console.log('Creating result with grade:', grade);
    console.log('Creating result with status:', status);

    const result = new Result(resultData);
    
    console.log('About to save result...');
    await result.save();
    
    console.log('Result saved successfully with grade:', result.grade);
    console.log('Result saved successfully with status:', result.status);
    console.log('=== QUIZ SUBMISSION COMPLETE ===');

    // Send different responses based on grading type
    if (hasManualGradingQuestions) {
      res.json({
        success: true,
        requiresManualGrading: true,
        result: {
          score: totalScore,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          timeTaken: result.timeTaken,
          status: result.status
        },
        message: 'Quiz submitted successfully! Your quiz contains questions that require manual grading. Please wait for your lecturer to review your answers. You can check your results later in your student profile.'
      });
    } else {
      res.json({
        success: true,
        requiresManualGrading: false,
        result: {
          score: totalScore,
          totalMarks: result.totalMarks,
          percentage: result.percentage,
          grade: result.grade,
          timeTaken: result.timeTaken,
          status: result.status
        },
        message: 'Quiz submitted successfully! Your results are available immediately.'
      });
    }

  } catch (error) {
    console.error('=== SUBMIT QUIZ ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================
// ANALYTICS ENDPOINTS
// ============================

export const getAnalytics = async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const { moduleCode, moduleId, timeRange } = req.query;

    let dateFilter = {};
    if (timeRange && timeRange !== 'all') {
      let fromDate = null;
      if (typeof timeRange === 'string') {
        if (timeRange.endsWith('d')) {
          const days = parseInt(timeRange.replace('d', '')) || 0;
          fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        } else if (timeRange.endsWith('m')) {
          const months = parseInt(timeRange.replace('m', '')) || 0;
          const d = new Date();
          d.setMonth(d.getMonth() - months);
          fromDate = d;
        } else if (timeRange.endsWith('y')) {
          const years = parseInt(timeRange.replace('y', '')) || 0;
          const d = new Date();
          d.setFullYear(d.getFullYear() - years);
          fromDate = d;
        } else {
          const days = parseInt(timeRange) || 0;
          if (days > 0) fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        }
      }
      if (fromDate) {
        dateFilter = { createdAt: { $gte: fromDate } };
      }
    }

    const matchFilter = {
      lecturerId,
      ...dateFilter
    };

    // Apply module filter: if both are provided, match either; else match the one given
    const normalizedCode = (moduleCode || '').toString().trim();
    if (normalizedCode && normalizedCode !== 'all') {
      const escaped = normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matchFilter.moduleCode = { $regex: `^${escaped}$`, $options: 'i' };
    } else if (moduleId && moduleId !== 'all') {
      try {
        matchFilter.moduleId = new mongoose.Types.ObjectId(moduleId);
      } catch (e) {}
    }

    // Debug logging to verify filters applied (temporary)
    // Debug logging removed

    const [
      overallStats,
      modulePerformance,
      gradeDistribution,
      recentSubmissions,
      performanceTrends,
      topPerformers,
      questionAnalytics,
      scoreDistribution
    ] = await Promise.all([
      Result.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            correctAnswers: { $sum: { $sum: '$answers.isCorrect' } },
            totalQuestions: { $sum: { $size: '$answers' } },
            averageScore: { $avg: '$percentage' },
            highestScore: { $max: '$percentage' },
            lowestScore: { $min: '$percentage' },
            uniqueStudents: { $addToSet: '$studentId' }
          }
        },
        {
          $project: {
            totalSubmissions: 1,
            correctAnswers: 1,
            correctAnswerRate: {
              $cond: [
                { $eq: ['$totalQuestions', 0] },
                0,
                { $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] }
              ]
            },
            averageScore: { $round: ['$averageScore', 1] },
            highestScore: 1,
            lowestScore: 1,
            uniqueStudents: { $size: '$uniqueStudents' }
          }
        }
      ]),

      Result.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$moduleCode',
            submissions: { $sum: 1 },
            averageScore: { $avg: '$percentage' },
            correctAnswers: { $sum: { $sum: '$answers.isCorrect' } },
            totalQuestions: { $sum: { $size: '$answers' } }
          }
        },
        {
          $project: {
            moduleCode: '$_id',
            submissions: 1,
            averageScore: { $round: ['$averageScore', 1] },
            correctAnswerRate: {
              $cond: [
                { $eq: ['$totalQuestions', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] }, 1] }
              ]
            }
          }
        }
      ]),

      Result.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$grade',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            grade: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]),

      Result.find(matchFilter)
        .select('studentName percentage grade createdAt timeTaken answers')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      Result.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            submissions: { $sum: 1 },
            averageScore: { $avg: '$percentage' },
            correctAnswers: { $sum: { $sum: '$answers.isCorrect' } },
            totalQuestions: { $sum: { $size: '$answers' } }
          }
        },
        {
          $project: {
            date: '$_id',
            submissions: 1,
            averageScore: { $round: ['$averageScore', 1] },
            correctAnswerRate: {
              $cond: [
                { $eq: ['$totalQuestions', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] }, 1] }
              ]
            }
          }
        },
        { $sort: { date: 1 } }
      ]),

      Result.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$studentName',
            highestScore: { $max: '$percentage' },
            averageScore: { $avg: '$percentage' },
            totalSubmissions: { $sum: 1 }
          }
        },
        { $sort: { highestScore: -1 } },
        { $limit: 10 }
      ]),

      Result.aggregate([
        { $match: matchFilter },
        { $unwind: '$answers' },
        {
          $group: {
            _id: '$answers.questionId',
            questionText: { $first: '$answers.questionText' },
            questionType: { $first: '$answers.questionType' },
            attempts: { $sum: 1 },
            correctCount: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } }
          }
        },
        // Add lookup to verify question still exists and belongs to current user
        {
          $lookup: {
            from: 'questions',
            localField: '_id',
            foreignField: '_id',
            as: 'questionDetails'
          }
        },
        // Only include questions that still exist, are active, and belong to current user
        {
          $match: {
            'questionDetails.isActive': true,
            'questionDetails.createdBy': lecturerId  // Use the lecturerId from the analytics filter
          }
        },
        {
          $project: {
            questionId: '$_id', // Include the questionId for deletion
            questionText: 1,
            questionType: 1,
            attempts: 1,
            correctCount: 1,
            difficulty: { $arrayElemAt: ['$questionDetails.difficulty', 0] }, // Get difficulty from question details
            canDelete: true, // Flag indicating this question can be deleted
            successRate: {
              $cond: [
                { $eq: ['$attempts', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$correctCount', '$attempts'] }, 100] }, 1] }
              ]
            }
          }
        },
        { $sort: { successRate: 1 } },
        { $limit: 10 }
      ]),

      // Score distribution by percentage buckets (0-9, 10-19, ..., 90-100)
      Result.aggregate([
        { $match: matchFilter },
        {
          $project: {
            // Bucket percentages into tens; clamp to 0-90 so 100 goes into 90-100 bin
            bucket: {
              $let: {
                vars: {
                  raw: { $multiply: [{ $floor: { $divide: ['$percentage', 10] } }, 10] }
                },
                in: {
                  $cond: [
                    { $lt: ['$$raw', 0] }, 0,
                    { $cond: [ { $gt: ['$$raw', 90] }, 90, '$$raw' ] }
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: '$bucket',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            rangeStart: '$_id',
            rangeEnd: {
              $cond: [
                { $eq: ['$_id', 90] }, 100,
                { $add: ['$_id', 9] }
              ]
            },
            count: 1
          }
        },
        { $sort: { rangeStart: 1 } }
      ])
    ]);

    const enhancedRecentSubmissions = recentSubmissions.map(submission => {
      const answers = submission.answers || [];
      const mcqQuestions = answers.filter(ans => ans.questionType === 'MCQ');
      const structuredQuestions = answers.filter(ans => ans.questionType === 'Structured');
      const essayQuestions = answers.filter(ans => ans.questionType === 'Essay');
      
      const mcqCorrect = mcqQuestions.filter(ans => ans.isCorrect).length;
      const totalCorrect = answers.filter(ans => ans.isCorrect).length;
      
      return {
        ...submission,
        totalQuestions: answers.length,
        correctAnswers: totalCorrect,
        correctAnswerRate: answers.length > 0 ?
          Math.round((totalCorrect / answers.length) * 100) : 0,
        // Question type breakdown
        mcqCount: mcqQuestions.length,
        structuredCount: structuredQuestions.length,
        essayCount: essayQuestions.length,
        mcqCorrect: mcqCorrect,
        mcqRate: mcqQuestions.length > 0 ? Math.round((mcqCorrect / mcqQuestions.length) * 100) : 0
      };
    });

    res.json({
      success: true,
      analytics: {
        overallStats: {
          totalSubmissions: overallStats[0]?.totalSubmissions || 0,
          correctAnswers: overallStats[0]?.correctAnswers || 0,
          correctAnswerRate: overallStats[0]?.correctAnswerRate || 0,
          averageScore: overallStats[0]?.averageScore || 0,
          highestScore: overallStats[0]?.highestScore || 0,
          lowestScore: overallStats[0]?.lowestScore || 0,
          uniqueStudents: overallStats[0]?.uniqueStudents || 0
        },
        modulePerformance,
        gradeDistribution,
        recentSubmissions: enhancedRecentSubmissions,
        performanceTrends,
        topPerformers,
        questionAnalytics,
        scoreDistribution
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuizResults = async (req, res) => {
  try {
    const { id } = req.params;
    const lecturerId = req.user._id;

    console.log('Getting quiz results for quiz:', id, 'lecturer:', lecturerId);

    const results = await Result.find({ 
      quizId: id, 
      lecturerId 
    })
    .sort({ percentage: -1 })
    .select('studentName studentEmail percentage grade timeTaken createdAt submissionType answers')
    .lean();

    const enhancedResults = results.map(result => ({
      ...result,
      totalQuestions: result.answers?.length || 0,
      correctAnswers: result.answers?.filter(ans => ans.isCorrect).length || 0,
      correctAnswerRate: result.answers?.length > 0 ?
        Math.round((result.answers.filter(ans => ans.isCorrect).length / result.answers.length) * 100) : 0,
      answers: undefined
    }));

    console.log(`Found ${results.length} results for quiz ${id}`);

    res.json({
      success: true,
      results: enhancedResults
    });

  } catch (error) {
    console.error('Get quiz results error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};