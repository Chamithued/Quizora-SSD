import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() { return this.authProvider !== 'google'; },
    minlength: 6
  },
  // Google's stable subject identifier. Never link accounts by email alone.
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    select: false
  },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  requestedRole: { type: String, enum: ['admin', 'lecturer', 'student'] },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  role: {
    type: String,
    enum: ['admin', 'lecturer', 'student'],
    default: 'student'
  },
  // Student-specific fields
  degreeTitle: {
    type: String,
    required: function() {
      return this.role === 'student' && this.approvalStatus === 'approved';
    }
  },
  currentYear: {
    type: Number,
    min: [1, 'Year must be at least 1'],
    max: [4, 'Year cannot exceed 4'],
    required: function() {
      return this.role === 'student' && this.approvalStatus === 'approved';
    }
  },
  currentSemester: {
    type: Number,
    enum: [1, 2],
    required: function() {
      return this.role === 'student' && this.approvalStatus === 'approved';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Hash password before saving - CRITICAL FOR PASSWORD UPDATES
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    console.log('Password not modified, skipping hash for user:', this.email);
    return next();
  }

  try {
    console.log('Hashing password for user:', this.email);
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    console.log('Password hashed successfully for user:', this.email);
    next();
  } catch (error) {
    console.error('Error hashing password for user:', this.email, error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) {
      console.error('No password found for user:', this.email);
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password comparison for user:', this.email, 'Result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password for user:', this.email, error);
    return false;
  }
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Transform output - ensure password is never returned in JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.googleId;
  return user;
};

// Ensure password field is not selected by default
userSchema.set('toJSON', { 
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.googleId;
    return ret;
  }
});

export default mongoose.model('User', userSchema);
