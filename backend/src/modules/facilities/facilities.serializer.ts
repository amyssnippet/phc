export function publicFacilitySerializer(f: any) {
  return {
    id: f.id,
    externalFacilityId: f.externalFacilityId,
    name: f.name,
    facilityType: f.facilityType,
    serviceType: f.serviceType,
    ownership: f.ownership,
    pincode: f.pincode,
    address: f.address,
    latitude: f.latitude,
    longitude: f.longitude,
    location: f.latitude && f.longitude ? { latitude: f.latitude, longitude: f.longitude } : null,
    operationalStatus: f.operationalStatus,
    emrEnabled: f.emrEnabled ?? false,
    abdmEnabled: f.abdmEnabled ?? false,
    specialties: f.specialties
      ? f.specialties.map((s: any) => (typeof s === 'string' ? s : s.name))
      : [],
    hours: f.hours || [],
    resources: f.resources || null,
    sourceLastUpdated: f.sourceLastUpdated,
    dataQualityScore: f.dataQualityScore ?? 100,
    distanceKm: f.distanceKm !== undefined ? Number(f.distanceKm) : undefined,
    isOpenNow: f.isOpenNow ?? undefined,
  };
}
