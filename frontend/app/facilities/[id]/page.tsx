'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { facilitiesApi } from '../../../lib/api/facilities.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  Stethoscope,
  Users,
  Calendar,
  AlertTriangle,
  FileCheck2,
  Activity,
} from 'lucide-react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacilityDetailPage() {
  const params = useParams();
  const facilityId = params.id as string;

  const { data: facRes, isLoading } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: () => facilitiesApi.getById(facilityId),
  });

  const { data: queueRes } = useQuery({
    queryKey: ['facility-queue', facilityId],
    queryFn: () => facilitiesApi.getQueue(facilityId),
    refetchInterval: 5000,
  });

  const facility = facRes?.data;
  const queue = queueRes?.data;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="h-44 bg-slate-100 animate-pulse rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl"></div>
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <Card className="text-center py-12">
        <p className="text-slate-500">Facility record not found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Facility Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                {facility.facilityType}
              </span>
              <span className="text-slate-300">·</span>
              <Badge variant="success">SOURCE: HFR</Badge>
              <Badge variant="outline">Govt of Maharashtra</Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {facility.name}
            </h1>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{facility.address || 'Mumbai Suburban District'}</span>
              {facility.pincode && <span>— PIN: {facility.pincode}</span>}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">Data Quality Score</div>
              <div className="text-2xl font-black text-slate-900">
                {facility.dataQualityScore}/100
              </div>
            </div>
            <Link href="/find-care">
              <Button size="sm" variant="primary">
                Book Consultation Token
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100 text-xs">
          <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
            ● Status: {facility.operationalStatus || 'FUNCTIONAL'}
          </span>
          <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
            ABDM Certified: {facility.abdmEnabled ? 'Yes' : 'Pending'}
          </span>
          <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
            EMR Integration: {facility.emrEnabled ? 'Active' : 'No'}
          </span>
          <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 font-medium">
            Service Type: {facility.serviceType || 'OPD'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Hours & Specialties */}
        <div className="md:col-span-2 space-y-6">
          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-blue-700" />
                Operating Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 text-xs">
                {facility.hours && facility.hours.length > 0 ? (
                  facility.hours.map((h: any) => {
                    const isClosed = !h.active;
                    const hasInvalid = !h.closeTime && h.sourceValue?.morCloseTime?.includes('Invalid');

                    return (
                      <div key={h.id || h.weekday} className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-slate-700 w-24">
                          {WEEKDAYS[h.weekday] || `Day ${h.weekday}`}
                        </span>

                        <div>
                          {isClosed ? (
                            <span className="text-slate-400">Closed</span>
                          ) : h.is24Hours ? (
                            <span className="text-emerald-700 font-medium">Open 24 Hours</span>
                          ) : hasInvalid ? (
                            <span className="text-amber-700 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              {h.openTime || '09:00'} - Close Time Unconfirmed (Audit Logged)
                            </span>
                          ) : (
                            <span className="text-slate-800">
                              {h.openTime || '09:00'} — {h.closeTime || '17:00'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 py-3">General Outpatient Hours: 09:00 AM - 05:00 PM</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clinical Specialties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Stethoscope className="w-4 h-4 text-blue-700" />
                Registered Specialties & Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              {facility.specialties && facility.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {facility.specialties.map((spec: string) => (
                    <span
                      key={spec}
                      className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs">
                  Primary General Outpatient Services & Family Welfare
                </p>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="w-4 h-4 text-blue-700" />
                Diagnostic & Lab Services (Demo Data)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {facility.diagnostics && facility.diagnostics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {facility.diagnostics.map((d: any) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800">{d.name}</span>
                      <Badge variant="success" className="text-[10px]">
                        Available
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs">Basic diagnostic services available on-site.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Queue Tracker */}
        <div className="space-y-6">
          <Card className="border-blue-200 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Live OPD Queue
                </CardTitle>
                <Badge variant="success" className="text-[10px]">
                  LIVE DEMO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">
                  Currently Called
                </span>
                <span className="text-3xl font-black text-blue-700 tracking-wider">
                  {queue?.currentCalled?.tokenNumber || 'GM-014'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Consultation Room 1</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Waiting</span>
                  <span className="text-xl font-bold text-slate-900">
                    {queue?.waitingCount ?? 4} patients
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Est. Wait</span>
                  <span className="text-xl font-bold text-slate-900">
                    ~{queue?.averageEstimatedWaitMinutes ?? 25} mins
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/find-care" className="w-full">
                  <Button variant="primary" className="w-full text-xs">
                    Get In-Queue Token
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
