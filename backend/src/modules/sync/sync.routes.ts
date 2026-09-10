import { Router } from 'express';
import { pushSync, pullSync, getSyncStatus } from './sync.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/push', optionalAuth, pushSync);
router.post('/pull', optionalAuth, pullSync);
router.get('/status', getSyncStatus);

export default router;
