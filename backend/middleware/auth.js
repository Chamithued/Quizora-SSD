import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';

export const createAuthenticate = (allowPending = false, users = User, sessions = AuthSession) => async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Pre-fix tokens have no session ID and must not retain access after rollout.
    if (typeof decoded.jti !== 'string' || typeof decoded.id !== 'string' ||
        !Number.isFinite(decoded.exp)) {
      return res.status(401).json({ message: 'Invalid session. Please log in again.' });
    }
    const session = await sessions.findOne({
      _id: decoded.jti,
      userId: decoded.id,
      expiresAt: { $gt: new Date() }
    });
    if (!session) {
      return res.status(401).json({ message: 'Session expired or logged out.' });
    }
    const user = await users.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    if (!allowPending && user.approvalStatus && user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: 'Administrator approval is required.', approvalStatus: user.approvalStatus });
    }

    req.user = user;
    req.auth = { sessionId: decoded.jti };
    next();
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // A storage outage must deny access without pretending a logout succeeded.
    res.status(503).json({ message: 'Unable to verify session. Please try again.' });
  }
};

export const authenticate = createAuthenticate();
export const authenticatePending = createAuthenticate(true);

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. User not authenticated.' });
    }

    if ((req.user.approvalStatus && req.user.approvalStatus !== 'approved') || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};
