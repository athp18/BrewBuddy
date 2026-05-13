import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
