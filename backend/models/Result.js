import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  questionText: String,
  questionType: {
    type: String,
    enum: ['MCQ', 'Structured', 'Essay']
  },
  studentAnswer: mongoose.Schema.Types.Mixed, // Can store string, array, object
  correctAnswer: mongoose.Schema.Types.Mixed,
  isCorrect: {
    type: Boolean,
    default: false
  },
  marks: {
    type: Number,
    default: 0
  },
  maxMarks: {
    type: Number,
    default: 1
  }
});

const resultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: String,
  studentEmail: String,
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  quizTitle: String,
  moduleCode: String,
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [answerSchema],
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number, // in minutes
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  submissionType: {
    type: String,
    enum: ['normal', 'auto', 'late'],
    default: 'normal'
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
    required: true
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'reviewed', 'pending_manual_review'],
    default: 'submitted'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
resultSchema.index({ studentId: 1, quizId: 1 }, { unique: true });
resultSchema.index({ lecturerId: 1, createdAt: -1 });
resultSchema.index({ moduleCode: 1, createdAt: -1 });
resultSchema.index({ percentage: -1 });

// Calculate grade based on percentage - Updated to handle manual review
resultSchema.pre('save', function(next) {
  console.log('=== RESULT PRE-SAVE HOOK ===');
  console.log('Status:', this.status);
  console.log('Percentage:', this.percentage);
  
  // Skip grade calculation for pending manual review
  if (this.status === 'pending_manual_review') {
    console.log('Pending manual review - skipping grade calculation');
    this.grade = 'F'; // Temporary grade, will be updated after manual grading
    next();
    return;
  }
  
  // Ensure percentage is a number
  const percentage = Number(this.percentage) || 0;
  console.log('Converted percentage:', percentage);
  
  if (percentage >= 90) this.grade = 'A+';
  else if (percentage >= 85) this.grade = 'A';
  else if (percentage >= 80) this.grade = 'A-';
  else if (percentage >= 75) this.grade = 'B+';
  else if (percentage >= 70) this.grade = 'B';
  else if (percentage >= 65) this.grade = 'B-';
  else if (percentage >= 60) this.grade = 'C+';
  else if (percentage >= 55) this.grade = 'C';
  else if (percentage >= 50) this.grade = 'C-';
  else if (percentage >= 45) this.grade = 'D+';
  else if (percentage >= 40) this.grade = 'D';
  else this.grade = 'F';
  
  console.log('Calculated grade:', this.grade);
  next();
});

export default mongoose.model('Result', resultSchema);