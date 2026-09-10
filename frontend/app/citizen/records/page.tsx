'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { patientsApi } from '../../../lib/api/patients.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Activity, Calendar, ShieldCheck, HeartPulse, User } from 'lucide-react';

export default function CitizenRecordsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-timeline', user?.patientId],
    queryFn: () => patientsApi.getTimeline(user?.patientId || 'MH-DEFAULT'),
    enabled: Boolean(user?.patientId),
  });

  const timeline = data?.data;
  const events = timeline?.events || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Care Journey & Health Timeline</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chronological record of clinical assessments, consultations, specialist referrals, and follow-ups.
        </p>
      </div>

      {timeline?.patient && (
        <Card className="bg-slate-50 border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-slate-800">{timeline.patient.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">ID: {timeline.patient.patientCode}</span>
            </div>
            {timeline.patient.abhaReference && (
              <Badge variant="success">ABHA: {timeline.patient.abhaReference}</Badge>
            )}
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-slate-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No care events recorded yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((ev: any, idx: number) => (
            <Card key={idx} className="hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={ev.type === 'REFERRAL' ? 'info' : ev.type === 'ENCOUNTER' ? 'warning' : 'success'}>
                      {ev.type}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(ev.date).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-900">{ev.title}</h4>

                  {ev.details?.chiefComplaint && (
                    <p className="text-xs text-slate-600">
                      <strong>Complaint:</strong> {ev.details.chiefComplaint}
                    </p>
                  )}
                  {ev.details?.reason && (
                    <p className="text-xs text-slate-600">
                      <strong>Referral Reason:</strong> {ev.details.reason}
                    </p>
                  )}
                  {ev.details?.notes && (
                    <p className="text-xs text-slate-500 italic">{ev.details.notes}</p>
                  )}
                </div>

                <div className="shrink-0">
                  <Badge variant="outline">{ev.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
