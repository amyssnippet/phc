import { api } from './client';

export const followupsApi = {
  list: (params?: { patientId?: string; status?: string; type?: string }) =>
    api.get<{ items: any[] }>('/followups', params),

  create: (payload: {
    patientId: string;
    encounterId?: string;
    type: string;
    dueDate: string;
    assignedTo?: string;
    notes?: string;
  }) => api.post<any>('/followups', payload),

  getById: (id: string) => api.get<any>(`/followups/${id}`),

  complete: (id: string, notes?: string) => api.post<any>(`/followups/${id}/complete`, { notes }),
};
