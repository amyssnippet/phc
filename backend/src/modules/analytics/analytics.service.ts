import { prisma } from '../../config/database.js';
import { ReferralStatus, FollowUpStatus, QueueStatus, AppointmentStatus } from '@prisma/client';

export class AnalyticsService {
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalFacilities,
      operationalFacilities,
      appointmentsToday,
      patientsSeenToday,
      queueWaiting,
      referralsCreated,
      referralsAccepted,
      referralsCompleted,
      followupsDue,
      followupsCompleted,
      openDataQualityIssues,
      facilitiesWithQueue,
    ] = await Promise.all([
      prisma.facility.count(),
      prisma.facility.count({ where: { operationalStatus: 'FUNCTIONAL' } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow } } }),
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow }, status: AppointmentStatus.COMPLETED } }),
      prisma.queueToken.count({ where: { status: QueueStatus.WAITING } }),
      prisma.referral.count(),
      prisma.referral.count({ where: { status: { in: [ReferralStatus.ACCEPTED, ReferralStatus.APPOINTMENT_BOOKED, ReferralStatus.PATIENT_ARRIVED, ReferralStatus.CONSULTED, ReferralStatus.FOLLOWUP_CREATED, ReferralStatus.COMPLETED] } } }),
      prisma.referral.count({ where: { status: ReferralStatus.COMPLETED } }),
      prisma.followUp.count({ where: { status: FollowUpStatus.DUE } }),
      prisma.followUp.count({ where: { status: FollowUpStatus.COMPLETED } }),
      prisma.dataQualityIssue.count({ where: { status: 'OPEN' } }),
      prisma.queueToken.findMany({
        where: { status: QueueStatus.WAITING },
        select: { estimatedWaitMinutes: true },
      }),
    ]);

    const referralCompletionRate = referralsCreated > 0
      ? Math.round((referralsCompleted / referralsCreated) * 100)
      : null;

    const followUpTotalEligible = followupsDue + followupsCompleted;
    const followUpCompletionRate = followUpTotalEligible > 0
      ? Math.round((followupsCompleted / followUpTotalEligible) * 100)
      : null;

    const totalWait = facilitiesWithQueue.reduce((acc, q) => acc + (q.estimatedWaitMinutes || 8), 0);
    const avgWait = facilitiesWithQueue.length > 0 ? Math.round(totalWait / facilitiesWithQueue.length) : 0;

    return {
      totalFacilities,
      operationalFacilities,
      appointmentsToday,
      patientsSeenToday,
      queueWaiting,
      referralsCreated,
      referralsAccepted,
      referralsCompleted,
      referralCompletionRate,
      followupsDue,
      followupsCompleted,
      followUpCompletionRate,
      openDataQualityIssues,
      averageEstimatedWaitMinutes: avgWait,
      isDemoData: true,
    };
  }

  async getFacilityMetrics() {
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
        facilityType: true,
        operationalStatus: true,
        dataQualityScore: true,
        _count: {
          select: {
            referralsFrom: true,
            referralsTo: true,
            appointments: true,
            queueTokens: true,
          },
        },
      },
    });

    return facilities.map((f) => ({
      id: f.id,
      name: f.name,
      facilityType: f.facilityType,
      status: f.operationalStatus,
      dataQualityScore: f.dataQualityScore,
      outboundReferrals: f._count.referralsFrom,
      inboundReferrals: f._count.referralsTo,
      appointments: f._count.appointments,
      queueTokens: f._count.queueTokens,
    }));
  }

  async getReferralFunnel() {
    const counts = await prisma.referral.groupBy({
      by: ['status'],
      _count: true,
    });

    const funnelStages = [
      { stage: 'Created', key: 'CREATED', count: 0 },
      { stage: 'Sent', key: 'SENT', count: 0 },
      { stage: 'Accepted', key: 'ACCEPTED', count: 0 },
      { stage: 'Booked', key: 'APPOINTMENT_BOOKED', count: 0 },
      { stage: 'Arrived', key: 'PATIENT_ARRIVED', count: 0 },
      { stage: 'Consulted', key: 'CONSULTED', count: 0 },
      { stage: 'Follow-up Created', key: 'FOLLOWUP_CREATED', count: 0 },
      { stage: 'Completed', key: 'COMPLETED', count: 0 },
    ];

    counts.forEach((c) => {
      const stage = funnelStages.find((s) => s.key === c.status);
      if (stage) stage.count = c._count;
    });

    return funnelStages;
  }

  async getFollowupMetrics() {
    const [byType, byStatus] = await Promise.all([
      prisma.followUp.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.followUp.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return {
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  async getDataQualityBreakdown() {
    return prisma.dataQualityIssue.groupBy({
      by: ['issueType'],
      _count: true,
    });
  }
}

export const analyticsService = new AnalyticsService();
