import mongoose from 'mongoose';

// Store session identifiers, never the bearer tokens themselves.
const authSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Cleanup is asynchronous; authentication independently checks expiration.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AuthSession', authSessionSchema);
