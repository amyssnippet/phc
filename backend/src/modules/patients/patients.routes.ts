import { Router } from 'express';
import {
  listPatients,
  createPatient,
  getPatientById,
  updatePatient,
  getPatientTimeline,
  getPatientReferrals,
  getPatientFollowups,
  getPatientAppointments,
} from './patients.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listPatients);
router.post('/', requireAuth, createPatient);
router.get('/:id', requireAuth, getPatientById);
router.patch('/:id', requireAuth, updatePatient);
router.get('/:id/timeline', requireAuth, getPatientTimeline);
router.get('/:id/referrals', requireAuth, getPatientReferrals);
router.get('/:id/followups', requireAuth, getPatientFollowups);
router.get('/:id/appointments', requireAuth, getPatientAppointments);

export default router;
