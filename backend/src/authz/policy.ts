import { PrismaClient } from '@prisma/client';
import { AuthContext } from './scopes';

const prisma = new PrismaClient();

export class AuthorizationPolicy {
  static async canViewPatient(actor: AuthContext, patientId: string): Promise<boolean> {
    if (actor.isSuperAdmin) return true;

    // CITIZEN: strictly own record
    if (actor.role === 'CITIZEN') {
      return actor.patientId === patientId;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        registeredByUserId: true,
        registeredAtFacilityId: true,
        catchmentCode: true,
      },
    });

    if (!patient) return false;

    // CHW: registered by worker or belonging to worker's assigned facility/catchment
    if (actor.role === 'CHW') {
      if (patient.registeredByUserId === actor.userId) return true;
      if (patient.registeredAtFacilityId && actor.facilityIds.includes(patient.registeredAtFacilityId)) {
        return true;
      }
      if (patient.catchmentCode && actor.catchmentCodes.includes(patient.catchmentCode)) {
        return true;
      }
      return false;
    }

    // DOCTOR: must have a clinical relationship at doctor's facility
    if (actor.role === 'DOCTOR') {
      if (actor.facilityIds.length === 0) return false;

      // Check active appointment at doctor's facility
      const hasAppointment = await prisma.appointment.findFirst({
        where: {
          patientId,
          facilityId: { in: actor.facilityIds },
        },
      });
      if (hasAppointment) return true;

      // Check active queue token at doctor's facility
      const hasQueueToken = await prisma.queueToken.findFirst({
        where: {
          patientId,
          facilityId: { in: actor.facilityIds },
        },
      });
      if (hasQueueToken) return true;

      // Check prior encounter at doctor's facility
      const hasEncounter = await prisma.encounter.findFirst({
        where: {
          patientId,
          facilityId: { in: actor.facilityIds },
        },
      });
      if (hasEncounter) return true;

      // Check accepted referral into doctor's facility
      const hasReferral = await prisma.referral.findFirst({
        where: {
          patientId,
          destinationFacilityId: { in: actor.facilityIds },
          status: { in: ['ACCEPTED', 'APPOINTMENT_BOOKED', 'PATIENT_ARRIVED', 'CONSULTED'] },
        },
      });
      if (hasReferral) return true;

      return false;
    }

    // FACILITY_ADMIN: scoped to facility patients & appointments
    if (actor.role === 'FACILITY_ADMIN') {
      if (patient.registeredAtFacilityId && actor.facilityIds.includes(patient.registeredAtFacilityId)) {
        return true;
      }
      const hasActivity = await prisma.appointment.findFirst({
        where: {
          patientId,
          facilityId: { in: actor.facilityIds },
        },
      });
      return Boolean(hasActivity);
    }

    // DISTRICT_OFFICER: Aggregate only, individual records denied
    if (actor.role === 'DISTRICT_OFFICER') {
      return false;
    }

    return false;
  }

  static canManageQueue(actor: AuthContext, facilityId: string): boolean {
    if (actor.isSuperAdmin) return true;
    if (actor.role === 'DOCTOR' || actor.role === 'FACILITY_ADMIN') {
      return actor.facilityIds.includes(facilityId);
    }
    return false;
  }

  static canCreateReferral(actor: AuthContext, sourceFacilityId: string): boolean {
    if (actor.isSuperAdmin) return true;
    if (actor.role === 'CHW' || actor.role === 'DOCTOR') {
      return actor.facilityIds.includes(sourceFacilityId);
    }
    return false;
  }

  static canReviewReferral(actor: AuthContext, destinationFacilityId: string): boolean {
    if (actor.isSuperAdmin) return true;
    if (actor.role === 'DOCTOR' || actor.role === 'FACILITY_ADMIN') {
      return actor.facilityIds.includes(destinationFacilityId);
    }
    return false;
  }

  static canAccessAppointment(
    actor: AuthContext,
    appointment: { patientId: string; facilityId: string }
  ): boolean {
    if (actor.isSuperAdmin) return true;
    if (actor.role === 'CITIZEN') {
      return actor.patientId === appointment.patientId;
    }
    if (actor.role === 'DOCTOR' || actor.role === 'FACILITY_ADMIN') {
      return actor.facilityIds.includes(appointment.facilityId);
    }
    return false;
  }

  static canAccessReferral(
    actor: AuthContext,
    referral: { patientId: string; sourceFacilityId: string; destinationFacilityId: string; createdById?: string }
  ): boolean {
    if (actor.isSuperAdmin) return true;
    if (actor.role === 'CITIZEN') {
      return actor.patientId === referral.patientId;
    }
    if (actor.role === 'CHW') {
      return (
        actor.facilityIds.includes(referral.sourceFacilityId) ||
        referral.createdById === actor.userId
      );
    }
    if (actor.role === 'DOCTOR' || actor.role === 'FACILITY_ADMIN') {
      return (
        actor.facilityIds.includes(referral.sourceFacilityId) ||
        actor.facilityIds.includes(referral.destinationFacilityId)
      );
    }
    return false;
  }

  static canResolveDataQuality(actor: AuthContext): boolean {
    return actor.isSuperAdmin || actor.role === 'DISTRICT_OFFICER';
  }
}
