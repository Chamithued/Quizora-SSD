import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const createAuthenticate = (allowPending = false, users = User) => async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    if (!allowPending && user.approvalStatus && user.approvalStatus !== 'approved') {
      return res.status(403).json({ message: 'Administrator approval is required.', approvalStatus: user.approvalStatus });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
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
