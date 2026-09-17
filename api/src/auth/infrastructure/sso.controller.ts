import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { generators } from 'openid-client';
import {
  GOOGLE_SSO_PROVIDER,
  MICROSOFT_SSO_PROVIDER,
  SsoProviderPort,
} from '../domain/ports/sso-provider.port';
import { SsoLoginUseCase } from '../application/sso-login.use-case';
import { SsoStateService } from './sso-state.service';
import { Public } from './decorators/public.decorator';
import { setRefreshCookie } from './refresh-cookie';

const SSO_STATE_COOKIE = 'sso_state';
const SUPPORTED_PROVIDERS = ['google', 'microsoft'] as const;
type SsoProviderName = (typeof SUPPORTED_PROVIDERS)[number];

function isSupportedProvider(value: string): value is SsoProviderName {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

@Controller('auth/sso')
export class SsoController {
  constructor(
    @Inject(GOOGLE_SSO_PROVIDER) private readonly google: SsoProviderPort,
    @Inject(MICROSOFT_SSO_PROVIDER) private readonly microsoft: SsoProviderPort,
    private readonly ssoLogin: SsoLoginUseCase,
    private readonly ssoState: SsoStateService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get(':provider/iniciar')
  async iniciar(
    @Param('provider') provider: string,
    @Res() res: Response,
  ): Promise<void> {
    const providerPort = this.resolveProvider(provider);

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();

    const stateToken = await this.ssoState.sign({ provider, state, nonce, codeVerifier });
    res.cookie(SSO_STATE_COOKIE, stateToken, this.stateCookieOptions());

    const authorizationUrl = await providerPort.getAuthorizationUrl({
      state,
      nonce,
      codeVerifier,
      redirectUri: this.callbackUrl(provider),
    });

    res.redirect(authorizationUrl);
  }

  @Public()
  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const providerPort = this.resolveProvider(provider);
      const stateToken = (req.cookies as Record<string, string | undefined>)[SSO_STATE_COOKIE];
      if (!stateToken || !code || !state) {
        throw new BadRequestException('Falta el código o el estado de la autenticación');
      }

      const saved = await this.ssoState.verify(stateToken);
      if (saved.provider !== provider || saved.state !== state) {
        throw new UnauthorizedException('El estado de la autenticación no coincide');
      }
      res.clearCookie(SSO_STATE_COOKIE, this.stateCookieOptions());

      const identity = await providerPort.exchangeCode({
        code,
        codeVerifier: saved.codeVerifier,
        expectedNonce: saved.nonce,
        redirectUri: this.callbackUrl(provider),
      });

      const session = await this.ssoLogin.execute({
        email: identity.email,
        emailVerified: identity.emailVerified,
      });

      setRefreshCookie(res, this.config, session.refreshToken);
      res.redirect(
        `${this.frontendUrl()}/sso/callback#access_token=${encodeURIComponent(session.accessToken)}&expires_in=${session.expiresIn}`,
      );
    } catch {
      res.redirect(`${this.frontendUrl()}/sso/callback#error=cuenta_no_encontrada`);
    }
  }

  private resolveProvider(provider: string): SsoProviderPort {
    if (!isSupportedProvider(provider)) {
      throw new BadRequestException('Proveedor de inicio de sesión no soportado');
    }
    return provider === 'google' ? this.google : this.microsoft;
  }

  private callbackUrl(provider: string): string {
    return `${this.apiUrl()}/api/auth/sso/${provider}/callback`;
  }

  private apiUrl(): string {
    return this.config.get('API_URL', 'http://localhost:3000');
  }

  private frontendUrl(): string {
    return this.config.get('FRONTEND_URL', 'http://localhost:5173');
  }

  private stateCookieOptions() {
    const crossSite = this.config.get('COOKIE_CROSS_SITE') === 'true';
    return {
      httpOnly: true,
      secure: crossSite || this.config.get('NODE_ENV') === 'production',
      sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
      path: '/api/auth/sso',
      maxAge: 10 * 60 * 1000,
    };
  }
}
