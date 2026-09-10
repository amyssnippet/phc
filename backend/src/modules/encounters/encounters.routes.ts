import { Router } from 'express';
import { createEncounter, getEncounterById, updateEncounter, completeEncounter } from './encounters.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createEncounter);
router.get('/:id', requireAuth, getEncounterById);
router.patch('/:id', requireAuth, updateEncounter);
router.post('/:id/complete', requireAuth, completeEncounter);

export default router;
