import { api } from './client';

export interface CareRoutingRecommendation {
  facilityId: string;
  name: string;
  facilityType: string;
  serviceType: string | null;
  distanceKm: number;
  score: number;
  reasons: string[];
  matchedCriteria: string[];
  penalties: string[];
  isOpenNow: boolean;
  dataQualityScore: number;
}

export const careRoutingApi = {
  recommend: (payload: {
    patientId?: string;
    symptoms: string[];
    urgency: string;
    requiredService?: string;
    requiredSpecialty?: string | null;
    location: { latitude: number; longitude: number };
  }) =>
    api.post<{
      recommendations: CareRoutingRecommendation[];
      disclaimer: string;
      intentInferred: any;
    }>('/care-routing/recommend', payload),
};
