import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, MeResponse } from '../api/auth';
import { refreshAccessToken, setAccessToken, setUnauthorizedHandler } from '../api/http';

interface AuthContextValue {
  user: MeResponse | null;
  /** true mientras se resuelve la sesión al cargar la app (refresh silencioso). */
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  completeSsoLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    // El access token vive solo en memoria, así que al recargar la página hay que
    // reconstruir la sesión con la cookie de refresh, que sí sobrevive al reload.
    // Pasa por el singleton de http.ts (no por authApi.refresh() directo) porque el
    // efecto de este componente se monta dos veces bajo React StrictMode en dev, y el
    // refresh token rota en cada canje: sin compartir la promesa, la segunda llamada
    // usaría un token que la primera ya revocó.
    refreshAccessToken()
      .then(() => authApi.me())
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { accessToken } = await authApi.login(credentials);
    setAccessToken(accessToken);
    const me = await authApi.me();
    setUser(me);
  }, []);

  // El backend ya emitió el access token y dejó la cookie de refresh puesta (misma
  // sesión que login() de contraseña) — solo falta guardarlo en memoria y traer al usuario.
  const completeSsoLogin = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    const me = await authApi.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, completeSsoLogin, logout, hasPermission }),
    [user, isLoading, login, completeSsoLogin, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
