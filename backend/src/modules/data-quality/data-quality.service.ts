import { prisma } from '../../config/database.js';
import { DataQualityStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/errors.js';

export class DataQualityService {
  async getSummary() {
    const [totalIssues, openIssues, resolvedIssues, ignoredIssues, issuesByType, facilities] =
      await Promise.all([
        prisma.dataQualityIssue.count(),
        prisma.dataQualityIssue.count({ where: { status: DataQualityStatus.OPEN } }),
        prisma.dataQualityIssue.count({ where: { status: DataQualityStatus.RESOLVED } }),
        prisma.dataQualityIssue.count({ where: { status: DataQualityStatus.IGNORED } }),
        prisma.dataQualityIssue.groupBy({
          by: ['issueType'],
          where: { status: DataQualityStatus.OPEN },
          _count: true,
        }),
        prisma.facility.findMany({ select: { dataQualityScore: true } }),
      ]);

    const avgScore =
      facilities.length > 0
        ? Math.round(facilities.reduce((acc, f) => acc + f.dataQualityScore, 0) / facilities.length)
        : 100;

    const latestImport = await prisma.importRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    return {
      totalIssues,
      openIssues,
      resolvedIssues,
      ignoredIssues,
      averageQualityScore: avgScore,
      issuesByType: issuesByType.map((t) => ({ type: t.issueType, count: t._count })),
      lineage: latestImport
        ? {
            sourceName: latestImport.sourceName,
            checksum: latestImport.checksum,
            recordCount: latestImport.recordCount,
            status: latestImport.status,
            completedAt: latestImport.completedAt,
          }
        : null,
    };
  }

  async listIssues(params: { status?: DataQualityStatus; facilityId?: string; type?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.facilityId) where.facilityId = params.facilityId;
    if (params.type) where.issueType = params.type;

    return prisma.dataQualityIssue.findMany({
      where,
      include: {
        facility: {
          select: { id: true, name: true, externalFacilityId: true },
        },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getFacilityIssues(facilityId: string) {
    return prisma.dataQualityIssue.findMany({
      where: { facilityId },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async resolveIssue(id: string) {
    const issue = await prisma.dataQualityIssue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundError('Data quality issue not found');

    const updated = await prisma.dataQualityIssue.update({
      where: { id },
      data: {
        status: DataQualityStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    // Recalculate facility quality score
    if (issue.facilityId) {
      await this.recalculateFacilityScore(issue.facilityId);
    }

    return updated;
  }

  async ignoreIssue(id: string) {
    const issue = await prisma.dataQualityIssue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundError('Data quality issue not found');

    const updated = await prisma.dataQualityIssue.update({
      where: { id },
      data: {
        status: DataQualityStatus.IGNORED,
      },
    });

    if (issue.facilityId) {
      await this.recalculateFacilityScore(issue.facilityId);
    }

    return updated;
  }

  private async recalculateFacilityScore(facilityId: string) {
    const remainingOpen = await prisma.dataQualityIssue.findMany({
      where: { facilityId, status: DataQualityStatus.OPEN },
    });

    let score = 100;
    for (const issue of remainingOpen) {
      if (issue.severity === 'CRITICAL') score -= 20;
      else if (issue.severity === 'HIGH') score -= 10;
      else if (issue.severity === 'MEDIUM') score -= 5;
      else if (issue.severity === 'LOW') score -= 2;
    }
    score = Math.max(0, Math.min(100, score));

    await prisma.facility.update({
      where: { id: facilityId },
      data: { dataQualityScore: score },
    });
  }
}

export const dataQualityService = new DataQualityService();
