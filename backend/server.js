//server.js // 

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import gradingRoutes from './routes/gradingRoutes.js';
import rubricRoutes from './routes/rubricRoutes.js';
import User from './models/User.js';
import Quiz from './models/Quiz.js';
import Result from './models/Result.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();

// Remove framework fingerprinting
app.disable('x-powered-by');

// Create uploads directory if it doesn't exist
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Hardened CORS configuration with dynamic whitelist validation
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile clients, server-to-server, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Cross-Origin Request Blocked: Origin not permitted by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded images
app.use('/uploads', express.static(uploadsDir));

// 1. General API Rate Limiting (Mitigate DoS floods)
const generalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000,
  limit: 100, // Reduced from 1000 to standard 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', generalLimiter);

// 2. Strict Auth Rate Limiting (Mitigate Brute-Force & Credential Stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // Maximum 5 failed attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  }
});
app.use('/api/auth/login', authLimiter);
// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ 
      email: process.env.DEFAULT_ADMIN_EMAIL 
    });
    
    if (!adminExists) {
      const admin = new User({
        firstName: 'System',
        lastName: 'Admin',
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin'
      });
      
      await admin.save();
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Initialize default admin after DB connection
mongoose.connection.once('open', () => {
  createDefaultAdmin();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/grading', gradingRoutes);
import resultRoutes from './routes/resultRoutes.js';
app.use('/api/results', resultRoutes);
app.use('/api/rubrics', rubricRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Quizora API is running', 
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error stack:', err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ 
      message: 'File too large. Maximum size is 5MB.' 
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      message: 'Too many files. Maximum is 1 file.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE_TYPE') {
    return res.status(400).json({
      message: err.message
    });
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validation Error',
      errors 
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({ 
      message: 'Resource already exists' 
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      message: 'Invalid token' 
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      message: 'Token expired' 
    });
  }

  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});