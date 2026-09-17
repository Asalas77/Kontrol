export const GOOGLE_SSO_PROVIDER = Symbol('GOOGLE_SSO_PROVIDER');
export const MICROSOFT_SSO_PROVIDER = Symbol('MICROSOFT_SSO_PROVIDER');

export interface SsoAuthorizationRequest {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface SsoIdentity {
  email: string;
  emailVerified: boolean;
  subject: string;
}

export interface SsoCodeExchange {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  expectedNonce: string;
}

export interface SsoProviderPort {
  getAuthorizationUrl(request: SsoAuthorizationRequest): Promise<string>;
  exchangeCode(input: SsoCodeExchange): Promise<SsoIdentity>;
}

export class SsoNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`El inicio de sesión con ${provider} no está configurado`);
  }
}
