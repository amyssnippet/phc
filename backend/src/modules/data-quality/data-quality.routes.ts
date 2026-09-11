import { Router } from 'express';
import {
  getSummary,
  listIssues,
  getFacilityIssues,
  resolveIssue,
  ignoreIssue,
} from './data-quality.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.get('/summary', getSummary);
router.get('/issues', listIssues);
router.get('/facilities/:facilityId', getFacilityIssues);
router.post('/issues/:id/resolve', requireAuth, requireRole('DISTRICT_OFFICER', 'SUPER_ADMIN'), resolveIssue);
router.post('/issues/:id/ignore', requireAuth, requireRole('DISTRICT_OFFICER', 'SUPER_ADMIN'), ignoreIssue);

export default router;
