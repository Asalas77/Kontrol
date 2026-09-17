import { http } from './http';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export type SsoProvider = 'google' | 'microsoft';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterTenantRequest {
  empresaNombre: string;
  empresaRut: string;
  adminNombre: string;
  adminApellido: string;
  adminEmail: string;
  password: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  userId: string;
  tenantId: string;
  tenantNombre: string | null;
  permissions: string[];
}

export interface RequestPasswordResetResponse {
  /** Solo presente en desarrollo, mientras no haya envío real de correo. */
  devResetUrl?: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    http.post<AccessTokenResponse>('/auth/login', body).then((r) => r.data),

  register: (body: RegisterTenantRequest) =>
    http
      .post<{ tenantId: string; userId: string }>('/auth/register', body)
      .then((r) => r.data),

  refresh: () => http.post<AccessTokenResponse>('/auth/refresh').then((r) => r.data),

  logout: () => http.post('/auth/logout').then(() => undefined),

  me: () => http.get<MeResponse>('/auth/me').then((r) => r.data),

  requestPasswordReset: (email: string) =>
    http
      .post<RequestPasswordResetResponse>('/auth/olvide-contrasena', { email })
      .then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    http.post('/auth/restablecer-contrasena', { token, newPassword }).then(() => undefined),

  changePassword: (currentPassword: string, newPassword: string) =>
    http
      .post('/auth/cambiar-contrasena', { currentPassword, newPassword })
      .then(() => undefined),

  /**
   * No es un fetch: el navegador debe navegar de verdad a esta URL para que el backend
   * pueda redirigir al proveedor (Google/Microsoft) y luego volver con el código.
   */
  ssoLoginUrl: (provider: SsoProvider) => `${API_URL}/auth/sso/${provider}/iniciar`,
};
