'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  ArrowLeft, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  RefreshCw, 
  Stethoscope, 
  AlertCircle,
  XCircle,
  Play
} from 'lucide-react';
import { facilitiesApi } from '@/lib/api/facilities.api';
import { queuesApi } from '@/lib/api/queues.api';
import { patientsApi } from '@/lib/api/patients.api';

function QueueConsoleContent() {
  const searchParams = useSearchParams();
  const initialFacilityId = searchParams.get('facilityId') || '';

  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState(initialFacilityId);
  const [queueData, setQueueData] = useState<any | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Walk-in join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [joinDepartment, setJoinDepartment] = useState('General Medicine');
  const [joinPriority, setJoinPriority] = useState('ROUTINE');

  const loadData = async (facilityId: string) => {
    if (!facilityId) return;
    setLoading(true);
    try {
      const [qRes, patRes] = await Promise.all([
        queuesApi.get(facilityId),
        patientsApi.list({ limit: 50 }),
      ]);
      if (qRes.success && qRes.data) {
        setQueueData(qRes.data);
      }
      if (patRes.success && patRes.data) {
        setPatients(patRes.data.items || []);
      }
    } catch (e) {
      console.error('Failed to load queue data', e);
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
            await loadData(current);
          }
        }
      } catch (e) {
        console.error('Failed to init queue manager', e);
      }
    }
    init();
  }, []);

  const handleFacilityChange = (newId: string) => {
    setSelectedFacilityId(newId);
    loadData(newId);
  };

  const handleCallNext = async () => {
    if (!selectedFacilityId) return;
    setActionLoading(true);
    try {
      await queuesApi.callNext(selectedFacilityId);
      await loadData(selectedFacilityId);
    } catch (e: any) {
      alert(`Call next error: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteCurrent = async (tokenId?: string) => {
    if (!selectedFacilityId) return;
    setActionLoading(true);
    try {
      await queuesApi.complete(selectedFacilityId, tokenId);
      await loadData(selectedFacilityId);
    } catch (e: any) {
      alert(`Complete consultation error: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedFacilityId) return;
    setActionLoading(true);
    try {
      await queuesApi.join(selectedFacilityId, {
        patientId: selectedPatientId,
        department: joinDepartment,
        priority: joinPriority,
      });
      setShowJoinModal(false);
      setSelectedPatientId('');
      await loadData(selectedFacilityId);
    } catch (e: any) {
      alert(`Join queue error: ${e.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const currentlyServing = queueData?.currentlyServing;
  const waitingTokens = queueData?.waitingTokens || [];

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
            onClick={() => loadData(selectedFacilityId)} 
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button 
            size="sm" 
            onClick={() => setShowJoinModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Walk-in Token
          </Button>
        </div>
      </div>

      {/* Hero Control Console */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Currently in Doctor Chamber */}
        <Card className="md:col-span-2 border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50/30 to-slate-50 dark:from-emerald-950/20 dark:to-slate-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                Active in Doctor Chamber
              </span>
              <Badge variant="success">IN CONSULTATION</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentlyServing ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-4xl sm:text-5xl font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {currentlyServing.tokenNumber}
                  </div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {currentlyServing.patient?.firstName} {currentlyServing.patient?.lastName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Code: {currentlyServing.patient?.patientCode || 'N/A'}</span>
                    <span>•</span>
                    <span>Dept: {currentlyServing.department || 'General Medicine'}</span>
                    <span>•</span>
                    <span>Priority: {currentlyServing.priority}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleCompleteCurrent(currentlyServing.id)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Consultation
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500">
                <p className="text-base font-medium">No patient currently inside chamber.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Call Next Patient" to notify the next waiting token.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Next Controller */}
        <Card className="flex flex-col justify-between bg-slate-900 text-white border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-400" />
              Queue Controller
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Advances OPD line and issues electronic call chime.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm py-2 border-y border-slate-800">
              <span className="text-slate-400">Total in Waiting Lounge:</span>
              <span className="font-bold text-xl text-blue-400">{waitingTokens.length}</span>
            </div>

            <Button
              onClick={handleCallNext}
              disabled={actionLoading || waitingTokens.length === 0}
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-base shadow-lg disabled:opacity-50"
            >
              <Volume2 className="w-5 h-5 mr-2" />
              Call Next Patient
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Waiting Tokens Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Waiting Patient Roster ({waitingTokens.length})
            </CardTitle>
            <span className="text-xs text-slate-500">
              Sorted by Priority & Check-In Time
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {waitingTokens.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              No patients waiting in queue.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
              {waitingTokens.map((token: any, idx: number) => (
                <div 
                  key={token.id || idx} 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono font-bold text-lg text-slate-800 dark:text-slate-200">
                      {token.tokenNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {token.patient?.firstName} {token.patient?.lastName}
                        </span>
                        <Badge 
                          variant={
                            token.priority === 'EMERGENCY' 
                              ? 'destructive' 
                              : token.priority === 'PRIORITY' 
                              ? 'warning' 
                              : 'secondary'
                          } 
                          className="text-[10px]"
                        >
                          {token.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                        <span>Code: {token.patient?.patientCode}</span>
                        <span>Dept: {token.department || 'General OPD'}</span>
                        <span>Est. Wait: ~{((idx + 1) * 8)}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCallNext()}
                      disabled={actionLoading}
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1" />
                      Call
                    </Button>
                    <Link href={`/citizen/records?patientId=${token.patientId}`}>
                      <Button size="sm" variant="ghost">
                        Records
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Join Queue Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Issue Walk-In OPD Token
              </h3>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Registered Patient *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.patientCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={joinDepartment}
                  onChange={(e) => setJoinDepartment(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Obstetrics & Gynecology">Obstetrics & Gynecology</option>
                  <option value="Emergency">Emergency / Casualty</option>
                  <option value="Dentistry">Dentistry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Triage Priority
                </label>
                <select
                  value={joinPriority}
                  onChange={(e) => setJoinPriority(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ROUTINE">ROUTINE (Standard OPD)</option>
                  <option value="PRIORITY">PRIORITY (Urgent Care)</option>
                  <option value="EMERGENCY">EMERGENCY (Immediate)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Generate Token
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QueueConsolePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading OPD Queue Console...</div>}>
      <QueueConsoleContent />
    </Suspense>
  );
}
