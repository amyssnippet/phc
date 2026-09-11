import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Navbar } from '../components/navbar';
import { CitizenBottomNav } from '../components/citizen-bottom-nav';

export const metadata: Metadata = {
  title: 'SwasthyaSetu (स्वास्थ्यसेतु) — Public Healthcare Access & Continuity Network',
  description: 'Government of Maharashtra — SIH26133 Working Prototype for Public Healthcare Access and Care Continuity.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="flex flex-col min-h-screen">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8">
            {children}
          </main>
          <CitizenBottomNav />
          <footer className="bg-white/80 backdrop-blur-xs border-t border-slate-200/80 py-3 px-4 text-center text-[11px] text-slate-500 mb-16 sm:mb-0">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
              <p className="font-medium text-slate-600">
                SIH26133 • SwasthyaSetu (स्वास्थ्यसेतु) • Prototype
              </p>
              <p className="text-slate-400">
                Decision support only · Demo data where indicated
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
