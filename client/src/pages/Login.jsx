import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GOOGLE_OAUTH_URL = `${(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}/api/auth/google`;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    searchParams.get('error') ? 'Google sign-in failed. Please try again.' : ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-night px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-espresso-400 rounded-2xl mb-4">
            <Coffee size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-roast-dark dark:text-cream-100">BrewBuddy</h1>
          <p className="text-espresso-400 dark:text-espresso-300 mt-1 text-sm">Find your perfect coffee nearby</p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-xl font-semibold text-roast-mid dark:text-cream-100 mb-5">Sign in</h2>

          {/* Google OAuth */}
          <a
            href={GOOGLE_OAUTH_URL}
            className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl border border-cream-200 dark:border-night-border
                       bg-white dark:bg-night-raised text-sm font-medium text-roast-mid dark:text-cream-100
                       hover:bg-cream-50 dark:hover:bg-night transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </a>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-cream-200 dark:bg-night-border" />
            <span className="text-xs text-espresso-300">or</span>
            <div className="flex-1 h-px bg-cream-200 dark:bg-night-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-roast-mid dark:text-cream-200 mb-1.5">Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-roast-mid dark:text-cream-200 mb-1.5">Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-espresso-400 dark:text-espresso-300 mt-4">
            No account?{' '}
            <Link to="/register" className="text-espresso-500 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
