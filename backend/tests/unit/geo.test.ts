import { describe, it, expect } from 'vitest';
import { calculateHaversineDistanceKm } from '../../src/utils/geo.js';

describe('Geospatial Haversine Utility', () => {
  it('calculates distance between Mumbai locations accurately', () => {
    // Dhanukarwadi (19.2070803, 72.8376889) to Deonar (19.0538678, 72.9231045)
    const distance = calculateHaversineDistanceKm(19.2070803, 72.8376889, 19.0538678, 72.9231045);
    expect(distance).toBeGreaterThan(18);
    expect(distance).toBeLessThan(22);
  });

  it('returns 0 for identical points', () => {
    const distance = calculateHaversineDistanceKm(19.207, 72.838, 19.207, 72.838);
    expect(distance).toBe(0);
  });
});
