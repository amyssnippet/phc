import { describe, it, expect } from 'vitest';
import { triageService } from '../../src/modules/triage/triage.service.js';
import { Urgency } from '@prisma/client';

describe('Triage Decision Support Engine', () => {
  it('identifies critical condition when oxygen saturation is below 90%', () => {
    const result = triageService.evaluateVitals(
      { temperatureC: 37.0, heartRate: 80, respiratoryRate: 18, oxygenSaturation: 88 },
      ['shortness of breath']
    );

    expect(result.urgency).toBe(Urgency.CRITICAL);
    expect(result.riskFlags).toContain('SEVERE_HYPOXIA');
    expect(result.recommendedAction).toContain('EMERGENCY_ESCALATION_RECOMMENDED');
  });

  it('identifies high urgency for high fever and tachycardia', () => {
    const result = triageService.evaluateVitals(
      { temperatureC: 39.1, heartRate: 112, respiratoryRate: 22, oxygenSaturation: 96 },
      ['fever', 'cough']
    );

    expect(result.urgency).toBe(Urgency.HIGH);
    expect(result.riskFlags).toContain('ELEVATED_TEMPERATURE');
    expect(result.riskFlags).toContain('TACHYCARDIA');
    expect(result.recommendedAction).toBe('PRIORITY_CLINICAL_ASSESSMENT');
  });

  it('identifies standard urgency for normal vitals with mild symptoms', () => {
    const result = triageService.evaluateVitals(
      { temperatureC: 36.8, heartRate: 72, respiratoryRate: 16, oxygenSaturation: 99 },
      ['mild headache']
    );

    expect(result.urgency).toBe(Urgency.LOW);
    expect(result.riskFlags).toHaveLength(0);
    expect(result.recommendedAction).toBe('STANDARD_CLINICAL_REVIEW');
  });
});
