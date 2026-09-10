import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Navbar } from '../components/navbar';

export const metadata: Metadata = {
  title: 'MahaSwasthya Grid — Public Healthcare Access & Continuity Network',
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
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto space-y-1">
              <p className="font-semibold text-slate-700">
                MahaSwasthya Grid — SIH26133 Working Prototype
              </p>
              <p>
                Decision support system only. Not a clinical diagnosis. Operational metrics are synthetic DEMO DATA.
              </p>
              <p className="text-slate-400">
                Government of Maharashtra · Health & Family Welfare Department · Mumbai Suburban District
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
