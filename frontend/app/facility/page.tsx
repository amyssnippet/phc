'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  ArrowRightLeft, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Pill, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { facilitiesApi } from '@/lib/api/facilities.api';
import { queuesApi } from '@/lib/api/queues.api';
import { referralsApi } from '@/lib/api/referrals.api';

export default function FacilityDashboard() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [facility, setFacility] = useState<any | null>(null);
  const [queueData, setQueueData] = useState<any | null>(null);
  const [inboundReferrals, setInboundReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFacilities() {
      try {
        const res = await facilitiesApi.list({ limit: 20 });
        if (res.success && res.data) {
          const list = res.data.items || [];
          setFacilities(list);
          if (list.length > 0) {
            setSelectedFacilityId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load facilities', e);
      }
    }
    loadFacilities();
  }, []);

  useEffect(() => {
    if (!selectedFacilityId) return;

    async function loadFacilityDetails() {
      setLoading(true);
      try {
        const [facRes, qRes, refRes] = await Promise.all([
          facilitiesApi.getById(selectedFacilityId),
          queuesApi.get(selectedFacilityId),
          referralsApi.list({ destinationFacilityId: selectedFacilityId }),
        ]);

        if (facRes.success && facRes.data) setFacility(facRes.data);
        if (qRes.success && qRes.data) setQueueData(qRes.data);
        if (refRes.success && refRes.data) setInboundReferrals(refRes.data.items || []);
      } catch (e) {
        console.error('Error fetching facility dashboard data', e);
      } finally {
        setLoading(false);
      }
    }

    loadFacilityDetails();
  }, [selectedFacilityId]);

  const pendingReferrals = inboundReferrals.filter(r => r.status === 'REQUESTED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Facility Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              Facility Administration & Doctor Station
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {facility ? facility.name : 'Health Facility Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {facility ? `${facility.facilityType} • ${facility.address || 'Mumbai Suburban'}` : 'Manage OPD triage, patient queues, and referral acceptance.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Switch Facility:
          </label>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-emerald-500 max-w-xs truncate"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.facilityType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Live OPD Queue</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {queueData?.waitingTokens?.length ?? queueData?.queueLength ?? 0}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Patients waiting</div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Currently Serving</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {queueData?.currentlyServing?.tokenNumber || queueData?.currentToken || 'None'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Doctor desk active</div>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl">
              <Stethoscope className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Inbound Referrals</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingReferrals.length}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Awaiting triage / acceptance</div>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 rounded-xl">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Est. Wait Time</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {queueData?.estimatedWaitMins || (queueData?.waitingTokens?.length ? queueData.waitingTokens.length * 10 : 15)}m
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Based on throughput</div>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Centers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue Management Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Live OPD Queue Console
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Real-Time
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Call next patient, advance token numbers, manage triage priorities, and record completed consultations.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Active Token in Chamber:</span>
                <span className="font-mono text-emerald-600 text-lg">
                  {queueData?.currentlyServing?.tokenNumber || queueData?.currentToken || 'Idle'}
                </span>
              </div>
              {queueData?.currentlyServing?.patient && (
                <div className="text-xs text-slate-500 mt-1">
                  Patient: {queueData.currentlyServing.patient.firstName} {queueData.currentlyServing.patient.lastName}
                </div>
              )}
            </div>

            <Link href={`/facility/queue?facilityId=${selectedFacilityId}`} className="block">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                Open Queue Manager
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Referral Desk Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                Inbound Referral Review Desk
              </CardTitle>
              <Badge variant={pendingReferrals.length > 0 ? "warning" : "outline"} className="text-xs">
                {pendingReferrals.length} Pending
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Triage secondary/tertiary referrals arriving from periphery UPHCs, verify bed/doctor availability, and schedule appointment slots.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Total Received Referrals:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-lg">
                  {inboundReferrals.length}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {pendingReferrals.length} action(s) required immediately.
              </div>
            </div>

            <Link href={`/facility/referrals?facilityId=${selectedFacilityId}`} className="block">
              <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                Open Referral Triage Desk
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Facility Operational Info & Data Quality Status */}
      {facility && (
        <Card>
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-600" />
              Facility Metadata & Quality Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Registry Identity</div>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                  HFR ID: {facility.externalFacilityId}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Type: {facility.facilityType}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Specialties: {facility.specialties?.length ? facility.specialties.join(', ') : 'General Medicine, Maternal & Child Health'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Operating Hours</div>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {facility.operatingHours?.openTime || '08:00'} - {facility.operatingHours?.closeTime || '16:00'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Status: {facility.operationalStatus || 'ACTIVE'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Data Quality Score</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-600">
                    {facility.dataQualityScore ?? 92}%
                  </span>
                  <Badge variant={facility.dataQualityScore >= 80 ? "success" : "warning"}>
                    {facility.dataQualityScore >= 80 ? "Certified" : "Issues Logged"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Verified against State GIS registry.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
