'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { referralsApi } from '../../../lib/api/referrals.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ArrowRight, FileText, Building2, Clock, CheckCircle2 } from 'lucide-react';

export default function CitizenReferralsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-referrals', user?.patientId],
    queryFn: () => referralsApi.list({ patientId: user?.patientId || undefined }),
  });

  const referrals = data?.data?.items || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'ACCEPTED':
      case 'APPOINTMENT_BOOKED':
      case 'PATIENT_ARRIVED':
      case 'CONSULTED':
        return <Badge variant="info">In Progress ({status.replace('_', ' ')})</Badge>;
      case 'REJECTED':
      case 'CANCELLED':
        return <Badge variant="danger">{status}</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Care Continuity & Referrals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track inter-facility specialist referral handoffs across Mumbai Suburban public facilities.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-slate-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No referrals found for your account.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {referrals.map((ref: any) => (
            <Card key={ref.id} className="hover:border-blue-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ref.status)}
                    <span className="text-xs text-slate-400">
                      ID: {ref.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                    <span>{ref.sourceFacility?.name || 'Primary Clinic'}</span>
                    <ArrowRight className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700">{ref.destinationFacility?.name || 'Referral Hospital'}</span>
                  </div>

                  <p className="text-xs text-slate-600">
                    <strong>Reason:</strong> {ref.reason}
                  </p>
                </div>

                <div className="shrink-0">
                  <Link href={`/citizen/referrals/${ref.id}`}>
                    <Button variant="outline" size="sm">
                      View Care Timeline →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
