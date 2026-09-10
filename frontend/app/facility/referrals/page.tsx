'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Check
} from 'lucide-react';
import { facilitiesApi } from '@/lib/api/facilities.api';
import { referralsApi } from '@/lib/api/referrals.api';

function FacilityReferralsContent() {
  const searchParams = useSearchParams();
  const initialFacilityId = searchParams.get('facilityId') || '';

  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState(initialFacilityId);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Bed / Specialist capacity exceeded');

  const loadReferrals = async (facilityId: string) => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const res = await referralsApi.list({ destinationFacilityId: facilityId });
      if (res.success && res.data) {
        setReferrals(res.data.items || []);
      }
    } catch (e) {
      console.error('Failed to load inbound referrals', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await facilitiesApi.list({ limit: 20 });
        if (res.success && res.data) {
          const list = res.data.items || [];
          setFacilities(list);
          const current = selectedFacilityId || (list[0] ? list[0].id : '');
          setSelectedFacilityId(current);
          if (current) {
            await loadReferrals(current);
          }
        }
      } catch (e) {
        console.error('Failed to init referral triage desk', e);
      }
    }
    init();
  }, []);

  const handleFacilityChange = (newId: string) => {
    setSelectedFacilityId(newId);
    loadReferrals(newId);
  };

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      await referralsApi.accept(id);
      await loadReferrals(selectedFacilityId);
    } catch (e: any) {
      alert(`Accept failed: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActionLoading(true);
    try {
      await referralsApi.reject(rejectId, rejectReason);
      setRejectId(null);
      await loadReferrals(selectedFacilityId);
    } catch (e: any) {
      alert(`Reject failed: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrive = async (id: string) => {
    setActionLoading(true);
    try {
      await referralsApi.arrive(id);
      await loadReferrals(selectedFacilityId);
    } catch (e: any) {
      alert(`Mark arrived failed: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsult = async (id: string) => {
    setActionLoading(true);
    try {
      await referralsApi.consult(id);
      await loadReferrals(selectedFacilityId);
    } catch (e: any) {
      alert(`Start consult failed: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(true);
    try {
      await referralsApi.complete(id);
      await loadReferrals(selectedFacilityId);
    } catch (e: any) {
      alert(`Complete referral failed: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link 
          href="/facility" 
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Facility Station
        </Link>

        <div className="flex items-center gap-3">
          <select
            value={selectedFacilityId}
            onChange={(e) => handleFacilityChange(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadReferrals(selectedFacilityId)} 
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Inbound Inter-Facility Referral Review Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Review and act on clinical escalations originating from primary health posts across Mumbai Suburban district.
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 text-sm">
        {['ALL', 'REQUESTED', 'ACCEPTED', 'DISPATCHED', 'ARRIVED', 'IN_CONSULTATION', 'COMPLETED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === st
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Referrals List */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">
              Referral Influx ({filteredReferrals.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReferrals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              No referrals found matching status filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReferrals.map((ref: any) => (
                <div key={ref.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                        {ref.patient?.firstName} {ref.patient?.lastName}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {ref.patient?.patientCode}
                      </Badge>
                      <Badge 
                        variant={
                          ref.urgency === 'RED' 
                            ? 'destructive' 
                            : ref.urgency === 'YELLOW' 
                            ? 'warning' 
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {ref.urgency} URGENCY
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800">
                        Status: {ref.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <strong>Reason:</strong> {ref.reason || 'Clinical escalation for specialist evaluation'}
                    </p>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Origin: {ref.sourceFacility?.name || 'Primary UPHC'}</span>
                      <span>•</span>
                      <span>Escalated: {new Date(ref.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {ref.status === 'REQUESTED' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(ref.id)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectId(ref.id)}
                          disabled={actionLoading}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {(ref.status === 'ACCEPTED' || ref.status === 'DISPATCHED') && (
                      <Button
                        size="sm"
                        onClick={() => handleArrive(ref.id)}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Mark Arrived
                      </Button>
                    )}

                    {ref.status === 'ARRIVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleConsult(ref.id)}
                        disabled={actionLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Start Consult
                      </Button>
                    )}

                    {ref.status === 'IN_CONSULTATION' && (
                      <Button
                        size="sm"
                        onClick={() => handleComplete(ref.id)}
                        disabled={actionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Complete
                      </Button>
                    )}

                    <Link href={`/citizen/referrals/${ref.id}`}>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Timeline
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Reject Inbound Referral
            </h3>
            <p className="text-xs text-slate-500">
              Please specify clinical or infrastructural reason for rejecting this escalation.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Reason
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-red-500"
              >
                <option value="Bed / Specialist capacity exceeded">Bed / Specialist capacity exceeded</option>
                <option value="Incorrect clinical specialty referred">Incorrect clinical specialty referred</option>
                <option value="Diagnostic equipment under maintenance">Diagnostic equipment under maintenance</option>
                <option value="Patient redirected to tertiary hospital">Patient redirected to tertiary hospital</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRejectId(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReject} 
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacilityReferralsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Inbound Referrals...</div>}>
      <FacilityReferralsContent />
    </Suspense>
  );
}
