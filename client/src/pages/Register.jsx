import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUnits } from '../hooks/useUnits';

const GOOGLE_OAUTH_URL = `${(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}/api/auth/google`;

const VIBES = ['cozy', 'quiet', 'lively', 'laptop-friendly', 'fast', 'specialty'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { unit, toggleUnit, formatDistance } = useUnits();
  const [step, setStep] = useState(1); // 1 = credentials, 2 = taste profile
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    roastLevel: 'any', vibes: [], maxDistance: 3000,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleVibe = (v) =>
    setForm((p) => ({
      ...p,
      vibes: p.vibes.includes(v) ? p.vibes.filter((x) => x !== v) : [...p.vibes, v],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 dark:bg-night px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-espresso-400 rounded-2xl mb-4">
            <Coffee size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-3xl font-semibold text-roast-dark dark:text-cream-100">BrewBuddy</h1>
          <p className="text-espresso-400 dark:text-espresso-300 mt-1 text-sm">Create your taste profile</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {[1, 2].map((s) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-cream-200 dark:bg-night-raised">
              <div className={`h-full bg-espresso-400 transition-all duration-300 ${step >= s ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        <div className="card p-6">
          {step === 1 ? (
            <>
              <h2 className="font-display text-xl font-semibold text-roast-mid mb-5">Create account</h2>

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

              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-cream-200 dark:bg-night-border" />
                <span className="text-xs text-espresso-300">or</span>
                <div className="flex-1 h-px bg-cream-200 dark:bg-night-border" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-roast-mid mb-1.5">Name</label>
                  <input className="input" placeholder="Your name" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-roast-mid mb-1.5">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-roast-mid mb-1.5">Password</label>
                  <input type="password" className="input" placeholder="Min 6 characters" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button
                  onClick={() => {
                    if (!form.name || !form.email || form.password.length < 6) {
                      setError('Please fill all fields (password min 6 chars)');
                      return;
                    }
                    setError('');
                    setStep(2);
                  }}
                  className="btn-primary w-full mt-2"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="font-display text-xl font-semibold text-roast-mid mb-1">Your taste profile</h2>
              <p className="text-xs text-espresso-400 mb-5">Helps us personalise your recommendations</p>

              <div className="space-y-5">
                {/* Roast preference */}
                <div>
                  <p className="text-sm font-medium text-roast-mid mb-2">Preferred roast</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['light', 'medium', 'dark', 'any'].map((r) => (
                      <button
                        key={r} type="button"
                        onClick={() => setForm({ ...form, roastLevel: r })}
                        className={`py-1.5 text-xs rounded-lg border capitalize transition-colors
                          ${form.roastLevel === r
                            ? 'bg-espresso-400 text-white border-espresso-400'
                            : 'border-cream-200 dark:border-night-border text-espresso-400 hover:bg-cream-100 dark:hover:bg-night-raised'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vibes */}
                <div>
                  <p className="text-sm font-medium text-roast-mid mb-2">Vibes you love</p>
                  <div className="flex flex-wrap gap-2">
                    {VIBES.map((v) => (
                      <button key={v} type="button" onClick={() => toggleVibe(v)}
                        className={`tag capitalize ${form.vibes.includes(v) ? 'bg-espresso-400 text-white border-espresso-400' : ''}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max distance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-roast-mid">
                      Max distance: {formatDistance(form.maxDistance)}
                    </p>
                    <button
                      type="button"
                      onClick={toggleUnit}
                      className="flex items-center gap-0.5 text-xs font-medium rounded-lg border border-cream-200 overflow-hidden"
                    >
                      <span className={`px-2 py-1 transition-colors ${unit === 'mi' ? 'bg-espresso-400 text-white' : 'text-espresso-400'}`}>mi</span>
                      <span className={`px-2 py-1 transition-colors ${unit === 'km' ? 'bg-espresso-400 text-white' : 'text-espresso-400'}`}>km</span>
                    </button>
                  </div>
                  <input type="range" min={500} max={10000} step={500} value={form.maxDistance}
                    onChange={(e) => setForm({ ...form, maxDistance: parseInt(e.target.value) })}
                    className="w-full accent-espresso-400" />
                  <div className="flex justify-between text-xs text-espresso-300 mt-1">
                    <span>{formatDistance(500)}</span><span>{formatDistance(10000)}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Creating…' : 'Get started'}
                </button>
              </div>
            </form>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-espresso-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-espresso-500 font-medium hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Register;
