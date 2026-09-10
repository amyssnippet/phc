import { Router } from 'express';
import {
  getNearby,
  search,
  getMap,
  getById,
  getHours,
  getSpecialties,
  getResources,
  getQueue,
  getDiagnostics,
} from './facilities.controller.js';

const router = Router();

router.get('/nearby', getNearby);
router.get('/search', search);
router.get('/map', getMap);
router.get('/', search);
router.get('/:id', getById);
router.get('/:id/hours', getHours);
router.get('/:id/specialties', getSpecialties);
router.get('/:id/resources', getResources);
router.get('/:id/queue', getQueue);
router.get('/:id/diagnostics', getDiagnostics);

export default router;
