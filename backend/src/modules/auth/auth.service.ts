import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AuthError } from '../../utils/errors.js';
import { generateAccessToken, generateRefreshToken } from '../../middleware/auth.js';
import { SendOtpInput, VerifyOtpInput } from './auth.schema.js';
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

    if (!user) {
      // Auto-register demo user or new citizen
      const role = (input.role as UserRole) || UserRole.CITIZEN;
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
      patientCode: user.patient?.patientCode || null,
      practitionerId: user.practitioner?.id || null,
    };
  }
}

export const authService = new AuthService();
