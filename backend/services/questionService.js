import Question from '../models/question.js';
import { createSearchRegex } from '../utils/searchRegex.js';

// Create a new question (lecturer only)
export const createQuestion = async (data, lecturerId) => {
  const questionData = {
    ...data,
    createdBy: lecturerId
  };
  
  const question = new Question(questionData);
  return await question.save();
};

// Get all questions for a specific lecturer
export const getQuestionsByLecturer = async (lecturerId, filters = {}) => {
  const query = { createdBy: lecturerId, isActive: true };
  
  // Apply filters
  if (filters.moduleCode) query.moduleCode = filters.moduleCode;
  if (filters.moduleYear) query.moduleYear = parseInt(filters.moduleYear);
  if (filters.moduleSemester) query.moduleSemester = parseInt(filters.moduleSemester);
  if (filters.type) query.type = filters.type;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  
  // Search in question text and tags
  const searchRegex = createSearchRegex(filters.search);
  if (searchRegex) {
    query.$or = [
      { questionText: { $regex: searchRegex } },
      { tags: { $in: [searchRegex] } }
    ];
  }
  
  return await Question.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Get a single question (with access control)
export const getQuestionById = async (questionId, lecturerId) => {
  const question = await Question.findOne({ 
    _id: questionId, 
    createdBy: lecturerId,
    isActive: true 
  }).populate('createdBy', 'firstName lastName');
  
  return question;
};

// Update a question (lecturer can only update their own)
export const updateQuestion = async (questionId, updateData, lecturerId) => {
  const question = await Question.findOneAndUpdate(
    { _id: questionId, createdBy: lecturerId },
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  return question;
};

// Soft delete a question
export const deleteQuestion = async (questionId, lecturerId) => {
  const question = await Question.findOneAndUpdate(
    { _id: questionId, createdBy: lecturerId },
    { isActive: false },
    { new: true }
  );
  
  return question;
};

// Get lecturer's module statistics
export const getLecturerQuestionStats = async (lecturerId) => {
  const stats = await Question.aggregate([
    { $match: { createdBy: lecturerId, isActive: true } },
    {
      $group: {
        _id: {
          moduleCode: '$moduleCode',
          moduleYear: '$moduleYear',
          moduleSemester: '$moduleSemester'
        },
        totalQuestions: { $sum: 1 },
        mcqCount: { $sum: { $cond: [{ $eq: ['$type', 'MCQ'] }, 1, 0] } },
        structuredCount: { $sum: { $cond: [{ $eq: ['$type', 'Structured'] }, 1, 0] } },
        essayCount: { $sum: { $cond: [{ $eq: ['$type', 'Essay'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.moduleCode': 1, '_id.moduleYear': 1, '_id.moduleSemester': 1 } }
  ]);
  
  const totalQuestions = await Question.countDocuments({ 
    createdBy: lecturerId, 
    isActive: true 
  });
  
  return { moduleStats: stats, totalQuestions };
};

// Get unique module codes for a lecturer
export const getLecturerModules = async (lecturerId) => {
  const modules = await Question.distinct('moduleCode', { 
    createdBy: lecturerId, 
    isActive: true 
  });
  
  return modules.sort();
};
