import type { PublicUserDTO, UpdateMyProfileRequest } from '@health/contracts';
import { AuthDomainError } from './auth-error.js';
import type { AuthUnitOfWork } from './ports.js';

export class UserAccountService {
  constructor(private readonly uow: AuthUnitOfWork) {}

  async getMe(userId: string): Promise<PublicUserDTO> {
    return this.uow.run(async (store) => {
      const user = await store.findUserById(userId);
      if (!user) throw new AuthDomainError('UNAUTHORIZED', 'User not found.');
      if (user.status === 'BLOCKED') throw new AuthDomainError('USER_BLOCKED', 'User is blocked.');
      return {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        provinceId: user.provinceId,
        ...(user.profileImageKey ? { profileImageUrl: '/api/v1/users/me/profile-image/content' } : {}),
        status: user.status,
        systemRole: user.systemRole,
        createdAt: user.createdAt,
      };
    });
  }

  async updateMe(userId: string, input: UpdateMyProfileRequest): Promise<PublicUserDTO> {
    await this.uow.run(async (store) => {
      const user = await store.findUserById(userId);
      if (!user) throw new AuthDomainError('UNAUTHORIZED', 'User not found.');
      if (user.status === 'BLOCKED') throw new AuthDomainError('USER_BLOCKED', 'User is blocked.');
      await store.updateFullName(userId, input.fullName.trim());
    });
    return this.getMe(userId);
  }
}
