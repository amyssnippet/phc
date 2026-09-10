import { Router } from 'express';
import {
  listAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  checkIn,
  cancelAppointment,
} from './appointments.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listAppointments);
router.post('/', requireAuth, createAppointment);
router.get('/:id', requireAuth, getAppointmentById);
router.patch('/:id', requireAuth, updateAppointment);
router.post('/:id/check-in', requireAuth, checkIn);
router.post('/:id/cancel', requireAuth, cancelAppointment);

export default router;
