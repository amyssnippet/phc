'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Database, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HardDrive,
  Cpu,
  Trash2
} from 'lucide-react';
import { syncManager } from '@/lib/offline/sync-manager';
import { db, OfflineSyncQueueItem } from '@/lib/offline/db';
import { useAuth } from '@/lib/auth/auth-context';

export default function OfflineSyncPage() {
  const { isOnline } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [queueItems, setQueueItems] = useState<OfflineSyncQueueItem[]>([]);
  const [facilitiesCount, setFacilitiesCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ syncedCount: number; conflicts: any[]; failed: any[] } | null>(null);

  const refreshData = async () => {
    try {
      setDeviceId(syncManager.getDeviceId());
      const items = await db.syncQueue.reverse().limit(50).toArray();
      setQueueItems(items);
      const facCount = await db.facilities.count();
      setFacilitiesCount(facCount);
      const dCount = await db.patientDrafts.count();
      setDraftsCount(dCount);
    } catch (e) {
      console.error('Failed to load sync queue items', e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please connect to internet.');
      return;
    }
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncManager.syncNow();
      setSyncResult(res);
      await refreshData();
    } catch (err: any) {
      console.error('Manual sync failed', err);
      alert(`Sync failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const clearSyncedItems = async () => {
    await db.syncQueue.where('status').equals('SYNCED').delete();
    await refreshData();
  };

  const pendingCount = queueItems.filter((i) => i.status === 'PENDING').length;
  const conflictCount = queueItems.filter((i) => i.status === 'CONFLICT').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/frontline" 
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Frontline Desk
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? 'success' : 'warning'} className="flex items-center gap-1.5 py-1">
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Connected to Grid' : 'Local Offline Mode'}
          </Badge>
        </div>
      </div>

      {/* Sync Control Header */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  IndexedDB Resilient Sync
                </span>
                <span className="font-mono text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  Device: {deviceId.slice(0, 15)}...
                </span>
              </div>
              <h1 className="text-2xl font-bold">Offline Operations & Field Sync Center</h1>
              <p className="text-sm text-slate-300 max-w-xl">
                Frontline registrations, vitals triages, and referrals are staged locally in the browser when connectivity drops, maintaining complete data integrity and audit lineage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleManualSync}
                disabled={syncing || !isOnline}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronizing...' : 'Sync Now'}
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
            <div>
              <div className="text-xs text-slate-400">Pending Sync</div>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">{pendingCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Conflicts Detected</div>
              <div className="text-2xl font-bold text-red-400 mt-0.5">{conflictCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Cached Facilities</div>
              <div className="text-2xl font-bold text-cyan-400 mt-0.5">{facilitiesCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Local Patient Drafts</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{draftsCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync result alert */}
      {syncResult && (
        <Alert variant={syncResult.conflicts.length > 0 ? "warning" : "default"} className="bg-white dark:bg-slate-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <AlertDescription>
            Sync run finished: <strong>{syncResult.syncedCount}</strong> operations acknowledged by server.
            {syncResult.conflicts.length > 0 && ` ${syncResult.conflicts.length} conflicts recorded.`}
            {syncResult.failed.length > 0 && ` ${syncResult.failed.length} operations failed to push.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Queue Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              Staged Operations Queue ({queueItems.length})
            </CardTitle>
            {queueItems.some(i => i.status === 'SYNCED') && (
              <Button size="sm" variant="ghost" onClick={clearSyncedItems} className="text-xs text-slate-500 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear Synced
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {queueItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              Sync queue is completely empty. All operations are up-to-date.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
              {queueItems.map((item) => (
                <div key={item.operationId} className="p-4 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">
                      {item.status === 'SYNCED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : item.status === 'CONFLICT' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.operation} {item.entityType}
                        </span>
                        <Badge 
                          variant={
                            item.status === 'SYNCED' 
                              ? 'success' 
                              : item.status === 'CONFLICT' 
                              ? 'destructive' 
                              : 'warning'
                          } 
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        ID: {item.operationId} {item.entityId && `| Entity: ${item.entityId}`}
                      </div>
                      {item.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 font-sans">
                          {item.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400 flex-shrink-0">
                    <div>{new Date(item.clientCreatedAt).toLocaleTimeString()}</div>
                    <div>Retry: {item.retryCount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
