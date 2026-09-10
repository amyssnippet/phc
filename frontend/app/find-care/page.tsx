'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { careRoutingApi, CareRoutingRecommendation } from '../../lib/api/care-routing.api';
import { appointmentsApi } from '../../lib/api/appointments.api';
import { useAuth } from '../../lib/auth/auth-context';
import { useI18n } from '../../lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Alert } from '../../components/ui/alert';
import {
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function FindCarePage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [symptomInput, setSymptomInput] = useState('Persistent fever and dry cough');
  const [selectedCategory, setSelectedCategory] = useState('PRIMARY_ASSESSMENT');
  const [selectedUrgency, setSelectedUrgency] = useState('MEDIUM');
  const [latitude, setLatitude] = useState(19.2070803);
  const [longitude, setLongitude] = useState(72.8376889);
  const [pincode, setPincode] = useState('400067');

  const [bookingResult, setBookingResult] = useState<{
    facilityName: string;
    tokenNumber: string;
    appointmentId: string;
  } | null>(null);

  const recommendMutation = useMutation({
    mutationFn: () =>
      careRoutingApi.recommend({
        patientId: user?.patientId || undefined,
        symptoms: symptomInput.split(',').map((s) => s.trim()).filter(Boolean),
        urgency: selectedUrgency,
        requiredService: selectedCategory,
        location: { latitude, longitude },
      }),
  });

  const bookMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await appointmentsApi.create({
        patientId: user?.patientId || 'MH-DEFAULT-PATIENT',
        facilityId,
        appointmentDate: tomorrow.toISOString(),
        startTime: '10:00',
        endTime: '10:15',
        department: selectedCategory === 'MATERNAL_CARE' ? 'OBG' : 'OPD',
      });
      return res;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    recommendMutation.mutate();
  };

  const handleBook = async (rec: CareRoutingRecommendation) => {
    if (!user?.patientId) {
      alert('Please select a Citizen profile from the top-right persona selector to book a token.');
      return;
    }
    const res = await bookMutation.mutateAsync(rec.facilityId);
    if (res.success && res.data) {
      setBookingResult({
        facilityName: rec.name,
        tokenNumber: res.data.tokenNumber,
        appointmentId: res.data.id,
      });
    } else {
      alert(res.error?.message || 'Booking failed');
    }
  };

  const recommendations = recommendMutation.data?.data?.recommendations || [];
  const disclaimer = recommendMutation.data?.data?.disclaimer;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Compass className="w-7 h-7 text-blue-700" />
          Smart Care Router & Recommendation Engine
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Structured public healthcare navigation based on distance, functional status, clinical specialties, and queue load.
        </p>
      </div>

      {/* Booking confirmation banner */}
      {bookingResult && (
        <Alert variant="success" className="flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h4 className="font-bold text-base text-emerald-900">
              Token Booked Successfully! Token: {bookingResult.tokenNumber}
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Confirmed at {bookingResult.facilityName}. You can track queue status in real time.
            </p>
          </div>
          <Link href="/citizen/appointments">
            <Button size="sm" variant="primary" className="mt-2 sm:mt-0">
              View My Token →
            </Button>
          </Link>
        </Alert>
      )}

      {/* Input Form */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Care Need or Symptoms
            </label>
            <Input
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="e.g. fever, cough, antenatal routine check-up, pediatric rash..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Required Service Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="PRIMARY_ASSESSMENT">General Primary Care / Outpatient</option>
                <option value="MATERNAL_CARE">Maternal Care / Antenatal (OBG)</option>
                <option value="CHILD_ASSESSMENT">Child Assessment / Pediatrics</option>
                <option value="SPECIALIST_REVIEW">Specialist Clinical Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Clinical Urgency
              </label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="LOW">Routine / Mild (LOW)</option>
                <option value="MEDIUM">Standard Consultation (MEDIUM)</option>
                <option value="HIGH">Priority Assessment (HIGH)</option>
                <option value="CRITICAL">Immediate Attention (CRITICAL)</option>
              </select>
            </div>
          </div>

          {/* Location & Pincode */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Simulated Location: <strong>Kandivali West, Mumbai (Pincode: {pincode})</strong>
              </span>
            </div>
            <span className="text-slate-500">
              Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
            </span>
          </div>

          <Button type="submit" variant="primary" className="w-full sm:w-auto" isLoading={recommendMutation.isPending}>
            Route to Right Public Facility
          </Button>
        </form>
      </Card>

      {/* Safety Notice (Section 144) */}
      <div className="text-xs text-slate-500 bg-amber-50/60 border border-amber-200/60 p-3 rounded-lg flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Clinical Safety Notice:</strong> This care routing system is designed solely to navigate citizens to appropriate public health centers. It does not provide medical diagnoses or prescriptions.
        </span>
      </div>

      {/* Recommendation Results */}
      {recommendMutation.isPending && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">
              Ranked Facility Recommendations ({recommendations.length})
            </h3>
            <span className="text-xs text-slate-500">
              Scored on 100-point multi-criteria model
            </span>
          </div>

          {recommendations.map((rec, idx) => {
            const isTopMatch = idx === 0;
            return (
              <Card
                key={rec.facilityId}
                className={`relative transition-all ${
                  isTopMatch ? 'border-2 border-blue-600 shadow-md bg-gradient-to-r from-white to-blue-50/20' : ''
                }`}
              >
                {isTopMatch && (
                  <span className="absolute -top-3 left-4 bg-blue-700 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow">
                    ★ Best Matched Facility
                  </span>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-slate-900">
                        {rec.name}
                      </h4>
                      <Badge variant={rec.score >= 80 ? 'success' : 'info'}>
                        {rec.score}% Match Score
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">{rec.facilityType}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {rec.distanceKm} km away
                      </span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">Functional</span>
                    </div>

                    {/* Explainability Reasons (Section 12.6) */}
                    <div className="pt-2 space-y-1">
                      <div className="text-xs font-semibold text-slate-700">
                        Why this facility was recommended:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                        {rec.reasons.map((reason, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-1.5 text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleBook(rec)}
                      isLoading={bookMutation.isPending}
                    >
                      Book Consultation Token
                    </Button>
                    <Link href={`/facilities/${rec.facilityId}`}>
                      <Button variant="outline" size="sm">
                        Facility Details & Queue
                      </Button>
                    </Link>
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
