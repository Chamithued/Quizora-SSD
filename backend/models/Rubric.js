import mongoose from 'mongoose';

// Performance Level Schema - defines scoring levels (e.g., Excellent, Good, Fair, Poor)
const performanceLevelSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    trim: true
  },
  points: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  }
});

// Criteria Schema - defines what to evaluate (e.g., Content, Organization, Grammar)
const criteriaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 100
  },
  performanceLevels: [performanceLevelSchema]
});

// Main Rubric Schema
const rubricSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  questionTypes: [{
    type: String,
    enum: ['Structured', 'Essay'],
    required: true
  }],
  totalPoints: {
    type: Number,
    required: true,
    min: 1
  },
  criteria: [criteriaSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  isTemplate: {
    type: Boolean,
    default: false // If true, this rubric can be used as a template for new rubrics
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Pre-save hook to calculate total points
rubricSchema.pre('save', function(next) {
  if (this.criteria && this.criteria.length > 0) {
    // Calculate total points based on highest performance level of each criteria
    this.totalPoints = this.criteria.reduce((total, criterion) => {
      const maxPoints = Math.max(...criterion.performanceLevels.map(level => level.points));
      return total + maxPoints;
    }, 0);
  }
  next();
});

// Instance method to validate criteria weights
rubricSchema.methods.validateCriteriaWeights = function() {
  const totalWeight = this.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  return totalWeight === 100;
};

// Instance method to get performance level by points for a criterion
rubricSchema.methods.getPerformanceLevelByPoints = function(criteriaId, points) {
  const criterion = this.criteria.id(criteriaId);
  if (!criterion) return null;
  
  // Find the performance level that matches the points
  return criterion.performanceLevels.find(level => level.points === points) || null;
};

// Static method to get rubrics by question type
rubricSchema.statics.getByQuestionType = function(questionType, createdBy) {
  return this.find({
    questionTypes: questionType,
    createdBy,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Static method to get template rubrics
rubricSchema.statics.getTemplates = function(createdBy) {
  return this.find({
    isTemplate: true,
    createdBy,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Index for efficient querying
rubricSchema.index({ createdBy: 1, isActive: 1 });
rubricSchema.index({ questionTypes: 1, createdBy: 1 });
rubricSchema.index({ isTemplate: 1, createdBy: 1 });

const Rubric = mongoose.model('Rubric', rubricSchema);

export default Rubric;