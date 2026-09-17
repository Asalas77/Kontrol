import { UnauthorizedException } from '@nestjs/common';
import { SsoLoginUseCase } from './sso-login.use-case';
import { IssueSessionUseCase } from './issue-session.use-case';
import {
  AuthCredentials,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { TokenServicePort } from '../domain/ports/token-service.port';

const CREDENTIALS: AuthCredentials = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  passwordHash: 'hash-correcto',
  activo: true,
};

class FakeAuthRepo implements AuthRepositoryPort {
  credentials: AuthCredentials | null = CREDENTIALS;
  permissions: string[] = ['inspecciones.ver'];

  async findCredentialsByEmail() {
    return this.credentials;
  }
  async findPermissions() {
    return this.permissions;
  }
  async registerTenant(): Promise<never> {
    throw new Error('no usado');
  }
  async getTenantNombre(): Promise<never> {
    throw new Error('no usado');
  }
  async requestPasswordReset(): Promise<never> {
    throw new Error('no usado');
  }
  async consumePasswordReset(): Promise<never> {
    throw new Error('no usado');
  }
  async getPasswordHash(): Promise<never> {
    throw new Error('no usado');
  }
  async updatePassword(): Promise<never> {
    throw new Error('no usado');
  }
}

class FakeRefreshRepo implements RefreshTokenRepositoryPort {
  saved: Array<{ tenantId: string; userId: string; tokenHash: string }> = [];

  async save(input: { tenantId: string; userId: string; tokenHash: string; expiresAt: Date }) {
    this.saved.push(input);
  }
  async findValidByHash() {
    return null;
  }
  async revokeByHash() {}
  async revokeAllForUser() {}
}

class FakeTokens implements TokenServicePort {
  readonly accessTokenTtlSeconds = 900;
  issued: Array<{ sub: string; tenantId: string; permissions: string[] }> = [];

  async issueAccessToken(payload: { sub: string; tenantId: string; permissions: string[] }) {
    this.issued.push(payload);
    return 'access-token';
  }
  async verifyAccessToken(): Promise<never> {
    throw new Error('no usado');
  }
  issueRefreshToken() {
    return {
      token: 'refresh-plano',
      tokenHash: 'refresh-hash',
      expiresAt: new Date('2030-01-01'),
    };
  }
  hashRefreshToken(token: string) {
    return `hash:${token}`;
  }
}

describe('SsoLoginUseCase', () => {
  let authRepo: FakeAuthRepo;
  let useCase: SsoLoginUseCase;

  beforeEach(() => {
    authRepo = new FakeAuthRepo();
    const issueSession = new IssueSessionUseCase(authRepo, new FakeRefreshRepo(), new FakeTokens());
    useCase = new SsoLoginUseCase(authRepo, issueSession);
  });

  it('emite sesión para una cuenta existente con email verificado', async () => {
    const result = await useCase.execute({ email: 'ana@empresa.test', emailVerified: true });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-plano');
  });

  it('rechaza si el proveedor no confirmó el email', async () => {
    await expect(
      useCase.execute({ email: 'ana@empresa.test', emailVerified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza si no existe una cuenta con ese correo', async () => {
    authRepo.credentials = null;

    await expect(
      useCase.execute({ email: 'nadie@empresa.test', emailVerified: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza a un usuario desactivado aunque el email esté verificado', async () => {
    authRepo.credentials = { ...CREDENTIALS, activo: false };

    await expect(
      useCase.execute({ email: 'ana@empresa.test', emailVerified: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
