import Module from '../models/Module.js';
import Question from '../models/question.js';
import { createSearchRegex } from '../utils/searchRegex.js';

export const getModules = async (req, res) => {
  try {
    const { search, year, semester } = req.query;
    const searchRegex = createSearchRegex(search);
    const query = { createdBy: req.user._id, isActive: true };

    if (searchRegex) {
      query.$or = [
        { moduleCode: { $regex: searchRegex } },
        { moduleName: { $regex: searchRegex } }
      ];
    }
    if (year) query.moduleYear = parseInt(year);
    if (semester) query.moduleSemester = parseInt(semester);

    const modules = await Module.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ moduleYear: 1, moduleSemester: 1, moduleCode: 1 });

    // Get question count for each module
    const modulesWithQuestionCount = await Promise.all(
      modules.map(async (module) => {
        const questionCount = await Question.countDocuments({
          moduleCode: module.moduleCode,
          moduleYear: module.moduleYear,
          moduleSemester: module.moduleSemester,
          createdBy: req.user._id,
          isActive: true
        });
        
        return {
          ...module.toObject(),
          questionCount
        };
      })
    );

    res.json({
      success: true,
      modules: modulesWithQuestionCount
    });
  } catch (error) {
    if (error instanceof RangeError) return res.status(400).json({ message: error.message });
    console.error('Get modules error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createModule = async (req, res) => {
  try {
    const { moduleCode, moduleName, moduleYear, moduleSemester, credits, description } = req.body;

    if (!moduleCode || !moduleName || !moduleYear || !moduleSemester || !credits) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const moduleData = {
      moduleCode: moduleCode.toUpperCase(),
      moduleName,
      moduleYear: parseInt(moduleYear),
      moduleSemester: parseInt(moduleSemester),
      credits: parseInt(credits),
      description: description || '',
      createdBy: req.user._id
    };

    const module = new Module(moduleData);
    await module.save();

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Module with this code already exists for this year and semester' 
      });
    }
    console.error('Create module error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleCode, moduleName, moduleYear, moduleSemester, credits, description } = req.body;

    const module = await Module.findOne({ 
      _id: id, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    module.moduleCode = moduleCode?.toUpperCase() || module.moduleCode;
    module.moduleName = moduleName || module.moduleName;
    module.moduleYear = moduleYear ? parseInt(moduleYear) : module.moduleYear;
    module.moduleSemester = moduleSemester ? parseInt(moduleSemester) : module.moduleSemester;
    module.credits = credits ? parseInt(credits) : module.credits;
    module.description = description !== undefined ? description : module.description;

    await module.save();

    res.json({
      success: true,
      message: 'Module updated successfully',
      module
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findOne({ 
      _id: id, 
      createdBy: req.user._id,
      isActive: true 
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Check if module has questions
    const questionCount = await Question.countDocuments({
      moduleCode: module.moduleCode,
      moduleYear: module.moduleYear,
      moduleSemester: module.moduleSemester,
      createdBy: req.user._id,
      isActive: true
    });

    if (questionCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete module. It has ${questionCount} question(s). Delete questions first.` 
      });
    }

    module.isActive = false;
    await module.save();

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getModuleStats = async (req, res) => {
  try {
    const stats = await Module.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalModules: { $sum: 1 },
          byYear: {
            $push: {
              year: '$moduleYear',
              semester: '$moduleSemester'
            }
          }
        }
      }
    ]);

    const yearStats = await Module.aggregate([
      { $match: { createdBy: req.user._id, isActive: true } },
      {
        $group: {
          _id: { year: '$moduleYear', semester: '$moduleSemester' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.semester': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalModules: stats[0]?.totalModules || 0,
        yearStats
      }
    });
  } catch (error) {
    console.error('Get module stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
