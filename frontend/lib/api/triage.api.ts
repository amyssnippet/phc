import { api } from './client';

export const triageApi = {
  create: (payload: {
    patientId: string;
    encounterId?: string;
    facilityId?: string;
    symptoms: string[];
    vitals: {
      temperatureC?: number | null;
      heartRate?: number | null;
      respiratoryRate?: number | null;
      oxygenSaturation?: number | null;
      bloodPressureSys?: number | null;
      bloodPressureDia?: number | null;
    };
  }) => api.post<any>('/triage', payload),

  getById: (id: string) => api.get<any>(`/triage/${id}`),

  complete: (id: string) => api.post<any>(`/triage/${id}/complete`),
};
