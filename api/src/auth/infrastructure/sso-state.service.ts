import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface SsoStatePayload {
  provider: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

const STATE_TTL_SECONDS = 10 * 60;

/**
 * Firma el state/nonce/code_verifier del flujo OIDC dentro de una cookie httpOnly de
 * corta vida, en vez de guardarlos en memoria del proceso: Render puede reiniciar la
 * instancia entre el "iniciar" y el "callback", y este servicio no depende de eso.
 * Reusa el mismo JwtService que ya inyecta AuthModule para los access tokens — un
 * secreto de firma nuevo no aporta nada aquí.
 */
@Injectable()
export class SsoStateService {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: SsoStatePayload): Promise<string> {
    return this.jwt.signAsync(payload, { expiresIn: STATE_TTL_SECONDS });
  }

  async verify(token: string): Promise<SsoStatePayload> {
    try {
      return await this.jwt.verifyAsync<SsoStatePayload>(token);
    } catch {
      throw new UnauthorizedException('La sesión de inicio de sesión expiró, intenta de nuevo');
    }
  }
}
