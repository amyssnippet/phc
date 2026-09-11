'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workerApi } from '../../../lib/api/scoped.api';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Stethoscope,
  Heart,
  Activity,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const SYMPTOM_OPTIONS = [
  'High fever (>38.5°C)',
  'Shortness of breath / Dyspnea',
  'Chest tightness / pain',
  'Persistent dry cough',
  'Severe headache / altered consciousness',
  'Lethargy / extreme fatigue',
  'Abdominal pain & vomiting',
  'Pediatric wheezing / stridor',
];

export default function PortalTriagePage() {
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [temperatureC, setTemperatureC] = useState('38.2');
  const [heartRate, setHeartRate] = useState('88');
  const [respiratoryRate, setRespiratoryRate] = useState('20');
  const [oxygenSaturation, setOxygenSaturation] = useState('98');
  const [systolicBp, setSystolicBp] = useState('120');
  const [diastolicBp, setDiastolicBp] = useState('80');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null);

  // Load patients
  const { data: patientsData } = useQuery({
    queryKey: ['worker-patients-triage'],
    queryFn: () => workerApi.getPatients({ limit: 20 }),
  });

  const patients = patientsData?.data?.items || [];

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const triageMutation = useMutation({
    mutationFn: () =>
      workerApi.submitTriage({
        patientId: selectedPatientId,
        symptoms: selectedSymptoms,
        chiefComplaint: chiefComplaint || selectedSymptoms.join(', '),
        vitals: {
          temperatureC: parseFloat(temperatureC) || undefined,
          heartRate: parseInt(heartRate) || undefined,
          respiratoryRate: parseInt(respiratoryRate) || undefined,
          oxygenSaturation: parseInt(oxygenSaturation) || undefined,
          systolicBp: parseInt(systolicBp) || undefined,
          diastolicBp: parseInt(diastolicBp) || undefined,
        },
      }),
    onSuccess: (res) => {
      setAssessmentResult(res.data);
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Doorstep Clinical Triage & CDSS</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Standardized vitals capture and protocol-based risk stratification for community health workers.
        </p>
      </div>

      {/* Mandatory Safety Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Clinical Decision Support Notice:</strong> This software advisory is for frontline risk
          identification only and DOES NOT constitute a definitive medical diagnosis. For red-flag vital signs,
          refer patient immediately to the nearest Secondary Hospital.
        </div>
      </div>

      {assessmentResult ? (
        <Card className="p-6 border-blue-200 bg-white space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Assessment Complete</span>
              <h2 className="text-xl font-black text-slate-900">Triage Summary & Guidance</h2>
            </div>
            <Badge
              variant={
                assessmentResult.urgency === 'HIGH'
                  ? 'danger'
                  : assessmentResult.urgency === 'MEDIUM'
                  ? 'warning'
                  : 'success'
              }
              className="text-xs py-1 px-3"
            >
              Urgency: {assessmentResult.urgency || 'MEDIUM'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Risk Flags</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {assessmentResult.riskFlags?.length
                  ? assessmentResult.riskFlags.join(', ')
                  : 'No critical red flags'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Recommended Routing</div>
              <div className="text-sm font-bold text-blue-700 mt-1">
                {assessmentResult.urgency === 'HIGH' ? 'Secondary Hospital / Emergency' : 'PHC General Medicine OPD'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] uppercase font-bold text-slate-400">Consultation Priority</div>
              <div className="text-sm font-bold text-purple-700 mt-1">
                {assessmentResult.urgency === 'HIGH' ? 'Priority 75 (High Queue)' : 'Priority 10 (Standard)'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssessmentResult(null);
                setSelectedSymptoms([]);
              }}
            >
              Start New Triage
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.href = `/portal/referrals?patientId=${selectedPatientId}`}
            >
              Initiate Specialist Referral <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 space-y-6">
          {/* Patient Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Select Patient from Catchment Roster *
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">-- Choose registered citizen --</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName || ''} ({p.patientCode} · {p.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Vitals Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              Observed Vital Signs
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Temperature (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Heart Rate (BPM)</span>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Respiratory Rate</span>
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">SpO2 Saturation (%)</span>
                <input
                  type="number"
                  value={oxygenSaturation}
                  onChange={(e) => setOxygenSaturation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Systolic BP</span>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Diastolic BP</span>
                <input
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Symptoms Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Reported Patient Symptoms
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {SYMPTOM_OPTIONS.map((sym) => {
                const checked = selectedSymptoms.includes(sym);
                return (
                  <div
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center gap-2 ${
                      checked
                        ? 'border-blue-500 bg-blue-50/70 font-semibold text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{sym}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Clinical Notes / Chief Complaint
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Patient presents with persistent fever and mild dehydration..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              disabled={!selectedPatientId || triageMutation.isPending}
              onClick={() => triageMutation.mutate()}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Stethoscope className="w-4 h-4" />
              {triageMutation.isPending ? 'Evaluating CDSS...' : 'Complete Triage Assessment'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
