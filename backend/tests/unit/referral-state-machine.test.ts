import { describe, it, expect } from 'vitest';
import { referralService } from '../../src/modules/referrals/referrals.service.js';
import { ReferralStatus } from '@prisma/client';

describe('Referral State Machine Validation', () => {
  it('rejects invalid state jump from COMPLETED back to CREATED', () => {
    expect(() => {
      (referralService as any).validateTransition(ReferralStatus.COMPLETED, ReferralStatus.CREATED);
    }).toThrowError(/Cannot transition referral/);
  });

  it('allows valid forward transition from SENT to ACCEPTED', () => {
    expect(() => {
      (referralService as any).validateTransition(ReferralStatus.SENT, ReferralStatus.ACCEPTED);
    }).not.toThrow();
  });

  it('allows valid transition from ACCEPTED to APPOINTMENT_BOOKED', () => {
    expect(() => {
      (referralService as any).validateTransition(ReferralStatus.ACCEPTED, ReferralStatus.APPOINTMENT_BOOKED);
    }).not.toThrow();
  });
});
