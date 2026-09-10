import { Router } from 'express';
import {
  listReferrals,
  createReferral,
  getReferralById,
  getTimeline,
  acceptReferral,
  rejectReferral,
  bookAppointment,
  markArrived,
  markConsulted,
  completeReferral,
  cancelReferral,
} from './referrals.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listReferrals);
router.post('/', requireAuth, createReferral);
router.get('/:id', requireAuth, getReferralById);
router.get('/:id/timeline', requireAuth, getTimeline);
router.post('/:id/accept', requireAuth, acceptReferral);
router.post('/:id/reject', requireAuth, rejectReferral);
router.post('/:id/appointment', requireAuth, bookAppointment);
router.post('/:id/arrive', requireAuth, markArrived);
router.post('/:id/consult', requireAuth, markConsulted);
router.post('/:id/complete', requireAuth, completeReferral);
router.post('/:id/cancel', requireAuth, cancelReferral);

export default router;
