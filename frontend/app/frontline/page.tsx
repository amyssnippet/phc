'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  UserPlus, 
  Stethoscope, 
  Compass, 
  RefreshCw, 
  Users, 
  ChevronRight,
  ShieldAlert,
  Wifi,
  WifiOff,
  Search
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useI18n } from '@/lib/i18n/i18n-context';
import { patientsApi } from '@/lib/api/patients.api';
import { syncManager } from '@/lib/offline/sync-manager';
import { db } from '@/lib/offline/db';

export default function FrontlineDashboard() {
  const { t } = useI18n();
  const { user, isOnline } = useAuth();
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const count = await syncManager.getPendingCount();
        setPendingSyncCount(count);

        if (isOnline) {
          const res = await patientsApi.list({ limit: 10 });
          if (res.success && res.data) {
            setPatients(res.data.items || []);
          }
        } else {
          // Load local offline drafts
          const drafts = await db.patientDrafts.toArray();
          setPatients(drafts.map(d => ({
            id: d.clientDraftId,
            patientCode: 'DRAFT',
            firstName: d.firstName,
            lastName: d.lastName || '',
            phone: d.phone,
            pincode: d.pincode,
            createdAt: d.createdAt,
            isDraft: true,
          })));
        }
      } catch (err) {
        console.error('Failed to load frontline data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOnline]);

  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase();
    const name = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
    const code = (p.patientCode || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return name.includes(q) || code.includes(q) || phone.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Stethoscope className="w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                Frontline Healthcare Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white flex items-center gap-1">
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-300" /> : <WifiOff className="w-3 h-3 text-amber-300" />}
                {isOnline ? 'Connected' : 'Offline Mode Active'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Community Health Worker & Triage Desk
            </h1>
            <p className="text-emerald-100 mt-1 max-w-2xl text-sm">
              Standardized syndromic triage, point-of-care registration, algorithmic care routing, and offline-resilient sync for Mumbai Suburban district.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/frontline/sync">
              <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Queue {pendingSyncCount > 0 && `(${pendingSyncCount})`}
              </Button>
            </Link>
            <Link href="/frontline/patients/new">
              <Button className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold shadow-md">
                <UserPlus className="w-4 h-4 mr-2" />
                New Patient
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Clinical Safety Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Clinical Decision Support Policy (CDSS)</p>
          <p className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
            Triage recommendations generated here are assistive heuristics based on vital signs and reported symptoms. They do not constitute a definitive medical diagnosis and must be validated by an MO / Consultant at the receiving health post or hospital.
          </p>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/frontline/patients/new" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-emerald-500 border-2 border-transparent">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl group-hover:scale-110 transition-transform">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  Register Patient
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Works offline. Generates synthetic unique patient code.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/frontline/triage" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-teal-500 border-2 border-transparent">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-xl group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  Syndromic Triage
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Record vitals, assess red-flags & emergency tier.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/find-care" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-blue-500 border-2 border-transparent">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  Care Router
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Multi-criteria scoring across 10 UPHCs & Hospitals.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/frontline/sync" className="group">
          <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-purple-500 border-2 border-transparent">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                  Offline Sync
                  <Badge variant={pendingSyncCount > 0 ? "warning" : "success"} className="text-xs">
                    {pendingSyncCount} pending
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  IndexedDB mutation queue & conflict resolution.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Patient Directory & Quick Actions */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Active Patient Roster
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick lookup for screening, vitals recording, and care navigation.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search patient name, code, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading roster...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No patients found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(patient.firstName?.[0] || 'P').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {patient.firstName} {patient.lastName}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {patient.patientCode}
                        </Badge>
                        {patient.isDraft && (
                          <Badge variant="warning" className="text-xs">
                            Offline Draft
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {patient.phone && <span>Tel: {patient.phone}</span>}
                        {patient.pincode && <span>Pincode: {patient.pincode}</span>}
                        {patient.age && <span>Age: {patient.age}y</span>}
                        {patient.gender && <span>Gender: {patient.gender}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Link href={`/frontline/triage?patientId=${patient.id}`}>
                      <Button size="sm" variant="outline" className="text-teal-700 border-teal-200 hover:bg-teal-50">
                        <Stethoscope className="w-3.5 h-3.5 mr-1" />
                        Triage
                      </Button>
                    </Link>
                    <Link href={`/citizen/records?patientId=${patient.id}`}>
                      <Button size="sm" variant="ghost">
                        Timeline
                      </Button>
                    </Link>
                    <Link href={`/find-care?patientId=${patient.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Route Care
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
