import { api } from './client';

export interface CitizenAppointment {
  id: string;
  patientId?: string;
  department: string;
  appointmentDate: string;
  serviceDate?: string;
  startTime: string;
  endTime: string;
  status: string;
  facility?: {
    id: string;
    name: string;
    facilityType: string;
    address?: string;
    pincode?: string;
  };
  queueToken?: {
    id: string;
    displayNumber: string;
    status: string;
    priority: number;
    estimatedWaitMinutes?: number;
    serviceDate?: string;
    department?: string;
  };
}

export interface CitizenQueueStatus {
  hasActiveToken: boolean;
  token?: {
    id: string;
    displayNumber: string;
    department: string;
    serviceDate: string;
    status: string;
    priority: number;
    estimatedWaitMinutes?: number;
    facilityName: string;
    facilityId: string;
    currentlyServing?: string;
    aheadInLine?: number;
  };
  ownToken?: {
    id?: string;
    tokenNumber?: string;
    department?: string;
    serviceDate?: string;
    status?: string;
    estimatedWaitMinutes?: number;
  };
  patientsAhead?: number;
  myToken?: string;
  nowServing?: string;
  ahead?: number;
  estimatedWaitMinutes?: number;
  facilityName?: string;
  facilityId?: string;
}

export const meApi = {
  getProfile: () => api.get<any>('/me/profile'),
  getAppointments: () => api.get<{ items: CitizenAppointment[] }>('/me/appointments'),
  getAppointmentById: (id: string) => api.get<CitizenAppointment>(`/me/appointments/${id}`),
  bookAppointment: (data: {
    facilityId: string;
    appointmentDate: string;
    startTime?: string;
    endTime?: string;
    department?: string;
  }) => api.post<CitizenAppointment>('/me/appointments', data),
  cancelAppointment: (id: string, reason?: string) =>
    api.post<CitizenAppointment>(`/me/appointments/${id}/cancel`, { reason }),
  getQueueStatus: () => api.get<CitizenQueueStatus>('/me/queue'),
  getReferrals: () => api.get<{ items: any[] }>('/me/referrals'),
  getTimeline: () => api.get<{ timeline: any[] }>('/me/timeline'),
  getFollowUps: () => api.get<{ items: any[] }>('/me/followups'),
};

export const workerApi = {
  getPatients: (params?: { q?: string; catchment?: string; limit?: number }) => {
    const qParams = new URLSearchParams();
    if (params?.q) qParams.append('q', params.q);
    if (params?.catchment) qParams.append('catchment', params.catchment);
    if (params?.limit) qParams.append('limit', String(params.limit));
    const qs = qParams.toString();
    return api.get<{ items: any[] }>(`/worker/patients${qs ? `?${qs}` : ''}`);
  },
  registerPatient: (data: {
    firstName: string;
    lastName?: string;
    phone: string;
    dateOfBirth?: string;
    sex?: string;
    address?: string;
    pincode?: string;
    catchmentCode?: string;
  }) => api.post<any>('/worker/patients', data),
  getPatientById: (id: string) => api.get<any>(`/worker/patients/${id}`),
  submitTriage: (data: {
    patientId: string;
    symptoms: string[];
    vitals?: Record<string, any>;
    chiefComplaint?: string;
  }) => api.post<any>('/worker/triage', data),
  createReferral: (data: {
    patientId: string;
    destinationFacilityId: string;
    reason: string;
    urgency: string;
    specialty?: string;
  }) => api.post<any>('/worker/referrals', data),
  getReferrals: () => api.get<{ items: any[] }>('/worker/referrals'),
};

export const doctorApi = {
  getWorklist: () => api.get<{ queue: any[]; appointments: any[] }>('/doctor/worklist'),
  getPatientFile: (patientId: string) => api.get<any>(`/doctor/patients/${patientId}`),
  callNext: (facilityId: string, department = 'GENERAL_MEDICINE') =>
    api.post<any>(`/doctor/queues/${facilityId}/call-next`, { department }),
  completeConsultation: (facilityId: string, tokenId: string) =>
    api.post<any>(`/doctor/queues/${facilityId}/complete`, { tokenId }),
  recordEncounter: (data: {
    patientId: string;
    facilityId: string;
    chiefComplaint?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    prescriptions?: any[];
    notes?: string;
  }) => api.post<any>('/doctor/encounters', data),
  createReferral: (data: {
    patientId: string;
    destinationFacilityId: string;
    reason: string;
    urgency: string;
    clinicalNotes?: string;
  }) => api.post<any>('/doctor/referrals', data),
  getReferrals: () => api.get<{ items: any[] }>('/doctor/referrals'),
  acceptReferral: (id: string, notes?: string) =>
    api.post<any>(`/doctor/referrals/${id}/accept`, { notes }),
  rejectReferral: (id: string, reason: string) =>
    api.post<any>(`/doctor/referrals/${id}/reject`, { reason }),
};

export const facilityApi = {
  getOverview: (facilityId?: string) => {
    const qs = facilityId ? `?facilityId=${facilityId}` : '';
    return api.get<any>(`/facility/overview${qs}`);
  },
  getQueue: (facilityId?: string, department = 'GENERAL_MEDICINE') => {
    const qs = facilityId ? `?facilityId=${facilityId}&department=${department}` : `?department=${department}`;
    return api.get<any>(`/facility/queues${qs}`);
  },
  issueWalkinToken: (facilityId: string, data: {
    patientName?: string;
    patientPhone?: string;
    patientId?: string;
    department?: string;
    priority?: string;
    serviceDate?: string;
  }) => api.post<any>(`/facility/queues/${facilityId}/walkin`, data),
  callNext: (facilityId: string, department = 'GENERAL_MEDICINE') =>
    api.post<any>(`/facility/queues/${facilityId}/call-next`, { department }),
  completeConsultation: (facilityId: string, tokenId: string) =>
    api.post<any>(`/facility/queues/${facilityId}/complete`, { tokenId }),
  getReferrals: (facilityId?: string) => {
    const qs = facilityId ? `?facilityId=${facilityId}` : '';
    return api.get<{ items: any[] }>(`/facility/referrals${qs}`);
  },
  acceptReferral: (id: string, notes?: string) =>
    api.post<any>(`/facility/referrals/${id}/accept`, { notes }),
};

export const districtApi = {
  getOverview: () => api.get<any>('/district/overview'),
  getFacilities: () => api.get<{ items: any[] }>('/district/facilities'),
  getMapFacilities: () => api.get<{ items: any[] }>('/district/facilities/map'),
  getReferralFunnel: () => api.get<any>('/district/referrals/funnel'),
  getDataQualityIssues: () => api.get<{ items: any[] }>('/district/data-quality/issues'),
  resolveDataQualityIssue: (id: string, resolutionAction: string, notes?: string) =>
    api.post<any>(`/district/data-quality/issues/${id}/resolve`, { resolutionAction, notes }),
};
