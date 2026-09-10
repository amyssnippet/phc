import { Router } from 'express';
import { listNotifications, markAsRead, markAllAsRead } from './notifications.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listNotifications);
router.post('/:id/read', requireAuth, markAsRead);
router.post('/read-all', requireAuth, markAllAsRead);

export default router;
