'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Stethoscope, 
  ArrowLeft, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Heart, 
  Compass, 
  Send,
  UserCheck
} from 'lucide-react';
import { patientsApi } from '@/lib/api/patients.api';
import { triageApi } from '@/lib/api/triage.api';
import { facilitiesApi } from '@/lib/api/facilities.api';
import { syncManager } from '@/lib/offline/sync-manager';
import { useAuth } from '@/lib/auth/auth-context';

const SYMPTOM_OPTIONS = [
  { id: 'fever', label: 'High Fever / Shivering', redFlag: false },
  { id: 'chest_pain', label: 'Severe Chest Pain / Pressure', redFlag: true },
  { id: 'dyspnea', label: 'Severe Breathlessness / Wheezing', redFlag: true },
  { id: 'altered_mental', label: 'Confusion / Drowsiness / Syncope', redFlag: true },
  { id: 'persistent_cough', label: 'Persistent Cough (> 2 weeks)', redFlag: false },
  { id: 'acute_abdomen', label: 'Severe Abdominal Pain', redFlag: false },
  { id: 'vomiting_diarrhea', label: 'Watery Diarrhea / Dehydration', redFlag: false },
  { id: 'trauma_injury', label: 'Head Trauma / Severe Fracture', redFlag: true },
  { id: 'hypertension_crisis', label: 'Severe Headache with Blurred Vision', redFlag: true },
  { id: 'pediatric_stridor', label: 'Child: Stridor / Inability to Feed', redFlag: true },
];

function TriageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPatientId = searchParams.get('patientId') || '';
  const { isOnline } = useAuth();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');

  // Vitals
  const [tempC, setTempC] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respRate, setRespRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');

  // Symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [patRes, facRes] = await Promise.all([
          patientsApi.list({ limit: 50 }),
          facilitiesApi.list({ limit: 20 }),
        ]);
        if (patRes.success && patRes.data) {
          setPatients(patRes.data.items || []);
        }
        if (facRes.success && facRes.data) {
          setFacilities(facRes.data.items || []);
          if (facRes.data.items.length > 0) {
            setSelectedFacilityId(facRes.data.items[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load triage prerequisites', e);
      }
    }
    load();
  }, []);

  // Compute live client-side triage urgency score
  const computedUrgency = useMemo(() => {
    let redFlagsCount = 0;
    const triggers: string[] = [];

    // Check symptoms
    selectedSymptoms.forEach((s) => {
      const opt = SYMPTOM_OPTIONS.find((o) => o.id === s);
      if (opt?.redFlag) {
        redFlagsCount++;
        triggers.push(opt.label);
      }
    });

    const o2 = parseFloat(spo2);
    const hr = parseFloat(heartRate);
    const rr = parseFloat(respRate);
    const sys = parseFloat(bpSys);
    const temp = parseFloat(tempC);

    if (!isNaN(o2) && o2 < 92) {
      redFlagsCount += 2;
      triggers.push(`Severe Hypoxemia (SpO2: ${o2}%)`);
    } else if (!isNaN(o2) && o2 < 95) {
      redFlagsCount += 1;
      triggers.push(`Moderate Hypoxemia (SpO2: ${o2}%)`);
    }

    if (!isNaN(sys) && sys > 180) {
      redFlagsCount += 2;
      triggers.push(`Hypertensive Emergency (Sys: ${sys} mmHg)`);
    } else if (!isNaN(sys) && sys < 90) {
      redFlagsCount += 2;
      triggers.push(`Hypotension / Shock (Sys: ${sys} mmHg)`);
    }

    if (!isNaN(hr) && (hr > 130 || hr < 45)) {
      redFlagsCount += 2;
      triggers.push(`Critical Heart Rate (${hr} bpm)`);
    }

    if (!isNaN(rr) && rr > 30) {
      redFlagsCount += 2;
      triggers.push(`Severe Tachypnea (${rr}/min)`);
    }

    if (!isNaN(temp) && temp > 39.5) {
      redFlagsCount += 1;
      triggers.push(`High Hyperpyrexia (${temp}°C)`);
    }

    if (redFlagsCount >= 2 || triggers.some((t) => t.includes('Emergency') || t.includes('Severe Hypoxemia'))) {
      return { level: 'RED', label: 'EMERGENCY (Immediate Tertiary / Secondary)', triggers };
    }
    if (redFlagsCount === 1 || selectedSymptoms.length >= 3) {
      return { level: 'YELLOW', label: 'PRIORITY (Urgent Medical Evaluation)', triggers };
    }
    return { level: 'GREEN', label: 'ROUTINE (Primary Care / OPD)', triggers };
  }, [selectedSymptoms, spo2, heartRate, respRate, bpSys, tempC]);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError('Please select or register a patient first.');
      return;
    }
    setError(null);
    setSubmitting(true);

    const payload = {
      patientId: selectedPatientId,
      facilityId: selectedFacilityId || undefined,
      symptoms: selectedSymptoms,
      vitals: {
        temperatureC: tempC ? parseFloat(tempC) : null,
        heartRate: heartRate ? parseInt(heartRate, 10) : null,
        respiratoryRate: respRate ? parseInt(respRate, 10) : null,
        oxygenSaturation: spo2 ? parseFloat(spo2) : null,
        bloodPressureSys: bpSys ? parseInt(bpSys, 10) : null,
        bloodPressureDia: bpDia ? parseInt(bpDia, 10) : null,
      },
    };

    try {
      if (isOnline) {
        const res = await triageApi.create(payload);
        if (res.success && res.data) {
          setResult(res.data);
          return;
        }
      }

      // Offline handling
      const opId = await syncManager.enqueueOperation('TRIAGE', 'CREATE', payload);
      setResult({
        id: opId,
        urgency: computedUrgency.level,
        recommendedLevel: computedUrgency.level === 'RED' ? 'DISTRICT_HOSPITAL' : 'UPHC',
        recommendedDepartment: computedUrgency.level === 'RED' ? 'EMERGENCY' : 'GENERAL_MEDICINE',
        notes: `Offline Triage Assessment: ${computedUrgency.triggers.join(', ') || 'Normal vitals'}`,
        isOfflineDraft: true,
      });
    } catch (err: any) {
      console.error('Triage submission failed', err);
      setError(err.message || 'Failed to submit triage evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/frontline" 
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Frontline Desk
        </Link>
      </div>

      {/* Mandatory Clinical Decision Support Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold uppercase tracking-wider text-xs block text-amber-700 dark:text-amber-300 mb-0.5">
            Clinical Decision Support System (CDSS) Advisory
          </span>
          <p className="text-xs sm:text-sm">
            This module provides computerized triage scoring and care navigation guidance based on syndromic presentation and vital signs. <strong>It is NOT a definitive clinical diagnosis</strong> and must be reviewed and confirmed by an authorized medical officer or specialist.
          </p>
        </div>
      </div>

      {result ? (
        <Card className="border-2 border-emerald-500/40">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  Triage Assessment Complete
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Reference: <span className="font-mono">{result.id}</span>
                </p>
              </div>
              <Badge 
                variant={result.urgency === 'RED' ? 'destructive' : result.urgency === 'YELLOW' ? 'warning' : 'success'}
                className="text-sm font-bold px-3 py-1"
              >
                {result.urgency} URGENCY
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-semibold uppercase">Recommended Tier</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {result.recommendedLevel || (result.urgency === 'RED' ? 'District Hospital / Tertiary' : 'UPHC / HWC')}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-semibold uppercase">Target Department</div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {result.recommendedDepartment || 'General Medicine'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 font-semibold uppercase">Clinical Triggers</div>
                <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
                  {computedUrgency.triggers.length > 0 ? computedUrgency.triggers.join(', ') : 'Stable vital parameters'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link 
                href={`/find-care?patientId=${selectedPatientId}&urgency=${result.urgency}&department=${result.recommendedDepartment || 'General Medicine'}&symptoms=${selectedSymptoms.join(',')}`}
              >
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Compass className="w-4 h-4 mr-2" />
                  Route Patient via Care Router
                </Button>
              </Link>
              <Link href={`/citizen/records?patientId=${selectedPatientId}`}>
                <Button variant="outline">
                  View Patient Record
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setResult(null);
                  setSelectedSymptoms([]);
                  setTempC('');
                  setHeartRate('');
                  setRespRate('');
                  setSpo2('');
                  setBpSys('');
                  setBpDia('');
                }}
              >
                New Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleTriageSubmit} className="space-y-6">
          {/* Patient Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                Select Patient for Triage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose registered patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName || ''} ({p.patientCode}) - {p.phone || p.pincode}
                    </option>
                  ))}
                </select>
                <Link href="/frontline/patients/new">
                  <Button type="button" variant="outline" className="w-full sm:w-auto whitespace-nowrap">
                    + Register New Patient
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Syndromic Symptoms Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Reported Syndromes & Red-Flags
                </CardTitle>
                <span className="text-xs text-slate-500">
                  {selectedSymptoms.length} selected
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SYMPTOM_OPTIONS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  return (
                    <div
                      key={sym.id}
                      onClick={() => toggleSymptom(sym.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isChecked
                          ? sym.redFlag
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-400 text-red-900 dark:text-red-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{sym.label}</span>
                      {sym.redFlag && (
                        <Badge variant="destructive" className="text-[10px] ml-2">
                          RED FLAG
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Vitals Recording */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Point-of-Care Vital Signs
              </CardTitle>
              <p className="text-xs text-slate-500">
                Inputs immediately recalculate real-time urgency heuristic below.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Temp (°C)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tempC}
                    onChange={(e) => setTempC(e.target.value)}
                    placeholder="37.0"
                  />
                  <span className="text-[10px] text-slate-400">&gt;38.5 = fever</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SpO2 (%)
                  </label>
                  <Input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder="98"
                  />
                  <span className="text-[10px] text-slate-400">&lt;92 = red alert</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Heart Rate
                  </label>
                  <Input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="75"
                  />
                  <span className="text-[10px] text-slate-400">bpm</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resp. Rate
                  </label>
                  <Input
                    type="number"
                    value={respRate}
                    onChange={(e) => setRespRate(e.target.value)}
                    placeholder="18"
                  />
                  <span className="text-[10px] text-slate-400">breaths/min</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    BP Sys
                  </label>
                  <Input
                    type="number"
                    value={bpSys}
                    onChange={(e) => setBpSys(e.target.value)}
                    placeholder="120"
                  />
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    BP Dia
                  </label>
                  <Input
                    type="number"
                    value={bpDia}
                    onChange={(e) => setBpDia(e.target.value)}
                    placeholder="80"
                  />
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Realtime Urgency Preview Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
            computedUrgency.level === 'RED'
              ? 'bg-red-500/10 border-red-500 text-red-900 dark:text-red-200'
              : computedUrgency.level === 'YELLOW'
              ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 animate-pulse" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Real-time Decision Support Urgency
                </div>
                <div className="text-lg font-bold">
                  {computedUrgency.label}
                </div>
                {computedUrgency.triggers.length > 0 && (
                  <div className="text-xs mt-0.5 opacity-90">
                    Triggers: {computedUrgency.triggers.join(', ')}
                  </div>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className={`font-semibold shadow-md whitespace-nowrap ${
                computedUrgency.level === 'RED' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Evaluating...' : 'Confirm & Save Triage'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function TriagePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Triage Desk...</div>}>
      <TriageContent />
    </Suspense>
  );
}
