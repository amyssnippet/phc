import { Router } from 'express';
import {
  getQueueState,
  joinQueue,
  callNext,
  completeQueue,
  streamQueue,
} from './queues.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/:facilityId', getQueueState);
router.post('/:facilityId/join', requireAuth, joinQueue);
router.post('/:facilityId/call-next', requireAuth, callNext);
router.post('/:facilityId/complete', requireAuth, completeQueue);
router.get('/:facilityId/stream', streamQueue);

export default router;
