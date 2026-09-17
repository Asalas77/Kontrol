import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './infrastructure/auth.controller';
import { SsoController } from './infrastructure/sso.controller';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { RefreshTokenUseCase } from './application/refresh-token.use-case';
import { RegisterTenantUseCase } from './application/register-tenant.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/reset-password.use-case';
import { ChangeOwnPasswordUseCase } from './application/change-own-password.use-case';
import { IssueSessionUseCase } from './application/issue-session.use-case';
import { SsoLoginUseCase } from './application/sso-login.use-case';
import { AUTH_REPOSITORY } from './domain/ports/auth-repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token-repository.port';
import { TOKEN_SERVICE } from './domain/ports/token-service.port';
import {
  GOOGLE_SSO_PROVIDER,
  MICROSOFT_SSO_PROVIDER,
} from './domain/ports/sso-provider.port';
import { PostgresAuthRepository } from './infrastructure/postgres-auth.repository';
import { PostgresRefreshTokenRepository } from './infrastructure/postgres-refresh-token.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { SsoStateService } from './infrastructure/sso-state.service';
import { OidcSsoProvider } from './infrastructure/sso/oidc-sso.provider';
import { TenantContextMiddleware } from './infrastructure/tenant-context.middleware';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [
    LoginUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    RegisterTenantUseCase,
    GetCurrentUserUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ChangeOwnPasswordUseCase,
    IssueSessionUseCase,
    SsoLoginUseCase,
    SsoStateService,
    { provide: AUTH_REPOSITORY, useClass: PostgresAuthRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PostgresRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    {
      provide: GOOGLE_SSO_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OidcSsoProvider(
          config,
          'Google',
          'https://accounts.google.com',
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
        ),
    },
    {
      provide: MICROSOFT_SSO_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OidcSsoProvider(
          config,
          'Microsoft',
          'https://login.microsoftonline.com/common/v2.0',
          'MICROSOFT_CLIENT_ID',
          'MICROSOFT_CLIENT_SECRET',
        ),
    },
  ],
  // PASSWORD_HASHER y REFRESH_TOKEN_REPOSITORY se reusan en usuarios (alta con
  // contraseña generada por el servidor, reseteo de contraseña de otro usuario) para no
  // duplicar la elección de algoritmo de hash ni la gestión de sesiones.
  exports: [TOKEN_SERVICE, PASSWORD_HASHER, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
