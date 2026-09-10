import { Router } from 'express';
import { listMedicines, getFacilityMedicines, getFacilityMedicineById } from './medicines.controller.js';

const router = Router();

router.get('/', listMedicines);
router.get('/facilities/:facilityId/medicines', getFacilityMedicines);
router.get('/facilities/:facilityId/medicines/:medicineId', getFacilityMedicineById);

export default router;
