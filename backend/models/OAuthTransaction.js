import mongoose from 'mongoose';

// Short-lived, single-use records shared by all backend instances.
const schema = new mongoose.Schema({
  _id: String,
  kind: { type: String, enum: ['authorization', 'completion'], required: true },
  browserHash: String,
  nonce: String,
  codeVerifier: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signup: {
    firstName: String,
    lastName: String,
    requestedRole: { type: String, enum: ['admin', 'lecturer', 'student'] }
  },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { versionKey: false });

export default mongoose.model('OAuthTransaction', schema);
