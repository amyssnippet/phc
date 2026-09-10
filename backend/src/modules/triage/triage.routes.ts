import { Router } from 'express';
import { createTriage, getTriageById, completeTriage } from './triage.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createTriage);
router.get('/:id', requireAuth, getTriageById);
router.post('/:id/complete', requireAuth, completeTriage);

export default router;
