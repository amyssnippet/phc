import { api } from './client';

export const appointmentsApi = {
  list: (params?: { facilityId?: string; patientId?: string; status?: string; page?: number }) =>
    api.get<{ items: any[] }>('/appointments', params),

  create: (payload: {
    patientId: string;
    facilityId: string;
    appointmentDate: string;
    startTime?: string;
    endTime?: string;
    department?: string;
  }) => api.post<any>('/appointments', payload),

  getById: (id: string) => api.get<any>(`/appointments/${id}`),

  checkIn: (id: string) => api.post<any>(`/appointments/${id}/check-in`),

  cancel: (id: string) => api.post<any>(`/appointments/${id}/cancel`),
};
