import { facilitiesApi, FacilityPublic } from '../api/facilities.api';
import { db, OfflineFacility } from './db';
import publicCatalogueRaw from '../data/mumbai-suburban.public.json';

// Haversine formula for offline calculations
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class FacilityRepository {
  private bundledFacilities: FacilityPublic[] = publicCatalogueRaw as unknown as FacilityPublic[];

  async search(params?: { q?: string; pincode?: string; specialty?: string }): Promise<{
    items: FacilityPublic[];
    isOffline: boolean;
  }> {
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await facilitiesApi.search(params);
        if (res.success && res.data?.items) {
          // Cache in Dexie
          this.cacheFacilities(res.data.items);
          return { items: res.data.items, isOffline: false };
        }
      } catch {
        // Fallback to offline below
      }
    }

    // Offline fallback from IndexedDB or bundled JSON
    let facilities: FacilityPublic[] = await this.getFromIndexedDB();
    if (facilities.length === 0) {
      facilities = this.bundledFacilities;
    }

    let filtered = facilities;
    if (params?.q) {
      const qLower = params.q.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(qLower) ||
          (f.address && f.address.toLowerCase().includes(qLower)) ||
          (f.pincode && f.pincode.includes(qLower))
      );
    }
    if (params?.pincode) {
      filtered = filtered.filter((f) => f.pincode === params.pincode);
    }
    if (params?.specialty) {
      const sLower = params.specialty.toLowerCase();
      filtered = filtered.filter((f) =>
        f.specialties.some((s: string) => s.toLowerCase().includes(sLower))
      );
    }

    return { items: filtered, isOffline: true };
  }

  async getNearby(
    lat: number,
    lng: number,
    radius = 15
  ): Promise<{ items: FacilityPublic[]; isOffline: boolean }> {
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await facilitiesApi.nearby({ lat, lng, radius });
        if (res.success && res.data?.items) {
          this.cacheFacilities(res.data.items);
          return { items: res.data.items, isOffline: false };
        }
      } catch {
        // Fallback to offline
      }
    }

    // Offline Haversine calculation
    let facilities: FacilityPublic[] = await this.getFromIndexedDB();
    if (facilities.length === 0) {
      facilities = this.bundledFacilities;
    }

    const calculated = facilities
      .map((f) => {
        if (f.latitude && f.longitude) {
          const dist = haversineKm(lat, lng, f.latitude, f.longitude);
          return { ...f, distanceKm: dist };
        }
        return { ...f, distanceKm: 999 };
      })
      .filter((f) => (f.distanceKm ?? 999) <= radius)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return { items: calculated, isOffline: true };
  }

  private async cacheFacilities(items: FacilityPublic[]) {
    try {
      for (const item of items) {
        await db.facilities.put({
          id: item.id,
          externalFacilityId: item.externalFacilityId,
          name: item.name,
          facilityType: item.facilityType,
          serviceType: item.serviceType,
          pincode: item.pincode,
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
          operationalStatus: item.operationalStatus,
          dataQualityScore: item.dataQualityScore,
          specialties: item.specialties,
        });
      }
    } catch {
      // IndexedDB cache error ignored
    }
  }

  private async getFromIndexedDB(): Promise<FacilityPublic[]> {
    try {
      const records = await db.facilities.toArray();
      return records.map((r) => ({
        ...r,
        ownership: null,
        location: r.latitude && r.longitude ? { latitude: r.latitude, longitude: r.longitude } : null,
        emrEnabled: false,
        abdmEnabled: true,
        hours: [],
        resources: null,
        sourceLastUpdated: null,
      }));
    } catch {
      return [];
    }
  }
}

export const facilityRepository = new FacilityRepository();
