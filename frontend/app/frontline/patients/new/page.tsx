'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserPlus, 
  ArrowLeft, 
  CheckCircle, 
  Stethoscope, 
  Compass, 
  Wifi, 
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { patientsApi } from '@/lib/api/patients.api';
import { syncManager } from '@/lib/offline/sync-manager';
import { db } from '@/lib/offline/db';

export default function NewPatientPage() {
  const router = useRouter();
  const { isOnline } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'FEMALE',
    phone: '',
    pincode: '400067',
    address: 'Kandivali West, Mumbai Suburban',
    abhaId: '',
    emergencyContact: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPatient, setCreatedPatient] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!formData.firstName.trim()) {
      setError('First name is required.');
      setSubmitting(false);
      return;
    }

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim() || undefined,
      gender: formData.gender,
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      phone: formData.phone.trim() || undefined,
      pincode: formData.pincode.trim() || undefined,
      address: formData.address.trim() || undefined,
      abhaId: formData.abhaId.trim() || undefined,
      emergencyContact: formData.emergencyContact.trim() || undefined,
    };

    try {
      if (isOnline) {
        const res = await patientsApi.create(payload);
        if (res.success && res.data) {
          setCreatedPatient(res.data);
          return;
        }
      }

      // Offline fallback: Save to Dexie and queue operation
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db.patientDrafts.add({
        clientDraftId: draftId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        pincode: payload.pincode,
        address: payload.address,
        createdAt: new Date().toISOString(),
        synced: false,
      });

      await syncManager.enqueueOperation('PATIENT', 'CREATE', payload, draftId);

      setCreatedPatient({
        id: draftId,
        patientCode: 'LOCAL-DRAFT',
        firstName: payload.firstName,
        lastName: payload.lastName,
        isOfflineDraft: true,
      });
    } catch (err: any) {
      console.error('Registration failed, fallback to offline draft', err);
      // Fallback to local draft even if online request errored
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db.patientDrafts.add({
        clientDraftId: draftId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        pincode: payload.pincode,
        address: payload.address,
        createdAt: new Date().toISOString(),
        synced: false,
      });
      await syncManager.enqueueOperation('PATIENT', 'CREATE', payload, draftId);
      setCreatedPatient({
        id: draftId,
        patientCode: 'LOCAL-DRAFT',
        firstName: payload.firstName,
        lastName: payload.lastName,
        isOfflineDraft: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/frontline" 
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Frontline Desk
        </Link>
        <Badge variant={isOnline ? 'success' : 'warning'} className="flex items-center gap-1">
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online Mode' : 'Offline Mode (Local Draft)'}
        </Badge>
      </div>

      {createdPatient ? (
        <Card className="border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Patient Registered Successfully!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                {createdPatient.isOfflineDraft 
                  ? 'Patient saved locally in offline queue. Will sync automatically when connection restores.'
                  : 'Patient created in central health registry with verified ID.'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 inline-block text-left min-w-[280px]">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Patient Code</div>
              <div className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {createdPatient.patientCode || 'REGISTERED'}
              </div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                {createdPatient.firstName} {createdPatient.lastName}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href={`/frontline/triage?patientId=${createdPatient.id}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Perform Triage
                </Button>
              </Link>
              <Link href={`/find-care?patientId=${createdPatient.id}`}>
                <Button variant="outline">
                  <Compass className="w-4 h-4 mr-2" />
                  Route to Facility
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setCreatedPatient(null);
                  setFormData({
                    firstName: '',
                    lastName: '',
                    age: '',
                    gender: 'FEMALE',
                    phone: '',
                    pincode: '400067',
                    address: 'Kandivali West, Mumbai Suburban',
                    abhaId: '',
                    emergencyContact: '',
                  });
                }}
              >
                Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              New Patient Registration (Point of Care)
            </CardTitle>
            <p className="text-xs text-slate-500">
              Captures demographic profile for care continuity, triage triage scoring, and referral tracking across Mumbai Suburban healthcare grid.
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name *
                  </label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="e.g. Priya"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="e.g. Shinde"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Age (Years)
                  </label>
                  <Input
                    name="age"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 32"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <Input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="98XXXXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode (Mumbai Suburban)
                  </label>
                  <Input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="400067"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Locality / Slum Cluster / Address
                  </label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Room No, Chawl / Society, Ward R/South"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ABHA / Health ID (Optional)
                  </label>
                  <Input
                    name="abhaId"
                    value={formData.abhaId}
                    onChange={handleChange}
                    placeholder="14-digit ABHA number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact Name & Tel
                  </label>
                  <Input
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    placeholder="Spouse / Parent (98XXXXXXXX)"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Link href="/frontline">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? 'Registering...' : 'Register & Create Record'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
