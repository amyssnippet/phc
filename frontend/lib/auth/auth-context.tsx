'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, UserProfile } from '../api/auth.api';
import { syncManager } from '../offline/sync-manager';

export const DEMO_ACCOUNTS = [
  { key: 'citizen', role: 'CITIZEN' as const, name: 'Sunita Patil (Citizen Dhanukarwadi)', phone: '9800000001' },
  { key: 'chw', role: 'CHW' as const, name: 'Priya Shinde (CHW Kandivali West)', phone: '9800000002' },
  { key: 'doctor', role: 'DOCTOR' as const, name: 'Dr. Neha Kulkarni (Doctor Dhanukarwadi)', phone: '9800000003' },
  { key: 'facility_admin', role: 'FACILITY_ADMIN' as const, name: 'Admin Dhanukarwadi (Facility Admin)', phone: '9800000004' },
  { key: 'district_officer', role: 'DISTRICT_OFFICER' as const, name: 'Dr. Anand Mehta (DHO Mumbai Suburban)', phone: '9800000005' },
  { key: 'doctor_ddu2', role: 'DOCTOR' as const, name: 'Dr. Rajesh Sharma (Doctor DDU2 RCH)', phone: '9800000006' },
  { key: 'citizen_b', role: 'CITIZEN' as const, name: 'Aarav Gaikwad (Citizen Malad)', phone: '9800000007' },
];

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  loginWithDemo: (keyOrRole: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string, role?: string, name?: string) => Promise<void>;
  logout: () => void;
  syncOfflineData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isOnline: true,
  pendingSyncCount: 0,
  loginWithDemo: async () => {},
  loginWithOtp: async () => {},
  logout: () => {},
  syncOfflineData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Network monitor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        syncOfflineData();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      syncManager.getPendingCount().then(setPendingSyncCount);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Restore user session
  useEffect(() => {
    async function restore() {
      const savedToken =
        localStorage.getItem('swasthyasetu_token') || localStorage.getItem('mahaswasthya_token');
      const savedUser =
        localStorage.getItem('swasthyasetu_user') || localStorage.getItem('mahaswasthya_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        try {
          if (navigator.onLine) {
            const meRes = await authApi.getMe();
            if (meRes.success && meRes.data) {
              setUser(meRes.data);
              localStorage.setItem('swasthyasetu_user', JSON.stringify(meRes.data));
            }
          }
        } catch {
          // Keep cached user offline
        }
      } else {
        // Default to demo citizen in prototype mode
        await loginWithDemo('citizen');
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const loginWithDemo = async (keyOrRole: string) => {
    setIsLoading(true);
    try {
      const account =
        DEMO_ACCOUNTS.find((a) => a.key === keyOrRole || a.role === keyOrRole) || DEMO_ACCOUNTS[0];

      const res = await authApi.demoLogin(account.key, account.phone);
      if (res.success && res.data) {
        setUser(res.data.user);
        setToken(res.data.accessToken);
        localStorage.setItem('swasthyasetu_token', res.data.accessToken);
        localStorage.setItem('swasthyasetu_user', JSON.stringify(res.data.user));
        localStorage.setItem('mahaswasthya_token', res.data.accessToken);
        localStorage.setItem('mahaswasthya_user', JSON.stringify(res.data.user));

        // Flush all cached client queries to eliminate cross-persona data leakage
        queryClient.clear();
      }
    } catch (err: any) {
      console.error('Demo persona switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (phone: string, otp: string, role?: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp, role, name);
      if (res.success && res.data) {
        setUser(res.data.user);
        setToken(res.data.accessToken);
        localStorage.setItem('swasthyasetu_token', res.data.accessToken);
        localStorage.setItem('swasthyasetu_user', JSON.stringify(res.data.user));
        localStorage.setItem('mahaswasthya_token', res.data.accessToken);
        localStorage.setItem('mahaswasthya_user', JSON.stringify(res.data.user));
        queryClient.clear();
      } else {
        throw new Error(res.error?.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('swasthyasetu_token');
    localStorage.removeItem('swasthyasetu_user');
    localStorage.removeItem('mahaswasthya_token');
    localStorage.removeItem('mahaswasthya_user');
    queryClient.clear();
  };

  const syncOfflineData = async () => {
    try {
      await syncManager.syncNow();
      const count = await syncManager.getPendingCount();
      setPendingSyncCount(count);
    } catch {
      // Handled by manager
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isOnline,
        pendingSyncCount,
        loginWithDemo,
        loginWithOtp,
        logout,
        syncOfflineData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
