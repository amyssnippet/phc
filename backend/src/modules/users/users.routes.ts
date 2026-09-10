import { Router } from 'express';
import { getMe, updateMe, getUserById } from './users.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);
router.get('/:id', requireAuth, getUserById);

export default router;
