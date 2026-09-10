import { Router } from 'express';
import {
  listFollowups,
  createFollowup,
  getFollowupById,
  completeFollowup,
} from './followups.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listFollowups);
router.post('/', requireAuth, createFollowup);
router.get('/:id', requireAuth, getFollowupById);
router.post('/:id/complete', requireAuth, completeFollowup);

export default router;
