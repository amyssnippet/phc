import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { UpdateUserInput } from './users.schema.js';

export class UserService {
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        preferredLanguage: true,
        demoUser: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            patientCode: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            designation: true,
            specialty: true,
            facilityId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  async updateProfile(id: string, input: UpdateUserInput) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        preferredLanguage: true,
        demoUser: true,
        updatedAt: true,
      },
    });

    return user;
  }
}

export const userService = new UserService();
