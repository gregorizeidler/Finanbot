import { Router } from 'express';
import { register, login, refreshToken, getProfile, logout } from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/profile', authenticateJWT, getProfile);
router.post('/logout', authenticateJWT, logout);

export default router; 