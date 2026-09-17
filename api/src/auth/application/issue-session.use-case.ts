import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepositoryPort,
} from '../domain/ports/refresh-token-repository.port';
import { TOKEN_SERVICE, TokenServicePort } from '../domain/ports/token-service.port';

export interface IssueSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Parte final compartida por cualquier forma de autenticarse (password, SSO): una vez
 * que ya se sabe QUIÉN es el usuario, emitir su sesión es siempre lo mismo.
 */
@Injectable()
export class IssueSessionUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
  ) {}

  async execute(userId: string, tenantId: string): Promise<IssueSessionResult> {
    const permissions = await this.authRepo.findPermissions(tenantId, userId);

    const accessToken = await this.tokens.issueAccessToken({
      sub: userId,
      tenantId,
      permissions,
    });

    const refresh = this.tokens.issueRefreshToken();
    await this.refreshTokens.save({
      tenantId,
      userId,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: this.tokens.accessTokenTtlSeconds,
    };
  }
}
