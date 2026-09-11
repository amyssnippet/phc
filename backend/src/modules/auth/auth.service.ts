import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AuthError } from '../../utils/errors.js';
import { generateAccessToken, generateRefreshToken } from '../../middleware/auth.js';
import { SendOtpInput, VerifyOtpInput, DemoLoginInput } from './auth.schema.js';
import { UserRole } from '@prisma/client';

export class AuthService {
  async sendOtp(input: SendOtpInput) {
    // In prototype mock mode, always accept and acknowledge OTP
    return {
      message: 'OTP sent successfully',
      phone: input.phone,
      otpMode: env.OTP_MODE,
      mockOtp: env.OTP_MODE === 'MOCK' ? env.MOCK_OTP : undefined,
    };
  }

  async verifyOtp(input: VerifyOtpInput) {
    if (env.OTP_MODE === 'MOCK' && input.otp !== env.MOCK_OTP) {
      throw new AuthError('Invalid OTP code', 'INVALID_OTP');
    }

    let user = await prisma.user.findUnique({
      where: { phone: input.phone },
      include: { patient: true, practitioner: true },
    });

    // Map legacy role strings if needed
    let requestedRole: UserRole = UserRole.CITIZEN;
    if (input.role) {
      if ((input.role as string) === 'FRONTLINE_WORKER') {
        requestedRole = UserRole.CHW;
      } else if ((input.role as string) === 'ADMIN') {
        requestedRole = UserRole.FACILITY_ADMIN;
      } else {
        requestedRole = input.role as UserRole;
      }
    }

    if (!user) {
      // Auto-register demo user or new citizen
      const role = requestedRole;
      const name = input.name || `User ${input.phone.slice(-4)}`;

      user = await prisma.user.create({
        data: {
          phone: input.phone,
          name,
          role,
          preferredLanguage: 'mr',
          demoUser: env.DEMO_MODE,
        },
        include: { patient: true, practitioner: true },
      });

      // If user is a citizen, ensure a Patient record exists for them
      if (role === UserRole.CITIZEN) {
        const pCode = `MH-P-${Date.now().toString().slice(-6)}`;
        const patient = await prisma.patient.create({
          data: {
            userId: user.id,
            patientCode: pCode,
            firstName: name.split(' ')[0] || name,
            lastName: name.split(' ').slice(1).join(' ') || null,
            phone: input.phone,
            demoData: env.DEMO_MODE,
          },
        });
        user = { ...user, patient };
      }
    } else if (!user.patient && user.role === UserRole.CITIZEN) {
      const pCode = `MH-P-${Date.now().toString().slice(-6)}`;
      const patient = await prisma.patient.create({
        data: {
          userId: user.id,
          patientCode: pCode,
          firstName: user.name.split(' ')[0] || user.name,
          lastName: user.name.split(' ').slice(1).join(' ') || null,
          phone: user.phone,
          demoData: env.DEMO_MODE,
        },
      });
      user = { ...user, patient };
    }

    const authUser = {
      id: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    };

    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken(authUser);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        patientId: user.patient?.id || null,
        patientCode: user.patient?.patientCode || null,
        practitionerId: user.practitioner?.id || null,
      },
      accessToken,
      refreshToken,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true, practitioner: true },
    });

    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      patientId: user.patient?.id || null,
      practitionerId: user.practitioner?.id || null,
    };
  }

  async demoLogin(input: DemoLoginInput) {
    const personaMap: Record<string, string> = {
      citizen: '9800000001',
      sunita: '9800000001',
      chw: '9800000002',
      priya: '9800000002',
      worker: '9800000002',
      doctor: '9800000003',
      doctor_dhanukarwadi: '9800000003',
      neha: '9800000003',
      facility_admin: '9800000004',
      admin_dhanukarwadi: '9800000004',
      district_officer: '9800000005',
      dho: '9800000005',
      doctor_ddu2: '9800000006',
      rajesh: '9800000006',
      citizen_b: '9800000007',
      aarav: '9800000007',
      citizen_c: '9800000008',
      meena: '9800000008',
      super_admin: '9800000009',
    };

    let phone = input.phone;
    if (!phone && input.personaKey) {
      phone = personaMap[input.personaKey.toLowerCase()];
    }
    if (!phone) {
      phone = '9800000001';
    }

    return this.verifyOtp({
      phone,
      otp: env.MOCK_OTP,
    });
  }
}

export const authService = new AuthService();
