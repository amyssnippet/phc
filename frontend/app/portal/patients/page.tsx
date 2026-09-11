'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { workerApi, doctorApi } from '../../../lib/api/scoped.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Users, Search, UserPlus, Phone, MapPin, Calendar, ArrowRight } from 'lucide-react';

export default function ScopedPatientsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['worker-patients', searchTerm],
    queryFn: () => workerApi.getPatients({ q: searchTerm || undefined }),
  });

  const patients = data?.data?.items || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scoped Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly scoped to your assigned catchment (Kandivali West) and clinical encounters.
          </p>
        </div>

        <Link href="/portal/patients/new">
          <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-sm text-xs">
            <UserPlus className="w-4 h-4" /> Enroll New Citizen
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or patient code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
        />
      </div>

      {/* Patients Table / List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No patients found matching criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p: any) => (
              <div
                key={p.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {p.firstName} {p.lastName || ''}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                      {p.patientCode}
                    </span>
                    {p.sex && <Badge variant="default" className="text-[9px]">{p.sex}</Badge>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {p.phone}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Pincode: {p.pincode || '400067'}
                    </span>
                    {p.catchmentCode && (
                      <>
                        <span>·</span>
                        <span className="text-blue-700 font-medium">
                          {p.catchmentCode}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/portal/triage?patientId=${p.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Triage
                    </Button>
                  </Link>
                  <Link href={`/portal/referrals?patientId=${p.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Refer
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
