import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFilePath = path.resolve(__dirname, '../data/source/mumbai-suburban.json');
const targetFilePath = path.resolve(__dirname, '../../frontend/lib/data/mumbai-suburban.public.json');

export function sanitizeFacilityData(rawFacilities: any[]) {
  return rawFacilities.map((f) => {
    // Parse coordinates
    let lat: number | null = null;
    let lng: number | null = null;
    if (f.geolocation && typeof f.geolocation === 'string') {
      const parts = f.geolocation.split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parts[0];
        lng = parts[1];
      }
    }

    // Parse specialties
    const specialties = Array.isArray(f.specialityDtls)
      ? f.specialityDtls.map((s: any) => s.specName || s.spcltyName || s.specialityName).filter(Boolean)
      : [];

    // Parse hours
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const hours = Array.isArray(f.operationRequestDTO)
      ? f.operationRequestDTO.map((h: any) => {
          const rawClose = h.morCloseTime || h.closeTime || '';
          const rawOpen = h.morOpenTime || h.openTime || '';
          const openTime = timeRegex.test(rawOpen) ? rawOpen : null;
          const closeTime = timeRegex.test(rawClose) ? rawClose : null;
          return {
            day: h.id?.day || h.day,
            is24Hours: h.hrs24 === 'Y',
            openTime,
            closeTime,
            active: h.activeYN === 'Y',
          };
        })
      : [];

    // Ownership mapping
    const ownership = f.facOwnership === 'G' || f.facOwnerGovt ? 'GOVERNMENT' : 'PRIVATE';

    return {
      id: f.facUniqueId,
      externalFacilityId: f.facUniqueId,
      name: f.facName,
      facilityType: f.facilityType || 'Primary Health Centre',
      serviceType: f.typeOfService || 'OPD',
      ownership,
      pincode: f.pincode || null,
      address: [f.address1, f.address2, f.vilCityTown].filter(Boolean).join(', '),
      latitude: lat,
      longitude: lng,
      location: lat && lng ? { latitude: lat, longitude: lng } : null,
      operationalStatus: f.facOperStatus === 'F' ? 'FUNCTIONAL' : f.facOperStatus || 'FUNCTIONAL',
      emrEnabled: f.emrSystem === 'Y',
      abdmEnabled: f.abdmSoftware === '1' || Boolean(f.abdmSoftware),
      specialties,
      hours,
      source: 'HFR',
      sourceLastUpdated: f.lstUpdDt || null,
      dataQualityScore: 100, // recalculated dynamically by system
      isPublicCatalogue: true,
    };
  });
}

function run() {
  console.log(`Reading source file from ${sourceFilePath}`);
  if (!fs.existsSync(sourceFilePath)) {
    console.error(`Source file not found at ${sourceFilePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
  const content = raw.content || [];
  console.log(`Sanitizing ${content.length} facilities...`);

  const sanitized = sanitizeFacilityData(content);

  const targetDir = path.dirname(targetFilePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetFilePath, JSON.stringify(sanitized, null, 2), 'utf8');
  console.log(`Successfully generated public facility dataset at ${targetFilePath}`);
}

run();
