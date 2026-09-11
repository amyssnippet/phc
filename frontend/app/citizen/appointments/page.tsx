'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '../../../lib/api/scoped.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';
import { Calendar, Clock, Ticket, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

import { appointmentRepository, queueRepository } from '../../../lib/offline/citizen-repositories';

export default function CitizenAppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointmentsResult, isLoading } = useQuery({
    queryKey: ['citizen-appointments', user?.id],
    queryFn: () => appointmentRepository.getMyAppointments(),
  });

  const { data: queueResult } = useQuery({
    queryKey: ['citizen-queue-live', user?.id],
    queryFn: () => queueRepository.getMyQueueStatus(),
    refetchInterval: 10000, // Poll live queue every 10s
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => meApi.cancelAppointment(id, 'Patient requested cancellation'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-queue-live'] });
    },
  });

  const appointments = appointmentsResult?.items || [];
  const isOffline = appointmentsResult?.isOffline;
  const queueStatus = queueResult?.data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 sm:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Consultation Tokens</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your verified outpatient appointments and real-time clinic queue position.
          </p>
        </div>
        <Link href="/citizen/appointments/new">
          <Button variant="primary" size="sm" className="shadow-sm">
            + Book New Token
          </Button>
        </Link>
      </div>

      {/* Live Queue Banner (if active token exists) */}
      {queueStatus?.hasActiveToken && queueStatus.token && (
        <Card className="border-blue-300 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/40 text-[10px] font-bold uppercase tracking-wider text-blue-100">
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                Active OPD Queue Ticket
              </div>
              <div className="text-xl font-black">
                Your Token: {queueStatus.token.displayNumber}
              </div>
              <p className="text-xs text-blue-100">
                Facility: <strong>{queueStatus.token.facilityName}</strong> · {queueStatus.token.department}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="text-center px-2">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Now Serving</div>
                <div className="text-lg font-black text-amber-300">
                  {queueStatus.token.currentlyServing || 'GM-037'}
                </div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center px-2">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Ahead in Line</div>
                <div className="text-lg font-black text-white">
                  {queueStatus.token.aheadInLine ?? 4}
                </div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center px-2">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Est. Wait</div>
                <div className="text-lg font-black text-white">
                  ~{queueStatus.token.estimatedWaitMinutes || 30}m
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">No appointments booked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Book a consultation token at your nearest Urban Primary Health Centre with zero wait at the counter.
            </p>
          </div>
          <Link href="/citizen/appointments/new" className="inline-block pt-2">
            <Button variant="primary" size="sm">
              Book My First Token
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((app: any) => {
            const isBooked = app.status === 'BOOKED';
            const isCheckedIn = app.status === 'CHECKED_IN';
            const isCompleted = app.status === 'COMPLETED';
            const isCancelled = app.status === 'CANCELLED';

            const tokenDisplay = app.queueToken?.displayNumber || app.tokenNumber || 'GM-001';

            return (
              <Card key={app.id} className="hover:border-blue-300 transition-all p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center text-center shrink-0">
                      <Ticket className="w-4 h-4 text-blue-700 mb-0.5" />
                      <span className="text-xs font-black text-blue-900 tracking-tight">
                        {tokenDisplay}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">
                          {app.facility?.name || 'Urban Primary Health Centre'}
                        </h4>
                        <Badge
                          variant={
                            isCompleted
                              ? 'success'
                              : isCheckedIn
                              ? 'info'
                              : isBooked
                              ? 'warning'
                              : isCancelled
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {app.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(app.appointmentDate).toLocaleDateString()}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {app.startTime} - {app.endTime}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                        Dept: <span className="text-slate-800 font-semibold">{app.department}</span>
                        {app.queueToken && (
                          <span className="ml-2">
                            · Priority: <span className="font-semibold text-slate-800">{app.queueToken.priority || 10}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isBooked && (
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelMutation.mutate(app.id)}
                        isLoading={cancelMutation.isPending}
                        className="text-red-600 hover:bg-red-50 hover:border-red-300 text-xs"
                      >
                        Cancel Token
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
