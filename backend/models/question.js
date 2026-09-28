import mongoose from 'mongoose';
import { createSearchRegex } from '../utils/searchRegex.js';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const questionSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: ['MCQ', 'Structured', 'Essay'], 
      required: true 
    },
    questionText: { 
      type: String, 
      required: true 
    },
    options: [optionSchema],
    answer: { type: String },
    image: { type: String },
    equations: [{ type: String }],
    tags: [String],
    
    // Module reference - UPDATED
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true
    },
    moduleCode: {
      type: String,
      required: true,
      trim: true
    },
    moduleYear: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    },
    moduleSemester: {
      type: Number,
      required: true,
      enum: [1, 2]
    },
    
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    }
  },
  { 
    timestamps: true,
    indexes: [
      { createdBy: 1, moduleId: 1 },
      { createdBy: 1, moduleCode: 1, moduleYear: 1, moduleSemester: 1 },
      { createdBy: 1, type: 1 },
      { tags: 1 }
    ]
  }
);

questionSchema.methods.canAccess = function(user) {
  return this.createdBy.toString() === user._id.toString();
};

// Updated static method
questionSchema.statics.findByModule = function(lecturerId, moduleId, filters = {}) {
  const query = { 
    createdBy: lecturerId, 
    moduleId: moduleId,
    isActive: true 
  };
  
  if (filters.type) query.type = filters.type;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  
  const searchRegex = createSearchRegex(filters.search);
  if (searchRegex) {
    query.$or = [
      { questionText: { $regex: searchRegex } },
      { tags: { $in: [searchRegex] } }
    ];
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

export default mongoose.model('Question', questionSchema);
