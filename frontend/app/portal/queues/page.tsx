'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../lib/auth/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facilityApi, doctorApi } from '../../../lib/api/scoped.api';
import { facilitiesApi } from '../../../lib/api/facilities.api';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Ticket,
  Users,
  Clock,
  Play,
  CheckCircle2,
  Plus,
  AlertCircle,
  Building2,
  RefreshCw,
  Phone,
} from 'lucide-react';

const DEFAULT_FACILITIES = [
  { id: '1787ff6b-a95f-44d4-8c14-f3457767899f', name: 'Dhanukarwadi UPHC (Kandivali West)' },
  { id: 'c0701298-73f8-4528-930c-a63f203ccdd4', name: 'DDU2 RCH UPHC (Kandivali West)' },
];

const DEPARTMENTS = [
  { id: 'GENERAL_MEDICINE', name: 'General Medicine (GM)' },
  { id: 'SPECIALIST', name: 'Specialist Consultation (SP)' },
  { id: 'MATERNAL', name: 'Maternal & Child Health (MCH)' },
  { id: 'PEDIATRICS', name: 'Pediatrics / Immunization (PED)' },
  { id: 'DENTAL', name: 'Dental Care (DNT)' },
];

export default function PortalQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Load facilities dynamically (all 50 Mumbai Suburban PHCs)
  const { data: facilitiesData } = useQuery({
    queryKey: ['public-facilities-catalogue'],
    queryFn: () => facilitiesApi.search({ limit: 50 }),
  });

  const availableFacilities = facilitiesData?.data?.items?.length
    ? facilitiesData.data.items.map((f: any) => ({
        id: f.id,
        name: `${f.name} (${f.pincode || 'Mumbai Suburban'})`,
      }))
    : DEFAULT_FACILITIES;

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(DEFAULT_FACILITIES[0].id);
  const [selectedDept, setSelectedDept] = useState<string>('GENERAL_MEDICINE');
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinPriority, setWalkinPriority] = useState('NORMAL');

  // Load live facility queue
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['facility-queue-live', selectedFacilityId, selectedDept],
    queryFn: () => facilityApi.getQueue(selectedFacilityId, selectedDept),
    refetchInterval: 6000, // Live poll every 6s
  });

  // Call next mutation
  const callNextMutation = useMutation({
    mutationFn: () => facilityApi.callNext(selectedFacilityId, selectedDept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-queue-live'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-worklist-summary'] });
    },
  });

  // Complete consultation mutation
  const completeMutation = useMutation({
    mutationFn: (tokenId: string) => facilityApi.completeConsultation(selectedFacilityId, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-queue-live'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-worklist-summary'] });
    },
  });

  // Walkin token mutation
  const walkinMutation = useMutation({
    mutationFn: () =>
      facilityApi.issueWalkinToken(selectedFacilityId, {
        patientName: walkinName,
        patientPhone: walkinPhone || '9999999999',
        department: selectedDept,
        priority: walkinPriority,
      }),
    onSuccess: () => {
      setShowWalkinModal(false);
      setWalkinName('');
      setWalkinPhone('');
      queryClient.invalidateQueries({ queryKey: ['facility-queue-live'] });
    },
  });

  const tokens = data?.data?.tokens || [];
  const inChamberToken = tokens.find((t: any) => t.status === 'IN_CONSULTATION' || t.status === 'CALLED');
  const waitingTokens = tokens.filter((t: any) => t.status === 'WAITING');
  const completedTokens = tokens.filter((t: any) => t.status === 'COMPLETED');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Live OPD Queue Manager</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic token orchestration scoped to facility, department, and calendar date.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowWalkinModal(true)}
            className="flex items-center gap-1.5 shadow-sm text-xs"
          >
            <Plus className="w-4 h-4" /> Issue Walk-in Token
          </Button>
        </div>
      </div>

      {/* Scope Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
            Assigned Health Facility
          </label>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {availableFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
            Clinic Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Chamber & Queue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Chamber Column */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5 border-blue-200 bg-gradient-to-b from-blue-50/70 to-white shadow-sm">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3 mb-4">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-blue-600 fill-current" />
                In Consultation Chamber
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {inChamberToken ? (
              <div className="space-y-4 text-center">
                <div className="w-24 h-24 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center mx-auto shadow-md">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200">
                    TOKEN
                  </span>
                  <span className="text-2xl font-black">{inChamberToken.displayNumber}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {inChamberToken.patient
                      ? `${inChamberToken.patient.firstName} ${inChamberToken.patient.lastName || ''}`
                      : 'Walk-in Patient'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {inChamberToken.department} · Priority: {inChamberToken.priority}
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 text-xs shadow-sm"
                    onClick={() => completeMutation.mutate(inChamberToken.id)}
                    isLoading={completeMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete Consultation
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Chamber is currently clear</p>
                <Button
                  variant="primary"
                  className="w-full text-xs shadow-sm"
                  onClick={() => callNextMutation.mutate()}
                  isLoading={callNextMutation.isPending}
                  disabled={waitingTokens.length === 0}
                >
                  Call Next Patient ({waitingTokens.length} waiting)
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <div className="text-xs text-slate-500">Waiting</div>
              <div className="text-2xl font-black text-slate-900">{waitingTokens.length}</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <div className="text-xs text-slate-500">Completed</div>
              <div className="text-2xl font-black text-emerald-600">{completedTokens.length}</div>
            </div>
          </div>
        </div>

        {/* Waiting & Completed Queues */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Waiting Roster ({waitingTokens.length})</h3>
                <p className="text-xs text-slate-500">Sorted by clinical priority and sequence</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={waitingTokens.length === 0 || callNextMutation.isPending}
                onClick={() => callNextMutation.mutate()}
                className="text-xs"
              >
                Call Next
              </Button>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No patients waiting in queue for {selectedDept}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {waitingTokens.map((t: any, idx: number) => {
                  const isEmergency = t.priority >= 100;
                  const isHigh = t.priority >= 75 && t.priority < 100;

                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isEmergency
                          ? 'border-red-300 bg-red-50/50'
                          : isHigh
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black text-sm">
                          {t.displayNumber}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {t.patient
                              ? `${t.patient.firstName} ${t.patient.lastName || ''}`
                              : 'Walk-in Patient'}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span>Source: {t.source || 'WALK_IN'}</span>
                            <span>·</span>
                            <span>Est. Wait: ~{t.estimatedWaitMinutes || 15}m</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEmergency && <Badge variant="danger">EMERGENCY</Badge>}
                        {isHigh && <Badge variant="warning">HIGH PRIORITY</Badge>}
                        <Badge variant="default">WAITING</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Walkin Token Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Issue Walk-in OPD Token</h3>
              <button
                onClick={() => setShowWalkinModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Deshmukh"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="10-digit mobile"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority Triage Level</label>
                <select
                  value={walkinPriority}
                  onChange={(e) => setWalkinPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="NORMAL">Normal (Standard OPD)</option>
                  <option value="PRIORITY">Priority (Elderly / Antenatal)</option>
                  <option value="HIGH">High (Acute Pain / High Fever)</option>
                  <option value="EMERGENCY">Emergency (Immediate Intervention)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowWalkinModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!walkinName.trim() || walkinMutation.isPending}
                onClick={() => walkinMutation.mutate()}
              >
                {walkinMutation.isPending ? 'Allocating...' : 'Generate Verified Token'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
