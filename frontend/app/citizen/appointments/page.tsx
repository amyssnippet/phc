'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../../lib/api/appointments.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Ticket, AlertCircle } from 'lucide-react';

export default function CitizenAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-appointments', user?.patientId],
    queryFn: () => appointmentsApi.list({ patientId: user?.patientId || undefined }),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-appointments'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-appointments'] });
    },
  });

  const appointments = data?.data?.items || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Consultation Tokens</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track scheduled appointments and outpatient queue tokens.
          </p>
        </div>
        <Link href="/find-care">
          <Button variant="primary" size="sm">
            + Book New Token
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No appointments scheduled.</p>
          <Link href="/find-care" className="mt-3 inline-block">
            <Button variant="primary" size="sm">
              Find Care Near Me
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((app: any) => {
            const isBooked = app.status === 'BOOKED';
            const isCheckedIn = app.status === 'CHECKED_IN';
            const isCompleted = app.status === 'COMPLETED';

            return (
              <Card key={app.id} className="hover:border-blue-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center text-center shrink-0">
                      <Ticket className="w-4 h-4 text-blue-700 mb-0.5" />
                      <span className="text-xs font-black text-blue-900">
                        {app.tokenNumber || 'TOKEN'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">
                          {app.facility?.name || 'Primary Health Center'}
                        </h4>
                        <Badge
                          variant={
                            isCompleted ? 'success' : isCheckedIn ? 'info' : isBooked ? 'warning' : 'default'
                          }
                        >
                          {app.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(app.appointmentDate).toLocaleDateString()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {app.startTime} - {app.endTime}
                        </span>
                      </div>

                      {app.queueToken && (
                        <div className="text-xs text-slate-600 font-medium">
                          Queue Department: {app.queueToken.department} · Priority: {app.queueToken.priority}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {isBooked && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => checkInMutation.mutate(app.id)}
                        isLoading={checkInMutation.isPending}
                      >
                        Self Check-In
                      </Button>
                    )}
                    {isBooked && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(app.id)}
                        isLoading={cancelMutation.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
