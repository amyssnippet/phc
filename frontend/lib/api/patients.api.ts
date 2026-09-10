import { api } from './client';

export const patientsApi = {
  list: (params?: { q?: string; pincode?: string; patientCode?: string; page?: number; limit?: number }) =>
    api.get<{ items: any[] }>('/patients', params),

  create: (payload: any) => api.post<any>('/patients', payload),

  getById: (id: string) => api.get<any>(`/patients/${id}`),

  getTimeline: (id: string) => api.get<any>(`/patients/${id}/timeline`),

  getReferrals: (id: string) => api.get<any[]>(`/patients/${id}/referrals`),

  getFollowups: (id: string) => api.get<any[]>(`/patients/${id}/followups`),

  getAppointments: (id: string) => api.get<any[]>(`/patients/${id}/appointments`),
};
