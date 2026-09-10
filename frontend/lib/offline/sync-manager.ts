import { db, OfflineSyncQueueItem } from './db';
import { syncApi } from '../api/sync.api';

export class SyncManager {
  private deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return 'server_device';
    let id = localStorage.getItem('mahaswasthya_device_id');
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('mahaswasthya_device_id', id);
    }
    return id;
  }

  getDeviceId() {
    return this.deviceId;
  }

  async enqueueOperation(
    entityType: OfflineSyncQueueItem['entityType'],
    operation: OfflineSyncQueueItem['operation'],
    payload: any,
    entityId?: string | null
  ) {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const clientCreatedAt = new Date().toISOString();

    await db.syncQueue.add({
      operationId,
      entityType,
      entityId: entityId || null,
      operation,
      payload,
      clientCreatedAt,
      status: 'PENDING',
      retryCount: 0,
    });

    return operationId;
  }

  async getPendingCount(): Promise<number> {
    return db.syncQueue.where('status').equals('PENDING').count();
  }

  async syncNow(): Promise<{ syncedCount: number; conflicts: any[]; failed: any[] }> {
    const pending = await db.syncQueue.where('status').equals('PENDING').toArray();
    if (pending.length === 0) {
      return { syncedCount: 0, conflicts: [], failed: [] };
    }

    const operations = pending.map((p) => ({
      operationId: p.operationId,
      entityType: p.entityType,
      entityId: p.entityId,
      operation: p.operation,
      payload: p.payload,
      clientCreatedAt: p.clientCreatedAt,
    }));

    const res = await syncApi.push({
      deviceId: this.deviceId,
      operations,
    });

    if (res.success && res.data) {
      const { accepted, conflicts, failed } = res.data;

      // Mark accepted
      for (const acc of accepted) {
        await db.syncQueue
          .where('operationId')
          .equals(acc.operationId)
          .modify({ status: 'SYNCED' });
      }

      // Mark conflicts
      for (const conf of conflicts) {
        await db.syncQueue
          .where('operationId')
          .equals(conf.operationId)
          .modify({ status: 'CONFLICT', errorMessage: conf.message });
      }

      // Increment retry on failed
      for (const f of failed) {
        const item = await db.syncQueue.where('operationId').equals(f.operationId).first();
        if (item && item.id) {
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            errorMessage: f.error,
          });
        }
      }

      return {
        syncedCount: accepted.length,
        conflicts,
        failed,
      };
    }

    return { syncedCount: 0, conflicts: [], failed: [] };
  }
}

export const syncManager = new SyncManager();
