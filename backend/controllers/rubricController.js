import Rubric from '../models/Rubric.js';
import Module from '../models/Module.js';

// Get all rubrics for a lecturer
export const getRubrics = async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const { moduleId, questionType, isTemplate } = req.query;

    let filter = {
      createdBy: lecturerId,
      isActive: true
    };

    if (moduleId) {
      filter.moduleId = moduleId;
    }

    if (questionType) {
      filter.questionTypes = questionType;
    }

    if (isTemplate !== undefined) {
      filter.isTemplate = isTemplate === 'true';
    }

    const rubrics = await Rubric.find(filter)
      .populate('moduleId', 'moduleCode moduleName')
      .sort({ createdAt: -1 });

    console.log(`Found ${rubrics.length} rubrics for lecturer ${lecturerId}`);

    res.json({
      success: true,
      rubrics: rubrics || [],
      count: rubrics.length,
      filter: filter
    });
  } catch (error) {
    console.error('Get rubrics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a specific rubric by ID
export const getRubricById = async (req, res) => {
  try {
    const { id } = req.params;
    const lecturerId = req.user._id;

    const rubric = await Rubric.findOne({
      _id: id,
      createdBy: lecturerId,
      isActive: true
    }).populate('moduleId', 'moduleCode moduleName');

    if (!rubric) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    res.json({
      success: true,
      rubric
    });
  } catch (error) {
    console.error('Get rubric by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new rubric
export const createRubric = async (req, res) => {
  try {
    const lecturerId = req.user._id;
    const {
      title,
      description,
      moduleId,
      questionTypes,
      criteria,
      isTemplate,
      tags
    } = req.body;

    // Validate module if provided
    if (moduleId) {
      const module = await Module.findOne({
        _id: moduleId,
        createdBy: lecturerId,
        isActive: true
      });

      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
    }

    // Validate criteria
    if (!criteria || criteria.length === 0) {
      return res.status(400).json({ message: 'At least one criterion is required' });
    }

    // Validate that each criterion has performance levels and calculate total points
    let totalPoints = 0;
    for (const criterion of criteria) {
      if (!criterion.performanceLevels || criterion.performanceLevels.length === 0) {
        return res.status(400).json({ 
          message: `Criterion "${criterion.name}" must have at least one performance level` 
        });
      }
      
      // Calculate the maximum points for this criterion
      const maxPointsForCriterion = Math.max(...criterion.performanceLevels.map(level => level.points || 0));
      const weight = criterion.weight || 100;
      totalPoints += maxPointsForCriterion * (weight / 100);
    }

    const rubric = new Rubric({
      title,
      description,
      moduleId,
      questionTypes,
      criteria,
      totalPoints: Math.round(totalPoints * 100) / 100, // Round to 2 decimal places
      isTemplate: isTemplate || false,
      tags: tags || [],
      createdBy: lecturerId
    });

    await rubric.save();

    await rubric.populate('moduleId', 'moduleCode moduleName');

    res.status(201).json({
      success: true,
      message: 'Rubric created successfully',
      rubric
    });
  } catch (error) {
    console.error('Create rubric error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an existing rubric
export const updateRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const lecturerId = req.user._id;
    const updateData = req.body;

    const rubric = await Rubric.findOne({
      _id: id,
      createdBy: lecturerId,
      isActive: true
    });

    if (!rubric) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    // Validate module if being updated
    if (updateData.moduleId) {
      const module = await Module.findOne({
        _id: updateData.moduleId,
        createdBy: lecturerId,
        isActive: true
      });

      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
    }

    // Validate criteria if being updated and calculate total points
    if (updateData.criteria) {
      if (updateData.criteria.length === 0) {
        return res.status(400).json({ message: 'At least one criterion is required' });
      }

      let totalPoints = 0;
      for (const criterion of updateData.criteria) {
        if (!criterion.performanceLevels || criterion.performanceLevels.length === 0) {
          return res.status(400).json({ 
            message: `Criterion "${criterion.name}" must have at least one performance level` 
          });
        }
        
        // Calculate the maximum points for this criterion
        const maxPointsForCriterion = Math.max(...criterion.performanceLevels.map(level => level.points || 0));
        const weight = criterion.weight || 100;
        totalPoints += maxPointsForCriterion * (weight / 100);
      }
      
      updateData.totalPoints = Math.round(totalPoints * 100) / 100;
    }

    Object.assign(rubric, updateData);
    rubric.updatedAt = new Date();
    await rubric.save();

    await rubric.populate('moduleId', 'moduleCode moduleName');

    res.json({
      success: true,
      message: 'Rubric updated successfully',
      rubric
    });
  } catch (error) {
    console.error('Update rubric error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a rubric (soft delete)
export const deleteRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const lecturerId = req.user._id;

    const rubric = await Rubric.findOne({
      _id: id,
      createdBy: lecturerId,
      isActive: true
    });

    if (!rubric) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    rubric.isActive = false;
    await rubric.save();

    res.json({
      success: true,
      message: 'Rubric deleted successfully'
    });
  } catch (error) {
    console.error('Delete rubric error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Duplicate a rubric (useful for creating templates)
export const duplicateRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const lecturerId = req.user._id;
    const { title, isTemplate } = req.body;

    const originalRubric = await Rubric.findOne({
      _id: id,
      createdBy: lecturerId,
      isActive: true
    });

    if (!originalRubric) {
      return res.status(404).json({ message: 'Original rubric not found' });
    }

    const duplicatedRubric = new Rubric({
      title: title || `${originalRubric.title} (Copy)`,
      description: originalRubric.description,
      moduleId: originalRubric.moduleId,
      questionTypes: originalRubric.questionTypes,
      criteria: originalRubric.criteria,
      isTemplate: isTemplate !== undefined ? isTemplate : originalRubric.isTemplate,
      tags: originalRubric.tags,
      createdBy: lecturerId
    });

    await duplicatedRubric.save();
    await duplicatedRubric.populate('moduleId', 'moduleCode moduleName');

    res.status(201).json({
      success: true,
      message: 'Rubric duplicated successfully',
      rubric: duplicatedRubric
    });
  } catch (error) {
    console.error('Duplicate rubric error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get rubrics suitable for a specific question type
export const getRubricsForQuestionType = async (req, res) => {
  try {
    const { questionType } = req.params;
    const lecturerId = req.user._id;
    const { moduleId } = req.query;

    let filter = {
      createdBy: lecturerId,
      questionTypes: questionType,
      isActive: true
    };

    if (moduleId) {
      filter.moduleId = moduleId;
    }

    const rubrics = await Rubric.find(filter)
      .populate('moduleId', 'moduleCode moduleName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      rubrics
    });
  } catch (error) {
    console.error('Get rubrics for question type error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get rubric templates
export const getRubricTemplates = async (req, res) => {
  try {
    const lecturerId = req.user._id;

    const templates = await Rubric.find({
      createdBy: lecturerId,
      isTemplate: true,
      isActive: true
    })
    .populate('moduleId', 'moduleCode moduleName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Get rubric templates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Calculate rubric score based on selected performance levels
export const calculateRubricScore = async (req, res) => {
  try {
    const { rubricId, selectedLevels } = req.body;
    const lecturerId = req.user._id;

    const rubric = await Rubric.findOne({
      _id: rubricId,
      createdBy: lecturerId,
      isActive: true
    });

    if (!rubric) {
      return res.status(404).json({ message: 'Rubric not found' });
    }

    let totalScore = 0;
    let maxPossibleScore = 0;
    const scoringDetails = [];

    for (const criterion of rubric.criteria) {
      const selectedLevel = selectedLevels.find(
        level => level.criteriaId === criterion._id.toString()
      );

      if (selectedLevel) {
        const performanceLevel = criterion.performanceLevels.find(
          level => level._id.toString() === selectedLevel.levelId
        );

        if (performanceLevel) {
          totalScore += performanceLevel.points;
          scoringDetails.push({
            criteriaId: criterion._id,
            criteriaName: criterion.name,
            selectedLevel: performanceLevel,
            maxPoints: Math.max(...criterion.performanceLevels.map(l => l.points)),
            weight: criterion.weight
          });
        }
      }

      maxPossibleScore += Math.max(...criterion.performanceLevels.map(l => l.points));
    }

    const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    res.json({
      success: true,
      scoring: {
        totalScore,
        maxPossibleScore,
        percentage,
        details: scoringDetails
      }
    });
  } catch (error) {
    console.error('Calculate rubric score error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};