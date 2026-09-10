'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '../../../../lib/api/referrals.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building2,
  Stethoscope,
  Calendar,
  UserCheck,
  Check,
  AlertCircle,
} from 'lucide-react';

const MILESTONES = [
  { key: 'CREATED', label: 'Referral Initiated' },
  { key: 'SENT', label: 'Transmitted to Receiving Facility' },
  { key: 'ACCEPTED', label: 'Accepted by Receiving Facility' },
  { key: 'APPOINTMENT_BOOKED', label: 'Specialist Slot Scheduled' },
  { key: 'PATIENT_ARRIVED', label: 'Patient Checked In' },
  { key: 'CONSULTED', label: 'Specialist Assessment Completed' },
  { key: 'FOLLOWUP_CREATED', label: 'Post-Referral Follow-up Scheduled' },
  { key: 'COMPLETED', label: 'Referral Journey Completed' },
];

export default function ReferralTimelinePage() {
  const params = useParams();
  const referralId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['referral-timeline', referralId],
    queryFn: () => referralsApi.getTimeline(referralId),
  });

  const referral = data?.data;

  if (isLoading) {
    return <div className="h-64 bg-slate-100 animate-pulse rounded-2xl max-w-3xl mx-auto"></div>;
  }

  if (!referral) {
    return (
      <Card className="text-center py-12 max-w-3xl mx-auto">
        <p className="text-slate-500">Referral not found.</p>
      </Card>
    );
  }

  const events = referral.events || [];
  const eventTypesPassed = events.map((e: any) => e.eventType);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/citizen/referrals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Referrals
      </Link>

      {/* Overview Card */}
      <Card className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
              Official Care Transfer Document
            </span>
            <Badge variant="success">Status: {referral.status}</Badge>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold">
            Referral Journey: {referral.sourceFacility?.name} → {referral.destinationFacility?.name}
          </h2>

          <div className="bg-white/10 rounded-lg p-3 text-xs text-blue-100 space-y-1">
            <div>
              <strong>Patient:</strong> {referral.patient?.firstName} {referral.patient?.lastName} ({referral.patient?.patientCode})
            </div>
            <div>
              <strong>Clinical Justification:</strong> {referral.reason}
            </div>
            <div>
              <strong>Urgency Priority:</strong> {referral.urgency}
            </div>
          </div>
        </div>
      </Card>

      {/* Flagship Vertical Timeline (Section 67) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Care Continuity Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {MILESTONES.map((step, idx) => {
              const hasPassed = eventTypesPassed.includes(step.key);
              const eventRecord = events.find((e: any) => e.eventType === step.key);

              return (
                <div key={step.key} className="relative flex items-start gap-4">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${
                      hasPassed ? 'bg-emerald-600 shadow-sm' : 'bg-slate-300'
                    }`}
                  >
                    {hasPassed ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="space-y-1">
                    <h4
                      className={`text-sm font-semibold ${
                        hasPassed ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </h4>

                    {eventRecord ? (
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <div>
                          Completed on {new Date(eventRecord.createdAt).toLocaleString()}
                        </div>
                        {eventRecord.performedBy && (
                          <div className="text-slate-600">
                            Logged by: <strong>{eventRecord.performedBy}</strong>
                          </div>
                        )}
                        {eventRecord.metadata?.note && (
                          <div className="italic text-slate-400">
                            "{eventRecord.metadata.note}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Pending workflow action</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
