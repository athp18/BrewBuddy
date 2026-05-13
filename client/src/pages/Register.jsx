import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUnits } from '../hooks/useUnits';

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
