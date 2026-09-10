import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient, DataQualityIssueType, IssueSeverity, ResourceStatus } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const DAY_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export async function importHfrJson(filePath?: string) {
  const resolvedPath = filePath || path.resolve(__dirname, '../data/source/mumbai-suburban.json');
  console.log(`Starting HFR JSON Import from ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const fileBuffer = fs.readFileSync(resolvedPath);
  const fileContent = fileBuffer.toString('utf8');
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const parsedJson = JSON.parse(fileContent);
  const rawFacilities: any[] = parsedJson.content || [];
  console.log(`Parsed ${rawFacilities.length} facilities. Checksum: ${checksum.slice(0, 12)}...`);

  // Record Import Run
  const importRun = await prisma.importRun.create({
    data: {
      sourceName: path.basename(resolvedPath),
      checksum,
      recordCount: rawFacilities.length,
      status: 'RUNNING',
    },
  });

  let importedCount = 0;

  for (const raw of rawFacilities) {
    const extId = String(raw.facUniqueId);
    const facName = raw.facName || 'Unknown Facility';

    // 1. Geolocation parsing
    let latitude: number | null = null;
    let longitude: number | null = null;
    let geoValid = false;

    if (raw.geolocation && typeof raw.geolocation === 'string') {
      const parts = raw.geolocation.split(',').map((p: string) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        latitude = parts[0];
        longitude = parts[1];
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          geoValid = true;
        }
      }
    }

    // 2. Map Operational Status
    let opStatus = 'UNKNOWN';
    if (raw.facOperStatus === 'F' || raw.facOperStatus === 'FUNCTIONAL') {
      opStatus = 'FUNCTIONAL';
    } else if (raw.facOperStatus === 'NF' || raw.facOperStatus === 'NON_FUNCTIONAL') {
      opStatus = 'NON_FUNCTIONAL';
    } else if (raw.facOperStatus) {
      opStatus = String(raw.facOperStatus);
    }

    // 3. Dates
    const lastUpd = raw.lstUpdDt ? new Date(raw.lstUpdDt) : null;

    // 4. Address
    const address = [raw.address1, raw.address2, raw.vilCityTown].filter(Boolean).join(', ') || null;

    // Upsert Facility
    const facility = await prisma.facility.upsert({
      where: { externalFacilityId: extId },
      update: {
        name: facName,
        facilityType: raw.facilityType || 'Primary Health Centre',
        ownership: raw.facOwnership === 'G' || raw.facOwnerGovt ? 'GOVERNMENT' : 'PRIVATE',
        ownerSubType: raw.ownerSubType ? String(raw.ownerSubType) : null,
        systemOfMedicine: raw.systemOfMedicine ? String(raw.systemOfMedicine) : null,
        serviceType: raw.typeOfService ? String(raw.typeOfService) : 'OPD',
        serviceTypeOther: raw.typeOfServiceOth ? String(raw.typeOfServiceOth) : null,
        pincode: raw.pincode ? String(raw.pincode) : null,
        address,
        latitude: geoValid ? latitude : null,
        longitude: geoValid ? longitude : null,
        operationalStatus: opStatus,
        sourceStatus: raw.status ? String(raw.status) : null,
        emrEnabled: raw.emrSystem === 'Y',
        emrSoftware: raw.emrSoftware ? String(raw.emrSoftware) : null,
        abdmEnabled: raw.abdmSoftware === '1' || Boolean(raw.abdmSoftware),
        alternateId: raw.alternateId ? String(raw.alternateId) : null,
        source: 'HFR',
        sourceLastUpdated: lastUpd,
      },
      create: {
        externalFacilityId: extId,
        name: facName,
        facilityType: raw.facilityType || 'Primary Health Centre',
        ownership: raw.facOwnership === 'G' || raw.facOwnerGovt ? 'GOVERNMENT' : 'PRIVATE',
        ownerSubType: raw.ownerSubType ? String(raw.ownerSubType) : null,
        systemOfMedicine: raw.systemOfMedicine ? String(raw.systemOfMedicine) : null,
        serviceType: raw.typeOfService ? String(raw.typeOfService) : 'OPD',
        serviceTypeOther: raw.typeOfServiceOth ? String(raw.typeOfServiceOth) : null,
        pincode: raw.pincode ? String(raw.pincode) : null,
        address,
        latitude: geoValid ? latitude : null,
        longitude: geoValid ? longitude : null,
        operationalStatus: opStatus,
        sourceStatus: raw.status ? String(raw.status) : null,
        emrEnabled: raw.emrSystem === 'Y',
        emrSoftware: raw.emrSoftware ? String(raw.emrSoftware) : null,
        abdmEnabled: raw.abdmSoftware === '1' || Boolean(raw.abdmSoftware),
        alternateId: raw.alternateId ? String(raw.alternateId) : null,
        source: 'HFR',
        sourceLastUpdated: lastUpd,
      },
    });

    // PostGIS location column update
    if (geoValid && latitude !== null && longitude !== null) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Facility" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE "id" = $3::uuid`,
        longitude,
        latitude,
        facility.id
      );
    }

    // 5. Store Facility Snapshot
    await prisma.facilitySnapshot.create({
      data: {
        facilityId: facility.id,
        importRunId: importRun.id,
        snapshot: raw,
        source: 'HFR',
      },
    });

    // 6. Parse and Upsert Specialties
    const specialties = Array.isArray(raw.specialityDtls) ? raw.specialityDtls : [];
    // Delete existing specialties to remain idempotent
    await prisma.facilitySpecialty.deleteMany({ where: { facilityId: facility.id } });
    for (const spec of specialties) {
      const specName = spec.specName || spec.spcltyName || spec.specialityName;
      if (specName) {
        await prisma.facilitySpecialty.create({
          data: {
            facilityId: facility.id,
            externalSpecialtyId: spec.specId ? String(spec.specId) : null,
            name: specName,
            active: spec.activeYn !== 'N',
          },
        });
      }
    }

    // 7. Parse and Upsert Operating Hours & Detect invalid times
    const hours = Array.isArray(raw.operationRequestDTO) ? raw.operationRequestDTO : [];
    const openIssuesToCreate: Array<{
      issueType: DataQualityIssueType;
      severity: IssueSeverity;
      fieldName: string;
      sourceValue: string | null;
      description: string;
    }> = [];

    // Clear old hours to keep idempotent
    await prisma.facilityHour.deleteMany({ where: { facilityId: facility.id } });

    for (const h of hours) {
      const dayCode = (h.id?.day || h.day || '').toUpperCase();
      const weekday = DAY_MAP[dayCode] ?? -1;
      if (weekday === -1) continue;

      const is24 = h.hrs24 === 'Y';
      const rawOpen = (h.morOpenTime || h.openTime || '').trim();
      const rawClose = (h.morCloseTime || h.closeTime || '').trim();

      let validOpen: string | null = null;
      let validClose: string | null = null;

      if (rawOpen) {
        if (TIME_REGEX.test(rawOpen)) {
          validOpen = rawOpen;
        } else {
          openIssuesToCreate.push({
            issueType: 'INVALID_TIME',
            severity: 'HIGH',
            fieldName: `${dayCode}.openTime`,
            sourceValue: rawOpen,
            description: `Invalid time format for ${dayCode} open time: "${rawOpen}" in facility ${facName}`,
          });
        }
      }

      if (rawClose) {
        if (TIME_REGEX.test(rawClose)) {
          validClose = rawClose;
        } else {
          openIssuesToCreate.push({
            issueType: 'INVALID_TIME',
            severity: 'HIGH',
            fieldName: `${dayCode}.closeTime`,
            sourceValue: rawClose,
            description: `Invalid time format for ${dayCode} close time: "${rawClose}" in facility ${facName}`,
          });
        }
      }

      await prisma.facilityHour.upsert({
        where: {
          facilityId_weekday: {
            facilityId: facility.id,
            weekday,
          },
        },
        update: {
          is24Hours: is24,
          openTime: validOpen,
          closeTime: validClose,
          active: h.activeYN !== 'N',
          sourceValue: h,
        },
        create: {
          facilityId: facility.id,
          weekday,
          is24Hours: is24,
          openTime: validOpen,
          closeTime: validClose,
          active: h.activeYN !== 'N',
          sourceValue: h,
        },
      });
    }

    // 8. Parse Resources
    const infraList = Array.isArray(raw.medicalInfraRequestDTO) ? raw.medicalInfraRequestDTO : [];
    const infra = infraList[0] || {};

    const parseNum = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = parseInt(val, 10);
      return isNaN(n) ? null : n;
    };

    const mapStatus = (val: any): ResourceStatus => {
      if (val === 'Y' || val === true) return 'AVAILABLE';
      if (val === 'N' || val === false) return 'UNAVAILABLE';
      return 'UNKNOWN';
    };

    await prisma.facilityResource.upsert({
      where: { facilityId: facility.id },
      update: {
        totalBeds: parseNum(infra.totalBeds),
        ipdBeds: parseNum(infra.ipdBeds) ?? parseNum(infra.ipdBedsWithO2),
        icuBeds: parseNum(infra.icuBeds) ?? parseNum(infra.icuBedsWithVent),
        ventilators: parseNum(infra.ventillators),
        diagnosticsStatus: mapStatus(infra.diagPresent),
        imagingStatus: mapStatus(infra.imagingPresent),
        pharmacyStatus: mapStatus(infra.pharmacyPresent),
        bloodStatus: mapStatus(infra.bloodPresent),
        dialysisStatus: mapStatus(infra.dialysisPresent),
        lastUpdated: infra.lastUpdatedDate ? new Date(infra.lastUpdatedDate) : null,
      },
      create: {
        facilityId: facility.id,
        totalBeds: parseNum(infra.totalBeds),
        ipdBeds: parseNum(infra.ipdBeds) ?? parseNum(infra.ipdBedsWithO2),
        icuBeds: parseNum(infra.icuBeds) ?? parseNum(infra.icuBedsWithVent),
        ventilators: parseNum(infra.ventillators),
        diagnosticsStatus: mapStatus(infra.diagPresent),
        imagingStatus: mapStatus(infra.imagingPresent),
        pharmacyStatus: mapStatus(infra.pharmacyPresent),
        bloodStatus: mapStatus(infra.bloodPresent),
        dialysisStatus: mapStatus(infra.dialysisPresent),
        lastUpdated: infra.lastUpdatedDate ? new Date(infra.lastUpdatedDate) : null,
      },
    });

    // 9. Additional Quality Checks
    if (!geoValid) {
      openIssuesToCreate.push({
        issueType: 'MISSING_GEOLOCATION',
        severity: 'CRITICAL',
        fieldName: 'geolocation',
        sourceValue: raw.geolocation || null,
        description: `Missing or invalid geolocation coordinates for facility ${facName}`,
      });
    }

    if (hours.length === 0) {
      openIssuesToCreate.push({
        issueType: 'MISSING_HOURS',
        severity: 'HIGH',
        fieldName: 'operationRequestDTO',
        sourceValue: null,
        description: `Operational hours not specified for facility ${facName}`,
      });
    }

    if (specialties.length === 0) {
      openIssuesToCreate.push({
        issueType: 'MISSING_SPECIALTY',
        severity: 'MEDIUM',
        fieldName: 'specialityDtls',
        sourceValue: null,
        description: `No specialties registered for facility ${facName}`,
      });
    }

    if (lastUpd) {
      const diffDays = (Date.now() - lastUpd.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 180) {
        openIssuesToCreate.push({
          issueType: 'STALE_DATA',
          severity: 'LOW',
          fieldName: 'lstUpdDt',
          sourceValue: raw.lstUpdDt,
          description: `Facility data has not been updated in ${Math.round(diffDays)} days (> 180 days threshold)`,
        });
      }
    }

    if (!infra.diagPresent && !infra.pharmacyPresent && !infra.totalBeds) {
      openIssuesToCreate.push({
        issueType: 'UNKNOWN_RESOURCE',
        severity: 'LOW',
        fieldName: 'medicalInfraRequestDTO',
        sourceValue: null,
        description: `Key facility infrastructure fields are unknown or unrecorded in source registry`,
      });
    }

    // Idempotent Data Quality Issue writing: clear un-resolved issues for this facility and insert fresh
    await prisma.dataQualityIssue.deleteMany({
      where: { facilityId: facility.id, status: 'OPEN' },
    });

    for (const issue of openIssuesToCreate) {
      await prisma.dataQualityIssue.create({
        data: {
          facilityId: facility.id,
          issueType: issue.issueType,
          severity: issue.severity,
          fieldName: issue.fieldName,
          sourceValue: issue.sourceValue,
          description: issue.description,
          status: 'OPEN',
        },
      });
    }

    // 10. Recalculate Quality Score (100 base, -20 CRITICAL, -10 HIGH, -5 MEDIUM, -2 LOW)
    let score = 100;
    for (const issue of openIssuesToCreate) {
      if (issue.severity === 'CRITICAL') score -= 20;
      else if (issue.severity === 'HIGH') score -= 10;
      else if (issue.severity === 'MEDIUM') score -= 5;
      else if (issue.severity === 'LOW') score -= 2;
    }
    score = Math.max(0, Math.min(100, score));

    await prisma.facility.update({
      where: { id: facility.id },
      data: { dataQualityScore: score },
    });

    importedCount++;
  }

  // Complete Import Run
  await prisma.importRun.update({
    where: { id: importRun.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  const totalIssues = await prisma.dataQualityIssue.count({ where: { status: 'OPEN' } });
  console.log(`HFR Import completed: ${importedCount} facilities processed. ${totalIssues} data quality issues identified.`);
  return { importedCount, totalIssues };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  importHfrJson()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
