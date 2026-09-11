'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workerApi } from '../../../../lib/api/scoped.api';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserCheck, AlertCircle } from 'lucide-react';

export default function NewPatientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('FEMALE');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('400067');
  const [catchmentCode, setCatchmentCode] = useState('KANDIVALI_WEST_WARD_R_SOUTH');

  const createMutation = useMutation({
    mutationFn: () =>
      workerApi.registerPatient({
        firstName,
        lastName: lastName || undefined,
        phone,
        dateOfBirth: dateOfBirth || undefined,
        sex,
        address: address || undefined,
        pincode,
        catchmentCode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-patients'] });
      router.push('/portal/patients');
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Link
        href="/portal/patients"
        className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Patient Roster
      </Link>

      <div>
        <h1 className="text-2xl font-black text-slate-900">Enroll Citizen to Catchment</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate an authenticated health identifier and bind to your ward responsibility area.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        {createMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{(createMutation.error as any)?.message || 'Enrollment failed'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Biological Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Catchment Code</label>
            <input
              type="text"
              readOnly
              value={catchmentCode}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!firstName || !phone || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            {createMutation.isPending ? 'Enrolling...' : 'Register Citizen'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
