import { prisma } from '../../config/database.js';
import { Urgency } from '@prisma/client';
import { NotFoundError } from '../../utils/errors.js';
import { CreateTriageInput } from './triage.schema.js';

export class TriageService {
  evaluateVitals(vitals: CreateTriageInput['vitals'], symptoms: string[]) {
    const riskFlags: string[] = [];
    let urgency: Urgency = Urgency.LOW;

    const { temperatureC, heartRate, respiratoryRate, oxygenSaturation, bloodPressureSys } = vitals;

    // Critical rules
    if (oxygenSaturation && oxygenSaturation < 90) {
      riskFlags.push('SEVERE_HYPOXIA');
      urgency = Urgency.CRITICAL;
    }
    if (heartRate && heartRate > 140) {
      riskFlags.push('SEVERE_TACHYCARDIA');
      urgency = Urgency.CRITICAL;
    }
    if (temperatureC && temperatureC >= 40.0) {
      riskFlags.push('HYPERPYREXIA');
      urgency = Urgency.CRITICAL;
    }

    // High rules
    if (urgency !== Urgency.CRITICAL) {
      if (oxygenSaturation && oxygenSaturation >= 90 && oxygenSaturation < 94) {
        riskFlags.push('MILD_HYPOXIA');
        urgency = Urgency.HIGH;
      }
      if (heartRate && heartRate >= 105 && heartRate <= 140) {
        riskFlags.push('TACHYCARDIA');
        urgency = Urgency.HIGH;
      }
      if (temperatureC && temperatureC >= 38.5 && temperatureC < 40.0) {
        riskFlags.push('ELEVATED_TEMPERATURE');
        urgency = Urgency.HIGH;
      }
      if (bloodPressureSys && bloodPressureSys >= 160) {
        riskFlags.push('HYPERTENSIVE_STAGE_2');
        urgency = Urgency.HIGH;
      }
      if (respiratoryRate && respiratoryRate > 24) {
        riskFlags.push('TACHYPNEA');
        urgency = Urgency.HIGH;
      }
    }

    // Medium rules
    if (urgency === Urgency.LOW) {
      if (temperatureC && temperatureC > 37.5) {
        riskFlags.push('LOW_GRADE_FEVER');
        urgency = Urgency.MEDIUM;
      }
      if (symptoms.some((s) => s.toLowerCase().includes('chest pain') || s.toLowerCase().includes('breath'))) {
        riskFlags.push('CARDIORESPIRATORY_SYMPTOMS');
        urgency = Urgency.HIGH;
      } else if (symptoms.length > 2) {
        urgency = Urgency.MEDIUM;
      }
    }

    let recommendedAction = 'STANDARD_CLINICAL_REVIEW';
    if (urgency === Urgency.CRITICAL) {
      recommendedAction = 'EMERGENCY_ESCALATION_RECOMMENDED. Seek immediate clinical assessment.';
    } else if (urgency === Urgency.HIGH) {
      recommendedAction = 'PRIORITY_CLINICAL_ASSESSMENT';
    } else if (urgency === Urgency.MEDIUM) {
      recommendedAction = 'GENERAL_OPD_CONSULTATION';
    }

    return {
      urgency,
      riskFlags,
      recommendedAction,
      disclaimer: 'Decision support only. Not a medical diagnosis. Clinician must assess the patient directly.',
    };
  }

  async createSession(input: CreateTriageInput) {
    let encId = input.encounterId;

    // Ensure encounter exists or auto-create one
    if (!encId) {
      const facility = input.facilityId
        ? await prisma.facility.findUnique({ where: { id: input.facilityId } })
        : await prisma.facility.findFirst();

      const encounter = await prisma.encounter.create({
        data: {
          patientId: input.patientId,
          facilityId: facility!.id,
          type: 'PRIMARY_CARE',
          status: 'ACTIVE',
          chiefComplaint: input.symptoms.join(', ') || 'Triage Assessment',
          startedAt: new Date(),
        },
      });
      encId = encounter.id;
    }

    const evaluation = this.evaluateVitals(input.vitals, input.symptoms);

    const session = await prisma.triageSession.upsert({
      where: { encounterId: encId },
      update: {
        symptoms: input.symptoms,
        vitals: input.vitals as any,
        riskFlags: evaluation.riskFlags,
        urgency: evaluation.urgency,
        recommendedAction: evaluation.recommendedAction,
      },
      create: {
        patientId: input.patientId,
        encounterId: encId,
        symptoms: input.symptoms,
        vitals: input.vitals as any,
        riskFlags: evaluation.riskFlags,
        urgency: evaluation.urgency,
        recommendedAction: evaluation.recommendedAction,
        engineVersion: '1.0',
      },
    });

    return {
      ...session,
      ...evaluation,
    };
  }

  async getSessionById(id: string) {
    const session = await prisma.triageSession.findUnique({
      where: { id },
      include: {
        patient: true,
        encounter: true,
      },
    });
    if (!session) {
      throw new NotFoundError('Triage session not found', 'TRIAGE_NOT_FOUND');
    }
    return session;
  }

  async completeSession(id: string) {
    const session = await prisma.triageSession.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundError('Triage session not found', 'TRIAGE_NOT_FOUND');
    }

    await prisma.encounter.update({
      where: { id: session.encounterId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { message: 'Triage and encounter completed successfully', sessionId: id };
  }
}

export const triageService = new TriageService();
