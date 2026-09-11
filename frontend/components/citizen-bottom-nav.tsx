'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth/auth-context';
import { Home, Search, Ticket, FileText, Activity } from 'lucide-react';

export function CitizenBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Only display bottom nav for citizens or public visitors
  if (user && user.role !== 'CITIZEN') {
    return null;
  }

  // Don't show inside workforce portal routes
  if (pathname.startsWith('/portal') || pathname.startsWith('/command') || pathname.startsWith('/facility') || pathname.startsWith('/frontline')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/find-care', label: 'Find Care', icon: Search, exact: false },
    { href: '/citizen/appointments', label: 'My Tokens', icon: Ticket, exact: false },
    { href: '/citizen/referrals', label: 'Referrals', icon: Activity, exact: false },
    { href: '/citizen/records', label: 'Health Records', icon: FileText, exact: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg sm:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
