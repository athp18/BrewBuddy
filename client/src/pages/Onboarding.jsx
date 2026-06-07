import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VIBES = [
  { key: 'cozy',            label: 'Cozy',             emoji: '🛋️' },
  { key: 'laptop-friendly', label: 'Laptop-friendly',  emoji: '💻' },
  { key: 'quiet',           label: 'Quiet',            emoji: '🤫' },
  { key: 'lively',          label: 'Lively',           emoji: '🎉' },
  { key: 'fast',            label: 'Fast service',     emoji: '⚡' },
  { key: 'specialty',       label: 'Specialty coffee', emoji: '☕' },
];

const ROASTS = [
  { key: 'light',  label: 'Light',  desc: 'Bright & fruity' },
  { key: 'medium', label: 'Medium', desc: 'Balanced & smooth' },
  { key: 'dark',   label: 'Dark',   desc: 'Bold & rich' },
  { key: 'any',    label: 'Any',    desc: 'I explore it all' },
];

const Onboarding = () => {
  const { updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = vibes, 2 = roast
  const [vibes, setVibes] = useState([]);
  const [roast, setRoast] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleVibe = (key) =>
    setVibes((prev) => prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const prefs = { vibes, roastLevel: roast || 'any' };
      const { data } = await usersApi.updatePreferences(prefs);
      updateUser({ preferences: data.user.preferences });
      navigate('/', { replace: true });
    } catch {
      navigate('/', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-night flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-espresso-400 text-white mb-4">
            <Coffee size={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-roast-dark dark:text-cream-100">
            Welcome to BrewBuddy
          </h1>
          <p className="text-sm text-espresso-400 dark:text-espresso-300 mt-1">
            Tell us what you love so we can find your perfect cup.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-espresso-400' : s < step ? 'w-4 bg-espresso-300' : 'w-4 bg-cream-300 dark:bg-night-border'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="fade-up">
            <h2 className="font-semibold text-roast-mid dark:text-cream-200 mb-4">
              What's your vibe? <span className="text-espresso-300 font-normal">(pick any)</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {VIBES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleVibe(key)}
                  className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all ${
                    vibes.includes(key)
                      ? 'bg-espresso-400 text-white border-espresso-400'
                      : 'bg-white dark:bg-night-surface border-cream-200 dark:border-night-border text-roast-mid dark:text-cream-200 hover:border-espresso-300'
                  }`}
                >
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="btn-primary w-full mt-6"
            >
              Next
            </button>
            <button
              onClick={handleFinish}
              className="w-full mt-2 text-sm text-espresso-400 hover:text-espresso-600 py-2"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <h2 className="font-semibold text-roast-mid dark:text-cream-200 mb-4">
              Roast preference?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {ROASTS.map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoast(key)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    roast === key
                      ? 'bg-espresso-400 text-white border-espresso-400'
                      : 'bg-white dark:bg-night-surface border-cream-200 dark:border-night-border text-roast-mid dark:text-cream-200 hover:border-espresso-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className={`text-xs mt-0.5 ${roast === key ? 'text-cream-200' : 'text-espresso-400'}`}>{desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary w-full mt-6"
            >
              {saving ? 'Setting up…' : "Let's go →"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full mt-2 text-sm text-espresso-400 hover:text-espresso-600 py-2"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
