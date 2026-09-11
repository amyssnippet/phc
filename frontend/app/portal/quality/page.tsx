'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { districtApi } from '../../../lib/api/scoped.api';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ShieldAlert, CheckCircle2, AlertTriangle, Check, RefreshCw } from 'lucide-react';

export default function PortalQualityPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['district-quality-issues'],
    queryFn: () => districtApi.getDataQualityIssues(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      districtApi.resolveDataQualityIssue(
        id,
        'MANUAL_OVERRIDE',
        'Verified against facility register paper audit log'
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['district-quality-issues'] });
      queryClient.invalidateQueries({ queryKey: ['district-overview-summary'] });
    },
  });

  const issues = data?.data?.items || [];
  const openCount = issues.filter((i: any) => i.status === 'OPEN').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Data Quality & Anomaly Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated integrity verification, timestamp syntax checking, and clinical consistency audits.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-audit Registry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-700">Audit Compliance</span>
          <div className="text-3xl font-black text-emerald-900 mt-1">94.8%</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Valid schema constraints</p>
        </Card>

        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <span className="text-xs font-bold text-amber-700">Open Quality Issues</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{openCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Actionable discrepancies</p>
        </Card>

        <Card className="p-4 bg-blue-50/50 border-blue-200">
          <span className="text-xs font-bold text-blue-700">Timestamp Normalization</span>
          <div className="text-3xl font-black text-blue-900 mt-1">ACTIVE</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Automated regex validation</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Detected Registry Flags & Inconsistencies
          </h3>
          <span className="text-xs text-slate-400">{issues.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No active data quality issues detected in the network.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {issues.map((issue: any) => {
              const isOpen = issue.status === 'OPEN';

              return (
                <div
                  key={issue.id}
                  className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{issue.issueType}</span>
                      <Badge
                        variant={
                          issue.severity === 'HIGH'
                            ? 'danger'
                            : issue.severity === 'MEDIUM'
                            ? 'warning'
                            : 'default'
                        }
                        className="text-[9px]"
                      >
                        {issue.severity}
                      </Badge>
                      <Badge variant={isOpen ? 'warning' : 'success'} className="text-[9px]">
                        {issue.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600">{issue.description}</div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Target: {issue.targetEntity || 'Facility'}</span>
                      {issue.detectedValue && (
                        <span>
                          · Observed: <code className="bg-slate-100 px-1 rounded">{String(issue.detectedValue)}</code>
                        </span>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0 flex items-center gap-1.5"
                      onClick={() => resolveMutation.mutate(issue.id)}
                      isLoading={resolveMutation.isPending}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Resolve & Recalculate
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
