import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { HomeRedirect } from './routes/HomeRedirect';
import { LoginPage } from './pages/LoginPage';
import { SsoCallbackPage } from './pages/SsoCallbackPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CentrosPage } from './pages/CentrosPage';
import { PlantillasPage } from './pages/PlantillasPage';
import { CompletarInspeccionPage } from './pages/CompletarInspeccionPage';
import { AgendaPage } from './pages/AgendaPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { RolesPage } from './pages/RolesPage';
import { ComentariosPage } from './pages/ComentariosPage';
import { ReportesPage } from './pages/ReportesPage';
import { OlvideContrasenaPage } from './pages/OlvideContrasenaPage';
import { RestablecerContrasenaPage } from './pages/RestablecerContrasenaPage';
import { PerfilPage } from './pages/PerfilPage';
import { CompletarFormularioPage } from './pages/CompletarFormularioPage';
import { FormularioRespuestasPage } from './pages/FormularioRespuestasPage';

const LIGHT = {
  primary: { main: '#004E89', light: '#3572A8', dark: '#00365F', contrastText: '#FFFFFF' },
  secondary: { main: '#F97316', light: '#FB9A4B', dark: '#C2570A', contrastText: '#FFFFFF' },
  background: { default: '#F4F6F9', paper: '#FFFFFF' },
  success: { main: '#2E7D32' },
  error: { main: '#C62828' },
  text: { primary: '#151B26', secondary: '#5B6472' },
  divider: '#E5E9EF',
  tableHeadBg: '#F8FAFC',
};

const DARK = {
  primary: { main: '#5B9BD8', light: '#8AC0EE', dark: '#3572A8', contrastText: '#0B1220' },
  secondary: { main: '#FB923C', light: '#FDB56E', dark: '#C2570A', contrastText: '#0B1220' },
  background: { default: '#0B1220', paper: '#121A2B' },
  success: { main: '#4ABE86' },
  error: { main: '#E5766D' },
  text: { primary: '#E8ECF3', secondary: '#98A2B3' },
  divider: '#243044',
  tableHeadBg: '#16203350',
};

function getTheme(mode: 'light' | 'dark') {
  const p = mode === 'dark' ? DARK : LIGHT;
  return createTheme({
    palette: {
      mode,
      primary: p.primary,
      secondary: p.secondary,
      background: p.background,
      success: p.success,
      error: p.error,
      text: p.text,
      divider: p.divider,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: p.background.default },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === 'dark' ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${p.divider}`,
            boxShadow:
              mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(15, 23, 42, 0.04)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10 },
          contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              fontWeight: 700,
              color: p.text.secondary,
              backgroundColor: p.tableHeadBg,
            },
          },
        },
      },
    },
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AppShell() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/sso/callback" element={<SsoCallbackPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/olvide-contrasena" element={<OlvideContrasenaPage />} />
              <Route
                path="/restablecer-contrasena"
                element={<RestablecerContrasenaPage />}
              />
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/centros"
                element={
                  <ProtectedRoute>
                    <CentrosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plantillas"
                element={
                  <ProtectedRoute>
                    <PlantillasPage />
                  </ProtectedRoute>
                }
              />
              {/* Las inspecciones ahora viven dentro de Agenda (lista unificada + calendario). */}
              <Route path="/inspecciones" element={<Navigate to="/agenda" replace />} />
              <Route
                path="/inspecciones/:id"
                element={
                  <ProtectedRoute>
                    <CompletarInspeccionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agenda"
                element={
                  <ProtectedRoute>
                    <AgendaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comentarios"
                element={
                  <ProtectedRoute>
                    <ComentariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute>
                    <ReportesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <PerfilPage />
                  </ProtectedRoute>
                }
              />
              {/* Los formularios ahora viven dentro de Plantillas (lista unificada). */}
              <Route path="/formularios" element={<Navigate to="/plantillas" replace />} />
              <Route
                path="/formularios/:id/completar"
                element={
                  <ProtectedRoute>
                    <CompletarFormularioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formularios/:id/respuestas"
                element={
                  <ProtectedRoute>
                    <FormularioRespuestasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomeRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <HomeRedirect />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <AppShell />
    </ThemeModeProvider>
  );
}
