import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { medicineService } from './medicines.service.js';
import { getParam } from '../../utils/params.js';

export async function listMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await medicineService.listMedicines();
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
}

export async function getFacilityMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await medicineService.getFacilityMedicines(getParam(req, 'facilityId'));
    return sendSuccess(res, { items });
  } catch (err) {
    return next(err);
  }
}

export async function getFacilityMedicineById(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await medicineService.getFacilityMedicineById(
      getParam(req, 'facilityId'),
      getParam(req, 'medicineId')
    );
    return sendSuccess(res, item);
  } catch (err) {
    return next(err);
  }
}
