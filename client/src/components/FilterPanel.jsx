import { X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useUnits } from '../hooks/useUnits';

const VIBES = ['cozy', 'quiet', 'lively', 'laptop-friendly', 'fast', 'specialty', 'outdoor'];
const PRICE_OPTIONS = [
  { label: '$', value: 1 },
  { label: '$$', value: 2 },
  { label: '$$$', value: 3 },
  { label: '$$$$', value: 4 },
];
// Values stored in meters, labels shown in mi or km
const RADIUS_OPTIONS_MI = [
  { label: '1mi',  value: 1609 },
  { label: '2mi',  value: 3218 },
  { label: '5mi',  value: 8046 },  // default
  { label: '10mi', value: 16093 },
];
const RADIUS_OPTIONS_KM = [
  { label: '1km',  value: 1000 },
  { label: '3km',  value: 3000 },
  { label: '8km',  value: 8000 },  // ~5mi default
  { label: '15km', value: 15000 },
];

const FilterPanel = ({ filters, onChange, onClose }) => {
  const [local, setLocal] = useState(filters);
  const { unit, toggleUnit } = useUnits();
  const RADIUS_OPTIONS = unit === 'mi' ? RADIUS_OPTIONS_MI : RADIUS_OPTIONS_KM;

  const toggle = (key, value) => {
    setLocal((prev) => {
      const arr = prev[key] || [];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const apply = () => {
    onChange(local);
    onClose();
  };

  const reset = () => {
    const defaults = { vibes: [], priceRange: [], radius: 8046, openNow: false, minRating: 0 };
    setLocal(defaults);
    onChange(defaults);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-roast-dark/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-80 bg-white h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-cream-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-espresso-400" />
            <h2 className="font-display font-semibold text-roast-mid">Filters</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-cream-100 rounded-lg transition-colors">
            <X size={18} className="text-espresso-300" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Open now */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-roast-mid">Open now</span>
            <div
              onClick={() => setLocal((p) => ({ ...p, openNow: !p.openNow }))}
              className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer
                ${local.openNow ? 'bg-espresso-400' : 'bg-cream-300'}`}
              style={{ height: '22px' }}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${local.openNow ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
          </label>

          {/* Vibe */}
          <div>
            <p className="text-sm font-medium text-roast-mid mb-2">Vibe</p>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  onClick={() => toggle('vibes', v)}
                  className={`tag capitalize transition-colors ${
                    local.vibes?.includes(v)
                      ? 'bg-espresso-400 text-white border-espresso-400'
                      : ''
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <p className="text-sm font-medium text-roast-mid mb-2">Price</p>
            <div className="flex gap-2">
              {PRICE_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggle('priceRange', value)}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors
                    ${local.priceRange?.includes(value)
                      ? 'bg-espresso-400 text-white border-espresso-400'
                      : 'border-cream-200 text-espresso-400 hover:bg-cream-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Radius */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-roast-mid">Distance</p>
              <button
                onClick={toggleUnit}
                className="flex items-center gap-0.5 text-xs font-medium rounded-lg border border-cream-200 overflow-hidden"
              >
                <span className={`px-2 py-1 transition-colors ${unit === 'mi' ? 'bg-espresso-400 text-white' : 'text-espresso-400 hover:bg-cream-100'}`}>mi</span>
                <span className={`px-2 py-1 transition-colors ${unit === 'km' ? 'bg-espresso-400 text-white' : 'text-espresso-400 hover:bg-cream-100'}`}>km</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RADIUS_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setLocal((p) => ({ ...p, radius: value }))}
                  className={`py-1.5 text-sm rounded-lg border transition-colors
                    ${local.radius === value
                      ? 'bg-espresso-400 text-white border-espresso-400'
                      : 'border-cream-200 text-espresso-400 hover:bg-cream-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Min rating */}
          <div>
            <p className="text-sm font-medium text-roast-mid mb-2">
              Min rating: {local.minRating > 0 ? `${local.minRating}+` : 'Any'}
            </p>
            <input
              type="range"
              min={0}
              max={4.5}
              step={0.5}
              value={local.minRating}
              onChange={(e) => setLocal((p) => ({ ...p, minRating: parseFloat(e.target.value) }))}
              className="w-full accent-espresso-400"
            />
            <div className="flex justify-between text-xs text-espresso-300 mt-1">
              <span>Any</span><span>4.5+</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-cream-200 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={reset} className="btn-secondary flex-1 text-sm py-2">Reset</button>
          <button onClick={apply} className="btn-primary flex-1 text-sm py-2">Apply</button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
