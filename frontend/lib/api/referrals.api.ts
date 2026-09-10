import { api } from './client';

export const referralsApi = {
  list: (params?: { patientId?: string; sourceFacilityId?: string; destinationFacilityId?: string; status?: string }) =>
    api.get<{ items: any[] }>('/referrals', params),

  create: (payload: {
    patientId: string;
    encounterId?: string;
    sourceFacilityId: string;
    destinationFacilityId: string;
    reason: string;
    urgency?: string;
  }) => api.post<any>('/referrals', payload),

  getById: (id: string) => api.get<any>(`/referrals/${id}`),

  getTimeline: (id: string) => api.get<any>(`/referrals/${id}/timeline`),

  accept: (id: string) => api.post<any>(`/referrals/${id}/accept`),

  reject: (id: string, reason?: string) => api.post<any>(`/referrals/${id}/reject`, { reason }),

  bookAppointment: (id: string, payload: { appointmentDate: string; startTime?: string; endTime?: string }) =>
    api.post<any>(`/referrals/${id}/appointment`, payload),

  arrive: (id: string) => api.post<any>(`/referrals/${id}/arrive`),

  consult: (id: string) => api.post<any>(`/referrals/${id}/consult`),

  complete: (id: string) => api.post<any>(`/referrals/${id}/complete`),

  cancel: (id: string, reason?: string) => api.post<any>(`/referrals/${id}/cancel`, { reason }),
};
