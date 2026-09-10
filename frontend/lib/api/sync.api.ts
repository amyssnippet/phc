import { api } from './client';

export const syncApi = {
  push: (payload: { deviceId: string; operations: any[] }) =>
    api.post<{ accepted: any[]; conflicts: any[]; failed: any[]; syncedCount: number }>('/sync/push', payload),

  pull: (deviceId: string, since?: string) =>
    api.post<any>('/sync/pull', { deviceId, since }),

  status: (deviceId: string) =>
    api.get<any>('/sync/status', { deviceId }),
};
