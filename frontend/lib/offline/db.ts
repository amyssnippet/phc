import Dexie, { Table } from 'dexie';

export interface OfflineFacility {
  id: string;
  externalFacilityId: string;
  name: string;
  facilityType: string;
  serviceType: string | null;
  pincode: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  operationalStatus: string | null;
  dataQualityScore: number;
  specialties: string[];
}

export interface OfflinePatientDraft {
  id?: number;
  clientDraftId: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  pincode?: string;
  address?: string;
  createdAt: string;
  synced: boolean;
}

export interface OfflineReferralDraft {
  id?: number;
  clientDraftId: string;
  patientId: string;
  sourceFacilityId: string;
  destinationFacilityId: string;
  reason: string;
  urgency: string;
  createdAt: string;
  synced: boolean;
}

export interface OfflineSyncQueueItem {
  id?: number;
  operationId: string;
  entityType: 'PATIENT' | 'TRIAGE' | 'REFERRAL' | 'FOLLOWUP' | 'APPOINTMENT';
  entityId?: string | null;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  clientCreatedAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  retryCount: number;
  errorMessage?: string;
}

export class MahaSwasthyaDatabase extends Dexie {
  facilities!: Table<OfflineFacility, string>;
  patientDrafts!: Table<OfflinePatientDraft, number>;
  referralDrafts!: Table<OfflineReferralDraft, number>;
  syncQueue!: Table<OfflineSyncQueueItem, number>;

  constructor() {
    super('MahaSwasthyaDB');
    this.version(1).stores({
      facilities: 'id, externalFacilityId, name, pincode',
      patientDrafts: '++id, clientDraftId, synced, createdAt',
      referralDrafts: '++id, clientDraftId, patientId, synced, createdAt',
      syncQueue: '++id, operationId, entityType, status, clientCreatedAt',
    });
  }
}

export const db = new MahaSwasthyaDatabase();
