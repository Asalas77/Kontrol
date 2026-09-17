import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { AuthBackground } from '../components/AuthBackground';

/**
 * Destino del redirect que hace el backend al terminar el intercambio OIDC. El access
 * token viaja en el fragment (#...), no en la query string: el fragment nunca llega al
 * servidor ni queda en logs de acceso, a diferencia de un query param.
 */
export function SsoCallbackPage() {
  const { completeSsoLogin } = useAuth();
  const navigate = useNavigate();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);

    const accessToken = params.get('access_token');
    if (!accessToken) {
      const reason = params.get('error') ?? 'sso';
      navigate(`/login?error=${encodeURIComponent(reason)}`, { replace: true });
      return;
    }

    completeSsoLogin(accessToken)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=sso', { replace: true }));
  }, [completeSsoLogin, navigate]);

  return (
    <AuthBackground>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    </AuthBackground>
  );
}
