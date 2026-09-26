import Question from '../models/question.js';
import Module from '../models/Module.js';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.resolve('uploads');

const getUploadPath = (filename) => {
  if (typeof filename !== 'string' || !filename ||
      filename !== path.basename(filename) ||
      filename.includes('..') || filename.includes('\\') ||
      !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)) {
    throw new Error('Invalid image filename');
  }

  const filePath = path.resolve(uploadsDir, path.basename(filename));
  if (path.dirname(filePath) !== uploadsDir) {
    throw new Error('Image path is outside uploads directory');
  }
  return filePath;
};

const deleteUpload = async (filename) => {
  const filePath = getUploadPath(filename);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

export const createQuestion = async (req, res) => {
  try {
    const { 
      type, 
      questionText, 
      moduleId,
      moduleCode,
      moduleYear,
      moduleSemester,
      difficulty = 'Medium',
      tags,
      options,
      answer,
      equations
    } = req.body;

    // Validate required fields
    if (!type || !questionText || !moduleId) {
      return res.status(400).json({ message: 'Question type, text, and module are required' });
    }

    // Verify module exists and belongs to the lecturer
    const module = await Module.findOne({ 
      _id: moduleId, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found or access denied' });
    }

    const questionData = {
      type,
      questionText: questionText.trim(),
      moduleId: module._id,
      moduleCode: module.moduleCode,
      moduleYear: module.moduleYear,
      moduleSemester: module.moduleSemester,
      difficulty,
      createdBy: req.user._id
    };

    // Handle image upload
    if (req.file) {
      questionData.image = req.file.filename;
    }

    // Handle tags
    if (tags) {
      try {
        questionData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        questionData.tags = [];
      }
    }

    // Handle equations
    if (equations) {
      try {
        questionData.equations = typeof equations === 'string' ? JSON.parse(equations) : equations;
      } catch (e) {
        questionData.equations = [];
      }
    }

    // Handle MCQ options or structured/essay answer
    if (type === 'MCQ') {
      if (!options) {
        return res.status(400).json({ message: 'MCQ options are required' });
      }
      try {
        const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
        if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
          return res.status(400).json({ message: 'At least 2 options are required for MCQ' });
        }
        if (!parsedOptions.some(opt => opt.isCorrect)) {
          return res.status(400).json({ message: 'At least one correct option is required' });
        }
        questionData.options = parsedOptions;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid options format' });
      }
    } else {
      if (!answer) {
        return res.status(400).json({ message: 'Answer is required for structured/essay questions' });
      }
      questionData.answer = answer.trim();
    }

    const question = new Question(questionData);
    await question.save();

    await question.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestionsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { search, type, difficulty } = req.query;

    // Verify module access
    const module = await Module.findOne({ 
      _id: moduleId, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found or access denied' });
    }

    const query = {
      moduleId: moduleId,
      createdBy: req.user._id,
      isActive: true
    };

    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;

    const questions = await Question.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      questions,
      module: {
        _id: module._id,
        moduleCode: module.moduleCode,
        moduleName: module.moduleName,
        moduleYear: module.moduleYear,
        moduleSemester: module.moduleSemester
      }
    });
  } catch (error) {
    console.error('Get questions by module error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestions = async (req, res) => {
  try {
    const { moduleCode, moduleYear, moduleSemester, search, type, difficulty } = req.query;
    
    const query = { createdBy: req.user._id, isActive: true };
    
    if (moduleCode) query.moduleCode = moduleCode;
    if (moduleYear) query.moduleYear = parseInt(moduleYear);
    if (moduleSemester) query.moduleSemester = parseInt(moduleSemester);
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    
    if (search) {
      query.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const questions = await Question.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.image;

    const question = await Question.findOne({ 
      _id: id, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Handle image update
    if (req.file) {
      // Delete old image if exists
      if (question.image) {
        await deleteUpload(question.image);
      }
      updateData.image = req.file.filename;
    }

    // Handle tags
    if (updateData.tags) {
      try {
        updateData.tags = typeof updateData.tags === 'string' ? 
          JSON.parse(updateData.tags) : updateData.tags;
      } catch (e) {
        updateData.tags = question.tags;
      }
    }

    // Handle equations
    if (updateData.equations) {
      try {
        updateData.equations = typeof updateData.equations === 'string' ? 
          JSON.parse(updateData.equations) : updateData.equations;
      } catch (e) {
        updateData.equations = question.equations;
      }
    }

    // Handle MCQ options
    if (updateData.options) {
      try {
        updateData.options = typeof updateData.options === 'string' ? 
          JSON.parse(updateData.options) : updateData.options;
      } catch (e) {
        updateData.options = question.options;
      }
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findOne({ 
      _id: id, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Delete associated image file
    if (question.image) {
      await deleteUpload(question.image);
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findOne({ 
      _id: id, 
      createdBy: req.user._id,
      isActive: true 
    }).populate('createdBy', 'firstName lastName');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({
      success: true,
      question
    });
  } catch (error) {
    console.error('Get question by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestionStats = async (req, res) => {
  try {
    const stats = await Question.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          mcqCount: { $sum: { $cond: [{ $eq: ['$type', 'MCQ'] }, 1, 0] } },
          structuredCount: { $sum: { $cond: [{ $eq: ['$type', 'Structured'] }, 1, 0] } },
          essayCount: { $sum: { $cond: [{ $eq: ['$type', 'Essay'] }, 1, 0] } },
          byDifficulty: {
            $push: '$difficulty'
          }
        }
      }
    ]);

    const moduleStats = await Question.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: { moduleCode: '$moduleCode', moduleId: '$moduleId' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalQuestions: stats[0]?.totalQuestions || 0,
        mcqCount: stats[0]?.mcqCount || 0,
        structuredCount: stats[0]?.structuredCount || 0,
        essayCount: stats[0]?.essayCount || 0,
        moduleStats
      }
    });
  } catch (error) {
    console.error('Get question stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLecturerModules = async (req, res) => {
  try {
    const modules = await Module.find({ 
      createdBy: req.user._id, 
      isActive: true 
    }).sort({ moduleCode: 1 });

    res.json({
      success: true,
      modules: modules.map(m => m.moduleCode)
    });
  } catch (error) {
    console.error('Get lecturer modules error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

