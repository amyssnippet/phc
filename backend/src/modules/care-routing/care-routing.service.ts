import { prisma } from '../../config/database.js';
import { CareRoutingInput } from './care-routing.schema.js';

export interface RouteCandidate {
  facilityId: string;
  name: string;
  facilityType: string;
  serviceType: string | null;
  distanceKm: number;
  score: number;
  reasons: string[];
  matchedCriteria: string[];
  penalties: string[];
  isOpenNow: boolean;
  dataQualityScore: number;
}

export class CareRoutingService {
  async recommendFacilities(input: CareRoutingInput) {
    const { location, requiredService, requiredSpecialty, symptoms, urgency } = input;

    // Fetch all operational facilities with location
    const facilities: any[] = await prisma.$queryRawUnsafe(
      `
      SELECT 
        f."id",
        f."externalFacilityId",
        f."name",
        f."facilityType",
        f."serviceType",
        f."operationalStatus",
        f."dataQualityScore",
        f."latitude",
        f."longitude",
        ROUND((ST_Distance(f."location", ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000)::numeric, 2) AS "distanceKm"
      FROM "Facility" f
      WHERE f."location" IS NOT NULL
      ORDER BY "distanceKm" ASC
      LIMIT 20;
      `,
      location.latitude,
      location.longitude
    );

    const facilityIds = facilities.map((f) => f.id);
    const [specialties, demoCaps, queueTokens] = await Promise.all([
      prisma.facilitySpecialty.findMany({ where: { facilityId: { in: facilityIds } } }),
      prisma.facilityDemoCapability.findMany({ where: { facilityId: { in: facilityIds } } }),
      prisma.queueToken.findMany({
        where: {
          facilityId: { in: facilityIds },
          status: 'WAITING',
        },
      }),
    ]);

    const candidates: RouteCandidate[] = [];

    for (const f of facilities) {
      let score = 0;
      const reasons: string[] = [];
      const matchedCriteria: string[] = [];
      const penalties: string[] = [];

      const facSpecs = specialties.filter((s) => s.facilityId === f.id).map((s) => s.name);
      const facCaps = demoCaps.filter((c) => c.facilityId === f.id);
      const waitingCount = queueTokens.filter((q) => q.facilityId === f.id).length;
      const distance = Number(f.distanceKm) || 0;

      // 1. Specialty Match (30 points)
      let targetSpecialty = requiredSpecialty;
      if (!targetSpecialty) {
        if (requiredService === 'MATERNAL_CARE' || symptoms.some((s) => s.toLowerCase().includes('pregnancy') || s.toLowerCase().includes('antenatal'))) {
          targetSpecialty = 'Obstetrics & Gynaecology';
        } else if (requiredService === 'CHILD_ASSESSMENT' || symptoms.some((s) => s.toLowerCase().includes('child') || s.toLowerCase().includes('pediatric'))) {
          targetSpecialty = 'Paediatrics';
        } else {
          targetSpecialty = 'General Medicine';
        }
      }

      const hasSpec = facSpecs.some((s) => s.toLowerCase().includes(targetSpecialty!.toLowerCase())) ||
        facCaps.some((c) => c.specialty.toLowerCase().includes(targetSpecialty!.toLowerCase()));

      if (hasSpec) {
        score += 30;
        reasons.push(`Required specialty (${targetSpecialty}) is available`);
        matchedCriteria.push('SPECIALTY');
      } else {
        score += 15; // partial credit for general primary care
        reasons.push('General primary care triage available');
      }

      // 2. Service Match (20 points)
      const serviceMatch = f.serviceType?.includes('OPD') || f.serviceType?.includes('IPD');
      if (serviceMatch) {
        score += 20;
        reasons.push('Outpatient health services active');
        matchedCriteria.push('SERVICE');
      } else {
        score += 10;
      }

      // 3. Operational Status (15 points)
      if (f.operationalStatus === 'FUNCTIONAL') {
        score += 15;
        reasons.push('Facility operational status is functional');
        matchedCriteria.push('OPERATIONAL');
      } else {
        penalties.push('Operational status unconfirmed');
      }

      // 4. Distance Score (15 points monotonic)
      let distancePoints = 15;
      if (distance <= 1) {
        distancePoints = 15;
        reasons.push(`Immediate proximity (${distance} km)`);
        matchedCriteria.push('DISTANCE');
      } else if (distance <= 3) {
        distancePoints = 13.5;
        reasons.push(`Within preferred travel distance (${distance} km)`);
        matchedCriteria.push('DISTANCE');
      } else if (distance <= 5) {
        distancePoints = 11.25;
        reasons.push(`Accessible distance (${distance} km)`);
        matchedCriteria.push('DISTANCE');
      } else if (distance <= 10) {
        distancePoints = 8.25;
      } else {
        distancePoints = 4.5;
        penalties.push(`Greater travel distance (${distance} km)`);
      }
      score += distancePoints;

      // 5. Queue / Capacity (10 points)
      if (waitingCount < 5) {
        score += 10;
        reasons.push('Low queue wait time expected');
        matchedCriteria.push('QUEUE');
      } else if (waitingCount < 15) {
        score += 7;
      } else {
        score += 4;
        penalties.push('Moderate to high queue backlog');
      }

      // 6. Resource Suitability (10 points)
      if (f.dataQualityScore >= 80) {
        score += 10;
        matchedCriteria.push('DATA_VERIFIED');
      } else {
        score += 6;
      }

      const finalScore = Math.round(Math.min(100, score));

      candidates.push({
        facilityId: f.id,
        name: f.name,
        facilityType: f.facilityType,
        serviceType: f.serviceType,
        distanceKm: distance,
        score: finalScore,
        reasons,
        matchedCriteria,
        penalties,
        isOpenNow: true,
        dataQualityScore: f.dataQualityScore,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    return {
      recommendations: candidates.slice(0, 5),
      disclaimer: 'Decision support only. Not a medical diagnosis. In life-threatening emergencies, visit the nearest emergency facility immediately.',
      intentInferred: {
        requiredService,
        urgency,
        matchedSpecialty: requiredSpecialty || 'General Medicine',
      },
    };
  }
}

export const careRoutingService = new CareRoutingService();
