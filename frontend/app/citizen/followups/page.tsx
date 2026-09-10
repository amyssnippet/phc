'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followupsApi } from '../../../lib/api/followups.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

export default function CitizenFollowupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['citizen-followups', user?.patientId],
    queryFn: () => followupsApi.list({ patientId: user?.patientId || undefined }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => followupsApi.complete(id, 'Completed by citizen self-report'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citizen-followups'] });
    },
  });

  const followups = data?.data?.items || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Post-Consultation Follow-ups</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review scheduled reviews and preventive wellness checkups.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 bg-slate-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : followups.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No follow-ups due at this time.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {followups.map((f: any) => {
            const isCompleted = f.status === 'COMPLETED';
            const isDue = f.status === 'DUE';

            return (
              <Card key={f.id} className="hover:border-blue-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCompleted ? 'success' : isDue ? 'danger' : 'warning'}>
                        {f.status}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        Assigned to: {f.assignedTo || 'ASHA Worker'}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900">
                      {f.type.replace('_', ' ')}
                    </h4>

                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due Date: <strong>{new Date(f.dueDate).toLocaleDateString()}</strong>
                    </div>

                    {f.notes && <p className="text-xs text-slate-500">{f.notes}</p>}
                  </div>

                  {!isCompleted && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => completeMutation.mutate(f.id)}
                      isLoading={completeMutation.isPending}
                    >
                      Mark Checkup Complete
                    </Button>
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
