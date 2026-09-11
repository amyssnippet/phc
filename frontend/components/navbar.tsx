'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, DEMO_ACCOUNTS } from '../lib/auth/auth-context';
import { useI18n } from '../lib/i18n/i18n-context';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Globe,
  User,
  Shield,
  Stethoscope,
  Building2,
  BarChart3,
  MapPin,
} from 'lucide-react';

export function Navbar() {
  const { user, isOnline, pendingSyncCount, loginWithDemo, syncOfflineData } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const pathname = usePathname();

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'CITIZEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FRONTLINE_WORKER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DOCTOR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'FACILITY_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DISTRICT_ADMIN':
      case 'SUPER_ADMIN':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Prototype Demo Banner (Section 47) */}
      <div className="bg-slate-900 text-slate-200 text-xs px-3 sm:px-4 py-1 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[9px] tracking-wide uppercase shrink-0">
            SIH 2026
          </span>
          <span className="truncate text-[11px] text-slate-300">
            Govt of Maharashtra · SwasthyaSetu Grid
          </span>
        </div>

        {/* Network & Sync status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Offline Mode
              </span>
            )}
          </div>

          {pendingSyncCount > 0 && (
            <button
              onClick={syncOfflineData}
              className="flex items-center gap-1 bg-amber-600/80 hover:bg-amber-600 text-white px-2 py-0.5 rounded text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{pendingSyncCount} pending</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-0.5 text-xs">
            <Globe className="w-3 h-3 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-slate-900">English</option>
              <option value="mr" className="bg-slate-900">मराठी (Marathi)</option>
              <option value="hi" className="bg-slate-900">हिन्दी (Hindi)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
                {t('appName')}
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {t('tagline')}
              </div>
            </div>
          </Link>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center gap-1">
            {user?.role === 'CITIZEN' ? (
              <>
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t('facilities')}
                </Link>
                <Link
                  href="/find-care"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/find-care' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t('findCare')}
                </Link>
                <Link
                  href="/citizen/appointments"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/citizen/appointments') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  My Tokens
                </Link>
                <Link
                  href="/citizen/referrals"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/citizen/referrals') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t('myReferrals')}
                </Link>
                <Link
                  href="/citizen/records"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/citizen/records') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Health Records
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/portal"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/portal' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Portal
                </Link>
                <Link
                  href="/portal/queues"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/portal/queues') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  OPD Queues
                </Link>
                <Link
                  href="/portal/patients"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/portal/patients') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Patients
                </Link>
                <Link
                  href="/portal/triage"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/portal/triage') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Triage
                </Link>
                <Link
                  href="/portal/referrals"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/portal/referrals') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Referrals
                </Link>
                <Link
                  href="/command/map"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith('/command') ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  District GIS
                </Link>
              </>
            )}
          </nav>

          {/* Demo Persona Switcher (Section 45 & 58) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 shadow-xs max-w-[135px] sm:max-w-none">
              <User className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <select
                value={DEMO_ACCOUNTS.find((a) => a.phone === user?.phone)?.key || 'citizen'}
                onChange={(e) => loginWithDemo(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-bold text-slate-900 focus:outline-none cursor-pointer truncate max-w-[105px] sm:max-w-none"
                title="Switch Persona Demo Account"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.key} value={acc.key}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
