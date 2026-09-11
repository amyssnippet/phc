'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '../../../../lib/api/scoped.api';
import { facilitiesApi } from '../../../../lib/api/facilities.api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Clock,
  Ticket,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

const DEPARTMENTS = [
  { id: 'GENERAL_MEDICINE', name: 'General Medicine (OPD)', prefix: 'GM' },
  { id: 'SPECIALIST', name: 'Specialist Consultation', prefix: 'SP' },
  { id: 'MATERNAL', name: 'Maternal & Child Health (RCH)', prefix: 'MCH' },
  { id: 'PEDIATRICS', name: 'Pediatrics / Immunization', prefix: 'PED' },
  { id: 'DENTAL', name: 'Dental & Oral Health', prefix: 'DNT' },
];

const TIME_SLOTS = [
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
];

export default function NewAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [facilitySearch, setFacilitySearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('GENERAL_MEDICINE');

  // Check URL params for preselected facility
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const facId = params.get('facilityId');
      if (facId) {
        setSelectedFacilityId(facId);
        setStep(2);
      }
    }
  }, []);
  
  // Default to tomorrow or next weekday
  const getNextWeekday = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) { // Skip Sunday
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().slice(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState<string>(getNextWeekday());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string }>(TIME_SLOTS[1]);
  const [bookedToken, setBookedToken] = useState<any | null>(null);

  // Load facilities catalogue (all 50 Mumbai Suburban PHCs)
  const { data: facilitiesData, isLoading: loadingFacilities } = useQuery({
    queryKey: ['public-facilities-catalogue'],
    queryFn: () => facilitiesApi.search({ limit: 50 }),
  });

  const facilities = facilitiesData?.data?.items || [];
  const filteredFacilities = facilities.filter((f: any) =>
    facilitySearch
      ? f.name.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        (f.pincode && f.pincode.includes(facilitySearch))
      : true
  );
  const selectedFacility = facilities.find((f: any) => f.id === selectedFacilityId);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await meApi.bookAppointment({
        facilityId: selectedFacilityId,
        appointmentDate: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        department: selectedDept,
      });
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to book token');
      }
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['citizen-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-queue'] });
      setBookedToken(data);
    },
  });

  if (bookedToken) {
    const tokenNumber = bookedToken.queueToken?.displayNumber || 'GM-001';
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <Card className="border-emerald-200 bg-emerald-50/40 text-center p-6 space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <Badge variant="success" className="mb-2">Appointment Confirmed</Badge>
            <h1 className="text-2xl font-black text-slate-900">Your OPD Token is Ready</h1>
            <p className="text-xs text-slate-500 mt-1">
              Live token allocated atomically via SwasthyaSetu Care Coordination
            </p>
          </div>

          {/* Token Card */}
          <div className="bg-white border-2 border-dashed border-blue-300 rounded-2xl p-6 max-w-sm mx-auto shadow-sm">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              {bookedToken.department} OPD TOKEN
            </div>
            <div className="text-4xl font-black text-blue-900 tracking-tight my-2">
              {tokenNumber}
            </div>
            <div className="text-sm font-semibold text-slate-800">
              {selectedFacility?.name || bookedToken.facility?.name}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-2">
              <span>{bookedToken.appointmentDate?.slice(0, 10) || selectedDate}</span>
              <span>·</span>
              <span>{bookedToken.startTime} - {bookedToken.endTime}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left text-xs text-blue-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Patient Instructions
            </div>
            <p>• Please report to the registration desk 15 minutes before your time slot.</p>
            <p>• Announce your token <strong>{tokenNumber}</strong> or show this confirmation on your device.</p>
            <p>• Live queue updates can be checked at any time under "My Tokens".</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/citizen/appointments">
              <Button variant="primary" className="w-full sm:w-auto">
                View My Tokens
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/citizen/appointments"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to My Tokens
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={step >= 1 ? 'font-bold text-blue-700' : ''}>1. Facility</span>
          <span>→</span>
          <span className={step >= 2 ? 'font-bold text-blue-700' : ''}>2. Slot</span>
          <span>→</span>
          <span className={step >= 3 ? 'font-bold text-blue-700' : ''}>3. Confirm</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900">Book Outpatient Consultation Token</h1>
        <p className="text-xs text-slate-500 mt-1">
          Instant token allocation across Urban Primary Health Centres in Mumbai Suburban
        </p>
      </div>

      {/* Step 1: Facility & Dept */}
      {step === 1 && (
        <Card className="p-5 space-y-5">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Step 1: Select Primary Health Centre / Hospital ({filteredFacilities.length})
              </label>
              <input
                type="text"
                placeholder="Search PHC name or pincode..."
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 w-full sm:w-64"
              />
            </div>
            {loadingFacilities ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredFacilities.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No facilities match &quot;{facilitySearch}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {filteredFacilities.map((f: any) => {
                  const isSelected = selectedFacilityId === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFacilityId(f.id)}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Building2
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            isSelected ? 'text-blue-700' : 'text-slate-400'
                          }`}
                        />
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {f.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {f.facilityType} · Pincode: {f.pincode || '400067'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Select Department
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEPARTMENTS.map((dept) => (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`p-3 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                    selectedDept === dept.id
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{dept.name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        selectedDept === dept.id
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {dept.prefix}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              disabled={!selectedFacilityId}
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5"
            >
              Continue to Slot Selection <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Date & Slot */}
      {step === 2 && (
        <Card className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Step 2: Choose Consultation Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              UPHC clinics operate Monday through Saturday. Closed on Sundays.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Available OPD Time Slots
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {TIME_SLOTS.map((slot) => {
                const isSelected =
                  selectedSlot.start === slot.start && selectedSlot.end === slot.end;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{slot.start} - {slot.end}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="primary" onClick={() => setStep(3)} className="flex items-center gap-1.5">
              Review & Confirm <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <Card className="p-5 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Review Booking Details</h3>
            <p className="text-xs text-slate-500">Confirm and generate your verified token</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 divide-y divide-slate-200/80 text-xs space-y-2.5">
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Facility:</span>
              <span className="font-bold text-slate-900">{selectedFacility?.name}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Department:</span>
              <span className="font-bold text-slate-900">
                {DEPARTMENTS.find((d) => d.id === selectedDept)?.name}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Date:</span>
              <span className="font-bold text-slate-900">{selectedDate}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Time Window:</span>
              <span className="font-bold text-slate-900">
                {selectedSlot.start} - {selectedSlot.end}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500">Consultation Fee:</span>
              <span className="font-bold text-emerald-700">₹0 (Free Public Healthcare)</span>
            </div>
          </div>

          {bookMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{(bookMutation.error as any)?.message || 'Booking failed'}</span>
            </div>
          )}

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
              className="flex items-center gap-1.5"
            >
              {bookMutation.isPending ? 'Generating Token...' : 'Confirm Booking'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
