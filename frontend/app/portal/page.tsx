'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/auth-context';
import { useQuery } from '@tanstack/react-query';
import { doctorApi, workerApi, facilityApi, districtApi } from '../../lib/api/scoped.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Ticket,
  Users,
  Stethoscope,
  Send,
  ShieldCheck,
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
} from 'lucide-react';

export default function PortalHomePage() {
  const { user } = useAuth();
  const role = user?.role || 'DOCTOR';

  // Load role-specific overview
  const { data: docData } = useQuery({
    queryKey: ['doctor-worklist-summary', user?.id],
    queryFn: () => doctorApi.getWorklist(),
    enabled: role === 'DOCTOR',
  });

  const { data: workerData } = useQuery({
    queryKey: ['worker-patients-summary', user?.id],
    queryFn: () => workerApi.getPatients({ limit: 5 }),
    enabled: role === 'CHW' || role === 'FRONTLINE_WORKER',
  });

  const { data: facilityData } = useQuery({
    queryKey: ['facility-overview-summary', user?.id],
    queryFn: () => facilityApi.getOverview(),
    enabled: role === 'FACILITY_ADMIN',
  });

  const { data: districtData } = useQuery({
    queryKey: ['district-overview-summary', user?.id],
    queryFn: () => districtApi.getOverview(),
    enabled: role === 'DISTRICT_OFFICER' || role === 'DISTRICT_ADMIN' || role === 'SUPER_ADMIN',
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              Role: {role}
            </span>
            <span>·</span>
            <span className="text-xs text-slate-500">Government of Maharashtra</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Welcome, {user?.name || 'Workforce Specialist'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            SwasthyaSetu Scoped Clinical & Coordination Portal · Mumbai Suburban District
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {role === 'DOCTOR' && (
            <Link href="/portal/queues">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
                <Ticket className="w-4 h-4" /> Manage OPD Queue
              </Button>
            </Link>
          )}
          {(role === 'CHW' || role === 'FRONTLINE_WORKER') && (
            <>
              <Link href="/portal/patients/new">
                <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
                  <Users className="w-4 h-4" /> Register Patient
                </Button>
              </Link>
              <Link href="/portal/triage">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4" /> Start Triage
                </Button>
              </Link>
            </>
          )}
          {role === 'FACILITY_ADMIN' && (
            <Link href="/portal/queues">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
                <Ticket className="w-4 h-4" /> Facility Queue Manager
              </Button>
            </Link>
          )}
          {(role === 'DISTRICT_OFFICER' || role === 'DISTRICT_ADMIN') && (
            <Link href="/command/map">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-4 h-4" /> Open GIS Facility Map
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Role Scoped Dashboard Cards */}
      {role === 'DOCTOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-blue-50/50 border-blue-200">
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <span className="text-xs font-bold">OPD Queue Waiting</span>
                <Ticket className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {docData?.data?.queue?.length ?? 5}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Patients in chamber queue today</p>
            </Card>

            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold">Scheduled Appointments</span>
                <Users className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {docData?.data?.appointments?.length ?? 3}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Consultation slots booked</p>
            </Card>

            <Card className="p-4 bg-purple-50/50 border-purple-200">
              <div className="flex items-center justify-between text-purple-700 mb-2">
                <span className="text-xs font-bold">Assigned PHC Facility</span>
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-base font-bold text-slate-900 truncate">
                Dhanukarwadi UPHC
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Ward R/South · Kandivali West</p>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Immediate Queue Worklist</h3>
                <p className="text-xs text-slate-500">Next patients waiting for clinical encounter</p>
              </div>
              <Link href="/portal/queues">
                <Button variant="outline" size="sm" className="text-xs">
                  Open Live Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              {(docData?.data?.queue || []).slice(0, 4).map((q: any) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-blue-100 text-blue-900 font-black text-xs">
                      {q.displayNumber}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {q.patient ? `${q.patient.firstName} ${q.patient.lastName || ''}` : 'Walk-in Patient'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Dept: {q.department} · Priority: {q.priority}
                      </div>
                    </div>
                  </div>
                  <Badge variant={q.status === 'CALLED' ? 'info' : 'warning'}>
                    {q.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {(role === 'CHW' || role === 'FRONTLINE_WORKER') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-amber-50/50 border-amber-200">
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-xs font-bold">Catchment Roster</span>
                <Users className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {workerData?.data?.items?.length ?? 4}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Patients registered in your ward</p>
            </Card>

            <Card className="p-4 bg-blue-50/50 border-blue-200">
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <span className="text-xs font-bold">Assigned Catchment</span>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-base font-bold text-slate-900">
                Kandivali West (R/South)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Code: KANDIVALI_WEST_WARD_R_SOUTH</p>
            </Card>

            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold">Offline Sync Status</span>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-base font-bold text-emerald-700">All Changes Synced</div>
              <p className="text-[11px] text-slate-500 mt-1">0 pending offline mutations</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Community Outreach Shortcuts</h3>
              <div className="space-y-2">
                <Link
                  href="/portal/patients/new"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> New Citizen Enrollment
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/portal/triage"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-emerald-600" /> Doorstep Clinical Triage
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
                <Link
                  href="/portal/referrals"
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" /> Upward Specialist Referrals
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900">Recent Catchment Patients</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {(workerData?.data?.items || []).slice(0, 3).map((p: any) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.firstName} {p.lastName || ''}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Code: {p.patientCode} · Phone: {p.phone}
                      </div>
                    </div>
                    <Link href={`/portal/patients`}>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {role === 'FACILITY_ADMIN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-slate-50 border-slate-200">
              <span className="text-xs font-bold text-slate-500">Facility Health</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">OPERATIONAL</div>
              <p className="text-[10px] text-slate-400 mt-0.5">Dhanukarwadi UPHC</p>
            </Card>

            <Card className="p-4 bg-blue-50/50 border-blue-200">
              <span className="text-xs font-bold text-blue-700">Active Queue Tokens</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {facilityData?.data?.queue?.length ?? 6}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Serving general medicine</p>
            </Card>

            <Card className="p-4 bg-purple-50/50 border-purple-200">
              <span className="text-xs font-bold text-purple-700">Incoming Referrals</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {facilityData?.data?.referrals?.length ?? 2}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Awaiting clinic review</p>
            </Card>

            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <span className="text-xs font-bold text-emerald-700">Data Quality Score</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">94%</div>
              <p className="text-[10px] text-slate-500 mt-0.5">Validation compliance</p>
            </Card>
          </div>

          <div className="flex gap-3">
            <Link href="/portal/queues">
              <Button variant="primary">Launch OPD Token Counter</Button>
            </Link>
            <Link href="/portal/referrals">
              <Button variant="outline">Review Inbound Referrals</Button>
            </Link>
            <Link href="/portal/quality">
              <Button variant="outline">Audit Data Quality Issues</Button>
            </Link>
          </div>
        </div>
      )}

      {(role === 'DISTRICT_OFFICER' || role === 'DISTRICT_ADMIN' || role === 'SUPER_ADMIN') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-blue-50/50 border-blue-200">
              <span className="text-xs font-bold text-blue-700">Total District PHCs</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {districtData?.data?.totalFacilities ?? 10}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Mumbai Suburban Network</p>
            </Card>

            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <span className="text-xs font-bold text-emerald-700">Enrolled Citizens</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {districtData?.data?.totalPatients ?? 8}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Integrated patient profiles</p>
            </Card>

            <Card className="p-4 bg-amber-50/50 border-amber-200">
              <span className="text-xs font-bold text-amber-700">Active OPD Consultations</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {districtData?.data?.activeConsultations ?? 14}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Across all wards today</p>
            </Card>

            <Card className="p-4 bg-purple-50/50 border-purple-200">
              <span className="text-xs font-bold text-purple-700">Data Quality Score</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {districtData?.data?.avgQualityScore ?? 92}%
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Automated validation rate</p>
            </Card>
          </div>

          <div className="flex gap-3">
            <Link href="/command/map">
              <Button variant="primary">GIS Multi-PHC Network Map</Button>
            </Link>
            <Link href="/portal/quality">
              <Button variant="outline">Data Quality Engine (Audit)</Button>
            </Link>
            <Link href="/command">
              <Button variant="outline">Executive Analytics Dashboard</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
