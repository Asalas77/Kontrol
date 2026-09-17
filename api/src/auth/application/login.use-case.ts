import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_REPOSITORY,
  AuthRepositoryPort,
} from '../domain/ports/auth-repository.port';
import {
  PASSWORD_HASHER,
  PasswordHasherPort,
} from '../domain/ports/password-hasher.port';
import { IssueSessionResult, IssueSessionUseCase } from './issue-session.use-case';

export interface LoginCommand {
  email: string;
  password: string;
}

export type LoginResult = IssueSessionResult;

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: AuthRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasherPort,
    private readonly issueSession: IssueSessionUseCase,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const credentials = await this.authRepo.findCredentialsByEmail(command.email);

    // Se verifica la contraseña incluso cuando el email no existe, para que el tiempo de
    // respuesta no revele qué correos están registrados.
    const passwordMatches = await this.hasher.verify(
      credentials?.passwordHash ?? DUMMY_HASH,
      command.password,
    );

    if (!credentials || !passwordMatches || !credentials.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueSession.execute(credentials.userId, credentials.tenantId);
  }
}

/** Hash argon2id de una cadena arbitraria; nunca coincide con una contraseña real. */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000';
