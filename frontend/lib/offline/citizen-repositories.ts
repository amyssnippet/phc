import { meApi } from '../api/scoped.api';
import { db, OfflineAppointment, OfflineQueueToken } from './db';

export class AppointmentRepository {
  async getMyAppointments(): Promise<{ items: any[]; isOffline: boolean }> {
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await meApi.getAppointments();
        if (res.success && Array.isArray(res.data)) {
          // Cache in Dexie
          for (const app of res.data) {
            await db.appointments.put({
              id: app.id,
              facilityId: app.facilityId,
              facilityName: app.facility?.name || 'Public Health Centre',
              department: app.department || 'GENERAL_MEDICINE',
              appointmentDate: String(app.appointmentDate || ''),
              serviceDate: String(app.serviceDate || ''),
              startTime: String(app.startTime || ''),
              endTime: String(app.endTime || ''),
              tokenNumber: String(app.tokenNumber || app.queueToken?.displayNumber || ''),
              status: String(app.status || 'BOOKED'),
            });
          }
          return { items: res.data, isOffline: false };
        }
      } catch {
        // Fallback below
      }
    }

    const cached = await db.appointments.toArray();
    return {
      items: cached.map((c) => ({
        id: c.id,
        facilityId: c.facilityId,
        facility: { name: c.facilityName },
        department: c.department,
        appointmentDate: c.appointmentDate,
        serviceDate: c.serviceDate,
        startTime: c.startTime,
        endTime: c.endTime,
        tokenNumber: c.tokenNumber,
        queueToken: { displayNumber: c.tokenNumber, status: c.status },
        status: c.status,
      })),
      isOffline: true,
    };
  }
}

export class QueueRepository {
  async getMyQueueStatus(): Promise<{ data: any; isOffline: boolean }> {
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await meApi.getQueueStatus();
        if (res.success && res.data) {
          const qd = res.data;
          const tokenObj = qd.token || qd.ownToken;
          if (qd.hasActiveToken && tokenObj) {
            await db.queueTokens.put({
              id: (tokenObj as any).id || 'current',
              facilityId: (tokenObj as any).facilityId || qd.facilityId || '',
              displayNumber: (tokenObj as any).displayNumber || (tokenObj as any).tokenNumber || qd.myToken || '',
              department: (tokenObj as any).department || '',
              status: (tokenObj as any).status || 'WAITING',
              estimatedWaitMinutes: (tokenObj as any).estimatedWaitMinutes ?? qd.estimatedWaitMinutes,
              aheadCount: (tokenObj as any).aheadInLine ?? qd.patientsAhead ?? qd.ahead,
            });
          }
          return { data: res.data, isOffline: false };
        }
      } catch {
        // Fallback below
      }
    }

    const cached = await db.queueTokens.orderBy('id').last();
    if (cached) {
      return {
        data: {
          hasActiveToken: true,
          facilityId: cached.facilityId,
          facilityName: 'Public Health Centre',
          ownToken: {
            id: cached.id,
            tokenNumber: cached.displayNumber,
            department: cached.department,
            status: cached.status,
            estimatedWaitMinutes: cached.estimatedWaitMinutes,
          },
          currentCalledToken: null,
          patientsAhead: cached.aheadCount ?? 0,
        },
        isOffline: true,
      };
    }

    return {
      data: {
        hasActiveToken: false,
        facilityId: null,
        facilityName: null,
        ownToken: null,
        currentCalledToken: null,
        patientsAhead: 0,
      },
      isOffline: true,
    };
  }
}

export const appointmentRepository = new AppointmentRepository();
export const queueRepository = new QueueRepository();
