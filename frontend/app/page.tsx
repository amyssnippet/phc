'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { facilityRepository } from '../lib/offline/facility-repository';
import { FacilityPublic } from '../lib/api/facilities.api';
import { useI18n } from '../lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Stethoscope,
  ArrowRight,
  Sparkles,
  WifiOff,
} from 'lucide-react';

export default function HomePage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['facilities', searchTerm, selectedSpecialty],
    queryFn: () =>
      facilityRepository.search({
        q: searchTerm || undefined,
        specialty: selectedSpecialty || undefined,
      }),
  });

  const facilities = data?.items || [];
  const isOffline = data?.isOffline || false;

  const specialtiesList = [
    'General Medicine',
    'Obstetrics & Gynaecology',
    'Paediatrics',
    'Primary Care',
    'Anaesthesia',
    'Neonatology',
    'Gastroenterology',
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-700/80 text-blue-100 border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {t('mumbaiSuburban')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {t('appName')}
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            {t('tagline')}. Find functional public facilities, book consultation tokens, track specialist referrals, and maintain complete continuity of care.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/find-care">
              <Button variant="secondary" className="bg-white text-blue-900 hover:bg-blue-50 font-bold">
                {t('findCare')} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/citizen/referrals">
              <Button variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10">
                {t('myReferrals')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Offline Alert if active */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>{t('offlineMode')}:</strong> {t('offlineDesc')}
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
          >
            <option value="">All Specialties</option>
            {specialtiesList.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {/* Quick specialty tags */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Filter:</span>
          {specialtiesList.slice(0, 5).map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(selectedSpecialty === spec ? '' : spec)}
              className={`px-2.5 py-1 rounded-md border transition-colors ${
                selectedSpecialty === spec
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {spec}
            </button>
          ))}
          {selectedSpecialty && (
            <button
              onClick={() => setSelectedSpecialty('')}
              className="text-blue-600 hover:underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Facility Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">
          Public Healthcare Facilities ({facilities.length})
        </h2>
        <span className="text-xs text-slate-500 font-medium">
          Source: Health Facility Registry (HFR)
        </span>
      </div>

      {/* Facility Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-52 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No facilities matching your search criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((fac) => {
            const qualityScore = fac.dataQualityScore ?? 100;
            const qualityVariant =
              qualityScore >= 90 ? 'success' : qualityScore >= 75 ? 'info' : 'warning';

            return (
              <Card key={fac.id} className="hover:border-blue-300 transition-shadow hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {fac.facilityType || 'Primary Health Centre'}
                    </span>
                    <Badge variant={qualityVariant}>
                      Quality: {qualityScore}/100
                    </Badge>
                  </div>

                  <CardTitle className="text-base mb-1">
                    <Link href={`/facilities/${fac.id}`} className="hover:text-blue-700">
                      {fac.name}
                    </Link>
                  </CardTitle>

                  <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{fac.address || 'Mumbai Suburban District'}</span>
                  </div>

                  {/* Capabilities / Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {fac.serviceType && (
                      <Badge variant="outline" className="bg-slate-50">
                        {fac.serviceType}
                      </Badge>
                    )}
                    {fac.abdmEnabled && (
                      <Badge variant="success" className="text-[10px]">
                        ABDM Ready
                      </Badge>
                    )}
                    {fac.emrEnabled && (
                      <Badge variant="info" className="text-[10px]">
                        EMR Active
                      </Badge>
                    )}
                  </div>

                  {/* Specialties snippet */}
                  {fac.specialties && fac.specialties.length > 0 && (
                    <div className="text-xs text-slate-500 line-clamp-1 mb-4">
                      <strong className="text-slate-700">Specialties: </strong>
                      {fac.specialties.join(', ')}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {fac.operationalStatus || 'FUNCTIONAL'}
                  </span>
                  <Link href={`/facilities/${fac.id}`}>
                    <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800">
                      View Details & Queue →
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
