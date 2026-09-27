import mongoose from 'mongoose';

// Records that a student successfully verified a quiz's passcode (and was
// eligible) so that the questions/submit endpoints can enforce that gate
// server-side. Without this, passcode + eligibility were only checked on the
// separate verify-passcode endpoint and never re-verified when questions were
// fetched or a submission was made.
const quizAccessSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  // Grant is only valid until this time; a TTL index removes it afterwards.
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// One active grant per student/quiz pair.
quizAccessSchema.index({ studentId: 1, quizId: 1 }, { unique: true });
// TTL index: MongoDB deletes the document once expiresAt is reached.
quizAccessSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('QuizAccess', quizAccessSchema);
