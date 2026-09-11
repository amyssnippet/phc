/**
 * Response DTO Serializers for SwasthyaSetu
 * Prevents accidental data leakage across role boundaries.
 */

export function serializePublicFacility(facility: any) {
  if (!facility) return null;
  return {
    id: facility.id,
    externalFacilityId: facility.externalFacilityId,
    name: facility.name,
    facilityType: facility.facilityType,
    serviceType: facility.serviceType,
    pincode: facility.pincode,
    address: facility.address,
    latitude: facility.latitude,
    longitude: facility.longitude,
    location: facility.latitude && facility.longitude ? { latitude: facility.latitude, longitude: facility.longitude } : null,
    operationalStatus: facility.operationalStatus,
    emrEnabled: facility.emrEnabled ?? false,
    abdmEnabled: facility.abdmEnabled ?? false,
    dataQualityScore: facility.dataQualityScore ?? 100,
    specialties: (facility.specialties || []).map((s: any) => (typeof s === 'string' ? s : s.name)),
    hours: (facility.hours || []).map((h: any) => ({
      weekday: h.weekday,
      openTime: h.openTime,
      closeTime: h.closeTime,
      is24Hours: h.is24Hours,
    })),
    distanceKm: facility.distanceKm,
    isOpenNow: facility.isOpenNow,
  };
}

export function serializeCitizenPatient(patient: any) {
  if (!patient) return null;
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    phone: patient.phone,
    pincode: patient.pincode,
    address: patient.address,
    abhaReference: patient.abhaReference,
  };
}

export function serializeCitizenAppointment(appointment: any) {
  if (!appointment) return null;
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    department: appointment.department || 'GENERAL_MEDICINE',
    appointmentDate: appointment.appointmentDate,
    serviceDate: appointment.serviceDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status,
    facility: appointment.facility
      ? {
          id: appointment.facility.id,
          name: appointment.facility.name,
          facilityType: appointment.facility.facilityType,
          address: appointment.facility.address,
          pincode: appointment.facility.pincode,
        }
      : undefined,
    queueToken: appointment.queueToken
      ? {
          id: appointment.queueToken.id,
          displayNumber: appointment.queueToken.displayNumber,
          status: appointment.queueToken.status,
          priority: appointment.queueToken.priority,
          estimatedWaitMinutes: appointment.queueToken.estimatedWaitMinutes,
        }
      : undefined,
    createdAt: appointment.createdAt,
  };
}

export function serializeCitizenQueueStatus(token: any, currentlyServingNumber?: string | null, aheadCount: number = 0) {
  if (!token) return null;
  return {
    myToken: token.displayNumber,
    nowServing: currentlyServingNumber || 'None',
    ahead: aheadCount,
    estimatedWaitMinutes: token.estimatedWaitMinutes ?? (aheadCount * 8),
    status: token.status,
    department: token.department,
    facilityName: token.facility?.name || 'Primary Health Centre',
    serviceDate: token.serviceDate,
  };
}

export function serializeCitizenReferral(referral: any) {
  if (!referral) return null;
  return {
    id: referral.id,
    reason: referral.reason,
    urgency: referral.urgency,
    status: referral.status,
    sourceFacility: referral.sourceFacility
      ? { id: referral.sourceFacility.id, name: referral.sourceFacility.name }
      : undefined,
    destinationFacility: referral.destinationFacility
      ? { id: referral.destinationFacility.id, name: referral.destinationFacility.name, facilityType: referral.destinationFacility.facilityType }
      : undefined,
    createdAt: referral.createdAt,
    acceptedAt: referral.acceptedAt,
    completedAt: referral.completedAt,
    events: (referral.events || []).map((e: any) => ({
      eventType: e.eventType,
      createdAt: e.createdAt,
    })),
  };
}

export function serializeWorkerPatient(patient: any) {
  if (!patient) return null;
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    phone: patient.phone,
    pincode: patient.pincode,
    address: patient.address,
    catchmentCode: patient.catchmentCode,
    registeredAtFacilityId: patient.registeredAtFacilityId,
    createdAt: patient.createdAt,
  };
}

export function serializeDoctorPatient(patient: any) {
  if (!patient) return null;
  return {
    id: patient.id,
    patientCode: patient.patientCode,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    phone: patient.phone,
    pincode: patient.pincode,
    address: patient.address,
    abhaReference: patient.abhaReference,
    emergencyName: patient.emergencyName,
    emergencyPhone: patient.emergencyPhone,
    triageSessions: patient.triageSessions || [],
    encounters: (patient.encounters || []).map((e: any) => ({
      id: e.id,
      chiefComplaint: e.chiefComplaint,
      notes: e.notes,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
    })),
  };
}

export function serializeFacilityQueue(tokens: any[]) {
  return tokens.map((t) => ({
    id: t.id,
    facilityId: t.facilityId,
    displayNumber: t.displayNumber,
    tokenSequence: t.tokenSequence,
    department: t.department,
    serviceDate: t.serviceDate,
    priority: t.priority,
    status: t.status,
    estimatedWaitMinutes: t.estimatedWaitMinutes,
    patient: t.patient
      ? {
          id: t.patient.id,
          firstName: t.patient.firstName,
          lastName: t.patient.lastName,
          patientCode: t.patient.patientCode,
          sex: t.patient.sex,
        }
      : null,
    createdAt: t.createdAt,
    calledAt: t.calledAt,
    consultationStartedAt: t.consultationStartedAt,
    completedAt: t.completedAt,
  }));
}
