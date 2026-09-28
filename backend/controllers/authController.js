import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';

// Both password and Google login must persist a revocable session before issuing a token.
export const generateToken = async (userId) => {
  const sessionId = randomUUID();
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    jwtid: sessionId,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  const { exp } = jwt.decode(token);
  await AuthSession.create({ _id: sessionId, userId, expiresAt: new Date(exp * 1000) });
  return token;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Reject non-string inputs to prevent NoSQL operator injection, e.g. a body
    // like { "email": { "$gt": "" } } which Mongo would treat as an operator
    // and use to match an arbitrary user instead of a literal address.
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Find user by email and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = await generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Wait for durable revocation before reporting successful logout.
    await AuthSession.deleteOne({ _id: req.auth.sessionId, userId: req.user._id });
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(503).json({ message: 'Unable to log out. Please try again.' });
  }
};
