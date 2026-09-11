'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorApi, workerApi, facilityApi } from '../../../lib/api/scoped.api';
import { useAuth } from '../../../lib/auth/auth-context';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

const FACILITIES = [
  { id: 'b44043f0-7234-4eb9-9661-f43ab1390c33', name: 'Dr. R.N. Cooper Municipal General Hospital (Tertiary)' },
  { id: 'c0701298-73f8-4528-930c-a63f203ccdd4', name: 'DDU2 RCH UPHC (Maternal & Child Health)' },
  { id: '1787ff6b-a95f-44d4-8c14-f3457767899f', name: 'Dhanukarwadi UPHC' },
];

export default function PortalReferralsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [destinationFacilityId, setDestinationFacilityId] = useState(FACILITIES[0].id);
  const [referralReason, setReferralReason] = useState('');
  const [urgency, setUrgency] = useState('HIGH');

  // Load referrals
  const { data: doctorRefs, isLoading } = useQuery({
    queryKey: ['doctor-referrals'],
    queryFn: () => doctorApi.getReferrals(),
  });

  // Load patients for referral creation
  const { data: patientsData } = useQuery({
    queryKey: ['worker-patients-referral'],
    queryFn: () => workerApi.getPatients({ limit: 15 }),
  });

  const referrals = doctorRefs?.data?.items || [];
  const patients = patientsData?.data?.items || [];

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: (id: string) => doctorApi.acceptReferral(id, 'Accepted by medical officer'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-referrals'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      doctorApi.rejectReferral(id, 'Specialty department at maximum bed capacity'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-referrals'] });
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () =>
      workerApi.createReferral({
        patientId: newPatientId,
        destinationFacilityId,
        reason: referralReason,
        urgency,
      }),
    onSuccess: () => {
      setShowCreateModal(false);
      setReferralReason('');
      queryClient.invalidateQueries({ queryKey: ['doctor-referrals'] });
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inter-Facility Referral Desk</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinated patient escalation across Primary Health Centres and Secondary Hospitals.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 shadow-sm text-xs"
        >
          <Plus className="w-4 h-4" /> Initiate Upward Referral
        </Button>
      </div>

      {/* Roster Cards */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Active Facility Referrals</span>
            <Badge variant="default" className="text-[10px]">
              {referrals.length} Cases
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No active referrals pending for your facility.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {referrals.map((ref: any) => {
              const isPending = ref.status === 'PENDING' || ref.status === 'INITIATED';
              const isAccepted = ref.status === 'ACCEPTED' || ref.status === 'APPOINTMENT_BOOKED';

              return (
                <div
                  key={ref.id}
                  className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {ref.patient
                          ? `${ref.patient.firstName} ${ref.patient.lastName || ''}`
                          : 'Referred Patient'}
                      </span>
                      <Badge
                        variant={
                          ref.urgency === 'HIGH' || ref.urgency === 'EMERGENCY'
                            ? 'danger'
                            : 'warning'
                        }
                        className="text-[9px]"
                      >
                        {ref.urgency}
                      </Badge>
                      <Badge
                        variant={isAccepted ? 'success' : isPending ? 'info' : 'default'}
                        className="text-[9px]"
                      >
                        {ref.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">
                      Reason: <span className="text-slate-900">{ref.reason}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Destination: {ref.destinationFacility?.name || 'Secondary Hospital'}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={() => rejectMutation.mutate(ref.id)}
                        isLoading={rejectMutation.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                        onClick={() => acceptMutation.mutate(ref.id)}
                        isLoading={acceptMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept & Book
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Referral Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Initiate Specialist Escalation</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Patient *</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Choose patient --</option>
                  {patients.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName || ''} ({p.patientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Destination Facility *</label>
                <select
                  value={destinationFacilityId}
                  onChange={(e) => setDestinationFacilityId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {FACILITIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="HIGH">High (Within 24-48 Hours)</option>
                  <option value="EMERGENCY">Emergency (Immediate Ambulance Transfer)</option>
                  <option value="MEDIUM">Medium (Elective Specialist Assessment)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Referral *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Suspected high-risk antenatal case or persistent chest pain requiring cardiology evaluation..."
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!newPatientId || !referralReason.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Transmitting...' : 'Dispatch Referral'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
