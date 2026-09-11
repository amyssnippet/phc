'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, DEMO_ACCOUNTS } from '../../lib/auth/auth-context';
import { Badge } from '../../components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Stethoscope,
  Send,
  ShieldAlert,
  MapPin,
  Menu,
  X,
  UserCheck,
  Building2,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loginWithDemo } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If citizen navigates here, show notice or redirect
  const isCitizen = user?.role === 'CITIZEN';

  const navItems = [
    {
      href: '/portal',
      label: 'Portal Overview',
      icon: LayoutDashboard,
      roles: ['CHW', 'DOCTOR', 'FACILITY_ADMIN', 'DISTRICT_OFFICER', 'SUPER_ADMIN', 'FRONTLINE_WORKER', 'DISTRICT_ADMIN'],
    },
    {
      href: '/portal/queues',
      label: 'Live OPD Queues',
      icon: Ticket,
      roles: ['DOCTOR', 'FACILITY_ADMIN', 'SUPER_ADMIN'],
    },
    {
      href: '/portal/patients',
      label: 'Patient Roster',
      icon: Users,
      roles: ['CHW', 'DOCTOR', 'FACILITY_ADMIN', 'SUPER_ADMIN', 'FRONTLINE_WORKER'],
    },
    {
      href: '/portal/triage',
      label: 'Clinical Triage',
      icon: Stethoscope,
      roles: ['CHW', 'DOCTOR', 'SUPER_ADMIN', 'FRONTLINE_WORKER'],
    },
    {
      href: '/portal/referrals',
      label: 'Referral Desk',
      icon: Send,
      roles: ['CHW', 'DOCTOR', 'FACILITY_ADMIN', 'DISTRICT_OFFICER', 'SUPER_ADMIN', 'FRONTLINE_WORKER', 'DISTRICT_ADMIN'],
    },
    {
      href: '/portal/quality',
      label: 'Data Quality & CDSS',
      icon: ShieldAlert,
      roles: ['FACILITY_ADMIN', 'DISTRICT_OFFICER', 'SUPER_ADMIN', 'DISTRICT_ADMIN'],
    },
    {
      href: '/command/map',
      label: 'District GIS Map',
      icon: MapPin,
      roles: ['DISTRICT_OFFICER', 'FACILITY_ADMIN', 'SUPER_ADMIN', 'DISTRICT_ADMIN'],
    },
  ];

  const currentRole = user?.role || 'DOCTOR';
  const filteredNav = navItems.filter((item) => item.roles.includes(currentRole as any));

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] -m-4 sm:-m-6 lg:-m-8">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-3.5 bg-slate-900 text-white border-b border-slate-800">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="text-xs font-bold tracking-tight">SwasthyaSetu Workforce Portal</span>
        <Badge variant="info" className="text-[10px]">
          {user?.role || 'WORKFORCE'}
        </Badge>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* User Scope Banner */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.slice(0, 1) || 'W'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'Workforce User'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="info" className="text-[9px] py-0">
              {user?.role || 'DOCTOR'}
            </Badge>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Scoped
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive =
              item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </Link>
            );
          })}
        </nav>

        {/* Persona quick switch footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Switch Workforce Role
          </div>
          <select
            value={user?.role || 'DOCTOR'}
            onChange={(e) => {
              loginWithDemo(e.target.value as any);
              setSidebarOpen(false);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
          >
            {DEMO_ACCOUNTS.map((acc) => (
              <option key={acc.role} value={acc.role}>
                {acc.name}
              </option>
            ))}
          </select>
          <div className="pt-1 flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] text-blue-400 hover:underline"
              onClick={() => setSidebarOpen(false)}
            >
              ← Public App
            </Link>
            <button
              onClick={logout}
              className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 bg-slate-50 min-h-screen overflow-x-hidden">
        {isCitizen ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-6 flex items-center justify-between">
            <span>You are currently logged in as a Citizen. Switch to a workforce persona to access clinical and administrative tools.</span>
            <button
              onClick={() => loginWithDemo('DOCTOR')}
              className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded hover:bg-amber-700"
            >
              Switch to Doctor
            </button>
          </div>
        ) : null}
        {children}
      </main>

      {/* Mobile Workforce Bottom Navigation (Section 11) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 lg:hidden shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          <Link
            href="/portal"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] ${
              pathname === '/portal' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </Link>
          <Link
            href="/portal/queues"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] ${
              pathname.startsWith('/portal/queues') ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Queue</span>
          </Link>
          <Link
            href="/portal/patients"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] ${
              pathname.startsWith('/portal/patients') ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Patients</span>
          </Link>
          <Link
            href="/portal/referrals"
            className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] ${
              pathname.startsWith('/portal/referrals') ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Referrals</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
