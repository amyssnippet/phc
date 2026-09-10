import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { publicFacilitySerializer } from './facilities.serializer.js';

export class FacilityService {
  private computeIsOpenNow(hours: any[]): boolean {
    if (!hours || hours.length === 0) return false;
    const now = new Date();
    const currentWeekday = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    const todayHour = hours.find((h) => h.weekday === currentWeekday && h.active);
    if (!todayHour) return false;
    if (todayHour.is24Hours) return true;
    if (!todayHour.openTime || !todayHour.closeTime) return false;

    return currentTimeStr >= todayHour.openTime && currentTimeStr <= todayHour.closeTime;
  }

  async findNearby(query: {
    lat: number;
    lng: number;
    radius: number;
    specialty?: string;
    facilityType?: string;
    serviceType?: string;
    openNow?: boolean;
    abdm?: boolean;
    emr?: boolean;
  }) {
    const { lat, lng, radius, specialty, facilityType, serviceType, openNow, abdm, emr } = query;

    // Use PostGIS spatial query for distance and radius
    const facilities: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT 
        f."id",
        f."externalFacilityId",
        f."name",
        f."facilityType",
        f."serviceType",
        f."ownership",
        f."pincode",
        f."address",
        f."latitude",
        f."longitude",
        f."operationalStatus",
        f."emrEnabled",
        f."abdmEnabled",
        f."dataQualityScore",
        f."sourceLastUpdated",
        ROUND((ST_Distance(f."location", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000)::numeric, 2) AS "distanceKm"
      FROM "Facility" f
      WHERE f."location" IS NOT NULL
        AND ST_DWithin(f."location", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3 * 1000)
      ORDER BY "distanceKm" ASC;
      `,
      lat,
      lng,
      radius
    );

    // Fetch relations for filtering and serializing
    const facilityIds = facilities.map((f) => f.id);
    const [specialties, hours] = await Promise.all([
      prisma.facilitySpecialty.findMany({ where: { facilityId: { in: facilityIds } } }),
      prisma.facilityHour.findMany({ where: { facilityId: { in: facilityIds } } }),
    ]);

    const specialtyMap = new Map<string, string[]>();
    specialties.forEach((s) => {
      const list = specialtyMap.get(s.facilityId) || [];
      list.push(s.name);
      specialtyMap.set(s.facilityId, list);
    });

    const hoursMap = new Map<string, any[]>();
    hours.forEach((h) => {
      const list = hoursMap.get(h.facilityId) || [];
      list.push(h);
      hoursMap.set(h.facilityId, list);
    });

    let items = facilities.map((f) => {
      const facSpecialties = specialtyMap.get(f.id) || [];
      const facHours = hoursMap.get(f.id) || [];
      const isOpen = this.computeIsOpenNow(facHours);

      return publicFacilitySerializer({
        ...f,
        specialties: facSpecialties,
        hours: facHours,
        isOpenNow: isOpen,
      });
    });

    // Apply secondary filters in memory
    if (specialty) {
      const sLower = specialty.toLowerCase();
      items = items.filter((f) => f.specialties.some((s: string) => s.toLowerCase().includes(sLower)));
    }
    if (facilityType) {
      items = items.filter((f) => f.facilityType.toLowerCase() === facilityType.toLowerCase());
    }
    if (serviceType) {
      items = items.filter((f) => f.serviceType && f.serviceType.toLowerCase().includes(serviceType.toLowerCase()));
    }
    if (openNow !== undefined) {
      items = items.filter((f) => f.isOpenNow === openNow);
    }
    if (abdm !== undefined) {
      items = items.filter((f) => f.abdmEnabled === abdm);
    }
    if (emr !== undefined) {
      items = items.filter((f) => f.emrEnabled === emr);
    }

    return { items, count: items.length };
  }

  async searchFacilities(params: {
    q?: string;
    pincode?: string;
    specialty?: string;
    facilityType?: string;
    serviceType?: string;
    page: number;
    limit: number;
  }) {
    const { q, pincode, specialty, facilityType, serviceType, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { pincode: { contains: q } },
      ];
    }

    if (pincode) {
      where.pincode = pincode;
    }

    if (facilityType) {
      where.facilityType = { equals: facilityType, mode: 'insensitive' };
    }

    if (serviceType) {
      where.serviceType = { contains: serviceType, mode: 'insensitive' };
    }

    if (specialty) {
      where.specialties = {
        some: {
          name: { contains: specialty, mode: 'insensitive' },
        },
      };
    }

    const [total, facilities] = await Promise.all([
      prisma.facility.count({ where }),
      prisma.facility.findMany({
        where,
        skip,
        take: limit,
        include: {
          specialties: true,
          hours: true,
          resources: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const items = facilities.map((f) => {
      const isOpen = this.computeIsOpenNow(f.hours);
      return publicFacilitySerializer({
        ...f,
        specialties: f.specialties.map((s) => s.name),
        isOpenNow: isOpen,
      });
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getMapFacilities(bounds: { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number }) {
    const where: any = {
      latitude: { not: null },
      longitude: { not: null },
    };

    if (bounds.minLat && bounds.maxLat && bounds.minLng && bounds.maxLng) {
      where.latitude = { gte: bounds.minLat, lte: bounds.maxLat };
      where.longitude = { gte: bounds.minLng, lte: bounds.maxLng };
    }

    const facilities = await prisma.facility.findMany({
      where,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        facilityType: true,
        operationalStatus: true,
        dataQualityScore: true,
        specialties: {
          select: { name: true },
        },
      },
      take: 100,
    });

    return facilities.map((f) => ({
      id: f.id,
      name: f.name,
      lat: f.latitude,
      lng: f.longitude,
      facilityType: f.facilityType,
      status: f.operationalStatus,
      dataQualityScore: f.dataQualityScore,
      specialties: f.specialties.map((s) => s.name),
    }));
  }

  async getFacilityById(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        specialties: true,
        hours: { orderBy: { weekday: 'asc' } },
        resources: true,
        diagnostics: true,
        demoCapabilities: true,
      },
    });

    if (!facility) {
      throw new NotFoundError('Facility not found', 'FACILITY_NOT_FOUND');
    }

    const isOpen = this.computeIsOpenNow(facility.hours);

    return {
      ...publicFacilitySerializer({
        ...facility,
        specialties: facility.specialties.map((s) => s.name),
        isOpenNow: isOpen,
      }),
      diagnostics: facility.diagnostics,
      demoCapabilities: facility.demoCapabilities,
    };
  }

  async getHours(facilityId: string) {
    return prisma.facilityHour.findMany({
      where: { facilityId },
      orderBy: { weekday: 'asc' },
    });
  }

  async getSpecialties(facilityId: string) {
    return prisma.facilitySpecialty.findMany({
      where: { facilityId },
    });
  }

  async getResources(facilityId: string) {
    const res = await prisma.facilityResource.findUnique({
      where: { facilityId },
    });
    if (!res) {
      throw new NotFoundError('Facility resources not found', 'RESOURCE_NOT_FOUND');
    }
    return res;
  }

  async getQueueState(facilityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tokens = await prisma.queueToken.findMany({
      where: {
        facilityId,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    const waiting = tokens.filter((t) => t.status === 'WAITING');
    const called = tokens.find((t) => t.status === 'CALLED') || null;
    const completed = tokens.filter((t) => t.status === 'COMPLETED');

    return {
      facilityId,
      totalTokensToday: tokens.length,
      waitingCount: waiting.length,
      currentCalled: called ? { id: called.id, tokenNumber: called.tokenNumber, department: called.department } : null,
      completedCount: completed.length,
      averageEstimatedWaitMinutes: waiting.length * 8,
      tokens: tokens.slice(0, 20),
    };
  }

  async getDiagnostics(facilityId: string) {
    return prisma.diagnosticService.findMany({
      where: { facilityId },
    });
  }
}

export const facilityService = new FacilityService();
