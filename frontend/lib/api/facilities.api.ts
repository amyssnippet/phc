import { api } from './client';

export interface FacilityPublic {
  id: string;
  externalFacilityId: string;
  name: string;
  facilityType: string;
  serviceType: string | null;
  ownership: string | null;
  pincode: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location: { latitude: number; longitude: number } | null;
  operationalStatus: string | null;
  emrEnabled: boolean;
  abdmEnabled: boolean;
  specialties: string[];
  hours: any[];
  resources: any | null;
  sourceLastUpdated: string | null;
  dataQualityScore: number;
  distanceKm?: number;
  isOpenNow?: boolean;
}

export const facilitiesApi = {
  list: (params?: { q?: string; pincode?: string; specialty?: string; page?: number; limit?: number }) =>
    api.get<{ items: FacilityPublic[] }>('/facilities', params),

  search: (params?: { q?: string; pincode?: string; specialty?: string; page?: number; limit?: number }) =>
    api.get<{ items: FacilityPublic[] }>('/facilities/search', params),

  nearby: (params: { lat: number; lng: number; radius?: number; specialty?: string; openNow?: boolean }) =>
    api.get<{ items: FacilityPublic[] }>('/facilities/nearby', params),

  map: (bounds?: { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number }) =>
    api.get<any[]>('/facilities/map', bounds),

  getById: (id: string) => api.get<FacilityPublic & { diagnostics: any[]; demoCapabilities: any[] }>(`/facilities/${id}`),

  getQueue: (id: string) => api.get<any>(`/facilities/${id}/queue`),

  getDiagnostics: (id: string) => api.get<{ items: any[] }>(`/facilities/${id}/diagnostics`),
};
