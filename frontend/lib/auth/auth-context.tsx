'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, UserProfile } from '../api/auth.api';
import { syncManager } from '../offline/sync-manager';

export const DEMO_ACCOUNTS = [
  { role: 'CITIZEN' as const, name: 'Rajesh Patil (Citizen)', phone: '9000000001' },
  { role: 'FRONTLINE_WORKER' as const, name: 'Demo ASHA Worker', phone: '9000000002' },
  { role: 'DOCTOR' as const, name: 'Demo Doctor (MBBS, MD)', phone: '9000000003' },
  { role: 'FACILITY_ADMIN' as const, name: 'Demo Facility Administrator', phone: '9000000004' },
  { role: 'DISTRICT_ADMIN' as const, name: 'Demo District Health Officer', phone: '9000000005' },
];

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  loginWithDemo: (role: UserProfile['role']) => Promise<void>;
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

      // Check pending count
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
      const savedToken = localStorage.getItem('mahaswasthya_token');
      const savedUser = localStorage.getItem('mahaswasthya_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        try {
          if (navigator.onLine) {
            const meRes = await authApi.getMe();
            if (meRes.success && meRes.data) {
              setUser(meRes.data);
              localStorage.setItem('mahaswasthya_user', JSON.stringify(meRes.data));
            }
          }
        } catch {
          // Keep cached user offline
        }
      } else {
        // Default to demo citizen in prototype mode
        await loginWithDemo('CITIZEN');
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const loginWithDemo = async (role: UserProfile['role']) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role) || DEMO_ACCOUNTS[0];
    await loginWithOtp(account.phone, '123456', role, account.name);
  };

  const loginWithOtp = async (phone: string, otp: string, role?: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp, role, name);
      if (res.success && res.data) {
        setUser(res.data.user);
        setToken(res.data.accessToken);
        localStorage.setItem('mahaswasthya_token', res.data.accessToken);
        localStorage.setItem('mahaswasthya_user', JSON.stringify(res.data.user));
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
    localStorage.removeItem('mahaswasthya_token');
    localStorage.removeItem('mahaswasthya_user');
  };

  const syncOfflineData = async () => {
    try {
      const res = await syncManager.syncNow();
      const count = await syncManager.getPendingCount();
      setPendingSyncCount(count);
    } catch {
      // Sync error handled by manager
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
