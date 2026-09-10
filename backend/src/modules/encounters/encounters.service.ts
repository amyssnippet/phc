import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { CreateEncounterInput, UpdateEncounterInput } from './encounters.schema.js';

export class EncounterService {
  async createEncounter(input: CreateEncounterInput) {
    return prisma.encounter.create({
      data: {
        patientId: input.patientId,
        facilityId: input.facilityId,
        practitionerId: input.practitionerId || null,
        type: input.type,
        chiefComplaint: input.chiefComplaint || null,
        notes: input.notes || null,
        status: 'ACTIVE',
        startedAt: new Date(),
        demoData: true,
      },
    });
  }

  async getEncounterById(id: string) {
    const encounter = await prisma.encounter.findUnique({
      where: { id },
      include: {
        patient: true,
        facility: true,
        practitioner: true,
        triageSession: true,
        referrals: true,
        followUps: true,
      },
    });
    if (!encounter) throw new NotFoundError('Encounter not found', 'ENCOUNTER_NOT_FOUND');
    return encounter;
  }

  async updateEncounter(id: string, input: UpdateEncounterInput) {
    return prisma.encounter.update({
      where: { id },
      data: {
        ...(input.chiefComplaint !== undefined && { chiefComplaint: input.chiefComplaint }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  async completeEncounter(id: string) {
    return prisma.encounter.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}

export const encounterService = new EncounterService();
