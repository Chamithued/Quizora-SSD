import express from 'express';
import { login, getProfile, logout } from '../controllers/authController.js';
import { authenticatePending } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { googleAuth } from '../controllers/googleAuthController.js';

const router = express.Router();

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many Google sign-in attempts. Try again in 15 minutes.' }
});


router.get('/google/status', googleAuth.status); // check the status of the Google authentication
router.post('/google/start', googleLimiter, googleAuth.start); // start the authentication process with Google
router.post('/google/signup', googleLimiter, googleAuth.signup); // start the signup process with Google
router.post('/google/link', googleLimiter, googleAuth.link); // start connecting an existing account with Google
router.get('/google/callback', googleLimiter, googleAuth.callback); // handle the callback from Google after user authentication
router.post('/google/complete', googleLimiter, googleAuth.complete); // complete the linking process after the user has authenticated with Google

router.post('/login', login); 
router.get('/profile', authenticatePending, getProfile);
router.post('/logout', authenticatePending, logout);

export default router;
