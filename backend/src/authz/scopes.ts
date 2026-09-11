import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthContext {
  userId: string;
  role: UserRole;
  phone: string;
  name: string;
  patientId: string | null;
  facilityIds: string[];
  catchmentCodes: string[];
  districtCodes: string[];
  isSuperAdmin: boolean;
}

export async function resolveUserAuthContext(userId: string): Promise<AuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patient: { select: { id: true } },
      facilityMemberships: {
        where: { active: true },
        select: { facilityId: true },
      },
      chwAssignments: {
        where: { active: true },
        select: { facilityId: true, catchmentCode: true },
      },
      districtAssignments: {
        where: { active: true },
        select: { districtCode: true },
      },
    },
  });

  if (!user || !user.active) {
    return null;
  }

  const facilityIds = new Set<string>();
  user.facilityMemberships.forEach((m) => facilityIds.add(m.facilityId));
  user.chwAssignments.forEach((a) => {
    if (a.facilityId) facilityIds.add(a.facilityId);
  });

  const catchmentCodes = user.chwAssignments
    .map((a) => a.catchmentCode)
    .filter((c): c is string => Boolean(c));

  const districtCodes = user.districtAssignments.map((d) => d.districtCode);

  return {
    userId: user.id,
    role: user.role,
    phone: user.phone,
    name: user.name,
    patientId: user.patient?.id || null,
    facilityIds: Array.from(facilityIds),
    catchmentCodes,
    districtCodes,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
  };
}
