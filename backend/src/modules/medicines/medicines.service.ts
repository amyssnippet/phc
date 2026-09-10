import { prisma } from '../../config/database.js';

export class MedicineService {
  async listMedicines() {
    return prisma.medicine.findMany({
      orderBy: { genericName: 'asc' },
    });
  }

  async getFacilityMedicines(facilityId: string) {
    return prisma.facilityMedicineStock.findMany({
      where: { facilityId },
      include: { medicine: true },
      orderBy: { medicine: { genericName: 'asc' } },
    });
  }

  async getFacilityMedicineById(facilityId: string, medicineId: string) {
    return prisma.facilityMedicineStock.findUnique({
      where: { facilityId_medicineId: { facilityId, medicineId } },
      include: { medicine: true },
    });
  }
}

export const medicineService = new MedicineService();
