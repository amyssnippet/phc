import { Router } from 'express';
import {
  getOverview,
  getFacilities,
  getReferrals,
  getFollowups,
  getAccess,
  getDataQuality,
} from './analytics.controller.js';

const router = Router();

router.get('/overview', getOverview);
router.get('/facilities', getFacilities);
router.get('/referrals', getReferrals);
router.get('/followups', getFollowups);
router.get('/access', getAccess);
router.get('/data-quality', getDataQuality);

export default router;
