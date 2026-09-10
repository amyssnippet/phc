import { api } from './client';

export const queuesApi = {
  get: (facilityId: string) => api.get<any>(`/queues/${facilityId}`),

  join: (facilityId: string, payload: { patientId: string; department?: string; priority?: string }) =>
    api.post<any>(`/queues/${facilityId}/join`, payload),

  callNext: (facilityId: string) => api.post<any>(`/queues/${facilityId}/call-next`),

  complete: (facilityId: string, tokenId?: string) =>
    api.post<any>(`/queues/${facilityId}/complete`, { tokenId }),
};
