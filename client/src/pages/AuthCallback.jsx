import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/', { replace: true }))
      .catch(() => navigate('/login?error=oauth_failed', { replace: true }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-night">
      <div className="w-8 h-8 border-2 border-espresso-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default AuthCallback;
