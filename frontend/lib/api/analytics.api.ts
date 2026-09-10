import { api } from './client';

export const analyticsApi = {
  getOverview: () => api.get<any>('/analytics/overview'),
  getFacilities: () => api.get<{ items: any[] }>('/analytics/facilities'),
  getReferrals: () => api.get<{ funnel: any[] }>('/analytics/referrals'),
  getFollowups: () => api.get<any>('/analytics/followups'),
  getDataQuality: () => api.get<any>('/analytics/data-quality'),
  getDataQualitySummary: () => api.get<any>('/data-quality/summary'),
  getDataQualityIssues: (params?: { type?: string; status?: string }) =>
    api.get<{ items: any[] }>('/data-quality/issues', params),
  resolveIssue: (id: string) => api.post<any>(`/data-quality/issues/${id}/resolve`),
};
