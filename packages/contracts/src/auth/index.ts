import {
  asRecord,
  defineSchema,
  readIdentifier,
  readString,
  readSyrianMobile,
  rejectUnknownKeys,
} from '../common/runtime-schema.js';
import type { Identifier, IsoDateTime } from '../common/types.js';
import type { SystemRole, UserStatus } from '../common/enums.js';

export interface RegisterRequest {
  readonly fullName: string;
  readonly phone: string;
  readonly provinceId: Identifier;
  readonly password: string;
}

export interface LoginRequest {
  readonly phone: string;
  readonly password: string;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

export interface ChangePasswordRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface PasswordRecoveryStartRequest {
  readonly phone: string;
}

export interface PasswordRecoveryVerifyRequest {
  readonly challengeId: Identifier;
  readonly verificationCode: string;
}

export interface PasswordRecoveryCompleteRequest {
  readonly challengeId: Identifier;
  readonly recoveryToken: string;
  readonly newPassword: string;
}

export interface AuthenticatedUserDTO {
  readonly id: Identifier;
  readonly fullName: string;
  readonly phone: string;
  readonly provinceId: Identifier;
  readonly profileImageUrl?: string;
  readonly status: UserStatus;
  readonly systemRole: SystemRole;
}

export interface AuthTokensDTO {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: IsoDateTime;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: IsoDateTime;
}

export interface AuthResponseDTO {
  readonly user: AuthenticatedUserDTO;
  readonly tokens: AuthTokensDTO;
}

const passwordOptions = { min: 8, max: 128 } as const;

export const registerRequestSchema = defineSchema<RegisterRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['fullName', 'phone', 'provinceId', 'password']);
  return {
    fullName: readString(record, 'fullName', { min: 2, max: 100 }),
    phone: readSyrianMobile(record, 'phone'),
    provinceId: readIdentifier(record, 'provinceId'),
    password: readString(record, 'password', { ...passwordOptions, trim: false }),
  };
});

export const loginRequestSchema = defineSchema<LoginRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['phone', 'password']);
  return {
    phone: readSyrianMobile(record, 'phone'),
    password: readString(record, 'password', { min: 1, max: 128, trim: false }),
  };
});

export const refreshTokenRequestSchema = defineSchema<RefreshTokenRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['refreshToken']);
  return { refreshToken: readString(record, 'refreshToken', { min: 20, max: 4096, trim: false }) };
});

export const changePasswordRequestSchema = defineSchema<ChangePasswordRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['currentPassword', 'newPassword']);
  return {
    currentPassword: readString(record, 'currentPassword', { min: 1, max: 128, trim: false }),
    newPassword: readString(record, 'newPassword', { ...passwordOptions, trim: false }),
  };
});

export const passwordRecoveryStartRequestSchema = defineSchema<PasswordRecoveryStartRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['phone']);
  return { phone: readSyrianMobile(record, 'phone') };
});

export const passwordRecoveryVerifyRequestSchema = defineSchema<PasswordRecoveryVerifyRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['challengeId', 'verificationCode']);
  return {
    challengeId: readIdentifier(record, 'challengeId'),
    verificationCode: readString(record, 'verificationCode', { min: 4, max: 10 }),
  };
});

export const passwordRecoveryCompleteRequestSchema = defineSchema<PasswordRecoveryCompleteRequest>((input) => {
  const record = asRecord(input);
  rejectUnknownKeys(record, ['challengeId', 'recoveryToken', 'newPassword']);
  return {
    challengeId: readIdentifier(record, 'challengeId'),
    recoveryToken: readString(record, 'recoveryToken', { min: 20, max: 4096, trim: false }),
    newPassword: readString(record, 'newPassword', { ...passwordOptions, trim: false }),
  };
});
