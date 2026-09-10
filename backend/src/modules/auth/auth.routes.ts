import { Router } from 'express';
import { sendOtp, verifyOtp, logout, getMe } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
