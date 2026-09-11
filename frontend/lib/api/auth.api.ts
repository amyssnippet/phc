import { api } from './client';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role:
    | 'CITIZEN'
    | 'CHW'
    | 'DOCTOR'
    | 'FACILITY_ADMIN'
    | 'DISTRICT_OFFICER'
    | 'SUPER_ADMIN'
    | 'FRONTLINE_WORKER'
    | 'DISTRICT_ADMIN';
  preferredLanguage: string;
  patientId?: string | null;
  patientCode?: string | null;
  practitionerId?: string | null;
}

export const authApi = {
  sendOtp: (phone: string, role?: string) =>
    api.post<{ message: string; mockOtp?: string }>('/auth/send-otp', { phone, role }),

  verifyOtp: (phone: string, otp: string, role?: string, name?: string) =>
    api.post<{ user: UserProfile; accessToken: string; refreshToken: string }>('/auth/verify-otp', {
      phone,
      otp,
      role,
      name,
    }),

  demoLogin: (personaKey?: string, phone?: string) =>
    api.post<{ user: UserProfile; accessToken: string; refreshToken: string }>('/auth/demo-login', {
      personaKey,
      phone,
    }),

  getMe: () => api.get<UserProfile>('/auth/me'),

  logout: () => api.post('/auth/logout'),
};
