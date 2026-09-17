import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import { IssueSessionResult, IssueSessionUseCase } from './issue-session.use-case';

export interface SsoLoginCommand {
  email: string;
  emailVerified: boolean;
}

export type SsoLoginResult = IssueSessionResult;

/**
 * SSO es un método de login alternativo para una cuenta que ya existe en Kontrol, no
 * una forma de crear cuentas nuevas: no hay manera de adivinar a qué empresa pertenece
 * un email que Kontrol nunca vio, así que si no hay match se rechaza sin ambigüedad.
 */
@Injectable()
export class SsoLoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    private readonly issueSession: IssueSessionUseCase,
  ) {}

  async execute(command: SsoLoginCommand): Promise<SsoLoginResult> {
    if (!command.emailVerified) {
      throw new UnauthorizedException('El proveedor no confirmó el correo electrónico');
    }

    const credentials = await this.authRepo.findCredentialsByEmail(command.email);
    if (!credentials || !credentials.activo) {
      throw new UnauthorizedException('No existe una cuenta Kontrol con ese correo');
    }

    return this.issueSession.execute(credentials.userId, credentials.tenantId);
  }
}
