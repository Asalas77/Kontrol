import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Issuer, generators } from 'openid-client';
import {
  SsoAuthorizationRequest,
  SsoCodeExchange,
  SsoIdentity,
  SsoProviderPort,
} from '../../domain/ports/sso-provider.port';

/**
 * Adaptador genérico de un proveedor OIDC (Google, Microsoft) vía discovery estándar.
 * Las credenciales se leen recién al usarlas (no en el constructor): si un despliegue
 * nunca configura GOOGLE_CLIENT_ID/SECRET, el arranque no debe caerse por eso — el mismo
 * criterio que ya se usó para SmtpEmailNotifier.
 */
export class OidcSsoProvider implements SsoProviderPort {
  private clientPromise: Promise<Client> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly providerLabel: string,
    private readonly issuerUrl: string,
    private readonly clientIdEnvKey: string,
    private readonly clientSecretEnvKey: string,
  ) {}

  async getAuthorizationUrl(request: SsoAuthorizationRequest): Promise<string> {
    const client = await this.getClient(request.redirectUri);
    return client.authorizationUrl({
      scope: 'openid email profile',
      redirect_uri: request.redirectUri,
      state: request.state,
      nonce: request.nonce,
      code_challenge: generators.codeChallenge(request.codeVerifier),
      code_challenge_method: 'S256',
    });
  }

  async exchangeCode(input: SsoCodeExchange): Promise<SsoIdentity> {
    const client = await this.getClient(input.redirectUri);
    const tokenSet = await client.callback(
      input.redirectUri,
      { code: input.code },
      { code_verifier: input.codeVerifier, nonce: input.expectedNonce },
    );
    const claims = tokenSet.claims();
    return {
      email: claims.email ?? '',
      emailVerified: claims.email_verified === true,
      subject: claims.sub,
    };
  }

  private async getClient(redirectUri: string): Promise<Client> {
    const clientId = this.config.get<string>(this.clientIdEnvKey);
    const clientSecret = this.config.get<string>(this.clientSecretEnvKey);
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        `El inicio de sesión con ${this.providerLabel} no está configurado`,
      );
    }

    // El discovery document se resuelve una sola vez y se reutiliza en requests
    // siguientes — es el mismo client_id/secret durante toda la vida del proceso.
    if (!this.clientPromise) {
      this.clientPromise = Issuer.discover(this.issuerUrl).then(
        (issuer) =>
          new issuer.Client({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: [redirectUri],
            response_types: ['code'],
          }),
      );
    }
    return this.clientPromise;
  }
}
