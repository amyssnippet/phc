import { Router } from 'express';
import { recommend, getById } from './care-routing.controller.js';

const router = Router();

router.post('/recommend', recommend);
router.get('/:id', getById);

export default router;
