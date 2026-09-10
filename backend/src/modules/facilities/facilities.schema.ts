import { z } from 'zod';

export const nearbyFacilitySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(10), // km
  specialty: z.string().optional(),
  facilityType: z.string().optional(),
  serviceType: z.string().optional(),
  openNow: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  abdm: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  emr: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export const searchFacilitySchema = z.object({
  q: z.string().optional(),
  pincode: z.string().optional(),
  specialty: z.string().optional(),
  facilityType: z.string().optional(),
  serviceType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const mapBoundsSchema = z.object({
  minLat: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
  minLng: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
});
