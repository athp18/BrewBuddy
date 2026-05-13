import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Star, Coffee, Settings2, Bookmark, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reviewsApi, usersApi } from '../services/api';
import StarRating from '../components/StarRating';
import PassportCard from '../components/PassportCard';
import { useNavigate } from 'react-router-dom';
import { useUnits } from '../hooks/useUnits';
import { toPng } from 'html-to-image';

const VIBES = ['cozy', 'quiet', 'lively', 'laptop-friendly', 'fast', 'specialty'];

// ── Review heatmap ────────────────────────────────────────────────────────────
const CELL = 11;   // cell size px
const GAP  = 2;    // gap px
const STEP = CELL + GAP;
const LEFT = 16;   // left padding for day labels
const TOP  = 14;   // top padding for month labels
const NUM_WEEKS = 26; // ~6 months

const DAY_LABELS = [null, 'M', null, 'W', null, 'F', null];

const ReviewHeatmap = ({ reviews }) => {
  const [tooltip, setTooltip] = useState(null); // { x, y, ds, count }

  const countByDate = useMemo(() => {
    const map = {};
    reviews.forEach((r) => {
      const d = new Date(r.createdAt).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [reviews]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - NUM_WEEKS * 7);
    start.setDate(start.getDate() - start.getDay()); // rewind to Sunday

    const weeks = [];
    const seen  = new Set();
    const monthLabels = [];

    for (let w = 0; w <= NUM_WEEKS; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(date.getDate() + w * 7 + d);
        if (date > today) { week.push(null); continue; }

        const ds = date.toISOString().slice(0, 10);
        week.push({ ds, count: countByDate[ds] || 0 });

        // First day of each month that falls on a Sunday → label
        if (d === 0) {
          const key = `${date.getFullYear()}-${date.getMonth()}`;
          if (!seen.has(key)) {
            seen.add(key);
            monthLabels.push({
              w,
              label: date.toLocaleString('default', { month: 'short' }),
            });
          }
        }
      }
      weeks.push(week);
    }
    return { weeks, monthLabels };
  }, [countByDate]);

  const getLevel = (count) => {
    if (!count) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    return 3;
  };

  const totalPeriod = Object.values(countByDate).reduce((s, n) => s + n, 0);
  const svgW = LEFT + weeks.length * STEP;
  const svgH = TOP  + 7 * STEP;

  const formatTooltipDate = (ds) => {
    const [y, m, d] = ds.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="card p-4 dark:bg-night-surface">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-roast-mid dark:text-cream-200">
          Review activity
        </h3>
        <span className="text-xs text-espresso-300">
          {totalPeriod} review{totalPeriod !== 1 ? 's' : ''} · past 6 months
        </span>
      </div>

      <div className="overflow-x-auto relative" onMouseLeave={() => setTooltip(null)}>
        <svg width={svgW} height={svgH} className="block text-espresso-300">
          {/* Month labels */}
          {monthLabels.map(({ w, label }) => (
            <text
              key={`${label}-${w}`}
              x={LEFT + w * STEP}
              y={9}
              fontSize={9}
              fill="currentColor"
              opacity={0.6}
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, d) =>
            label ? (
              <text
                key={d}
                x={0}
                y={TOP + d * STEP + CELL - 1}
                fontSize={9}
                fill="currentColor"
                opacity={0.45}
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) return null;
              const cx = LEFT + wi * STEP;
              const cy = TOP  + di * STEP;
              return (
                <rect
                  key={day.ds}
                  x={cx}
                  y={cy}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  className={`heatmap-${getLevel(day.count)} cursor-default`}
                  onMouseEnter={() => setTooltip({ x: cx + CELL / 2, y: cy - 4, ds: day.ds, count: day.count })}
                />
              );
            })
          )}
        </svg>

        {/* Custom tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full
                       bg-roast-dark dark:bg-night-border text-cream-100 text-[11px] font-medium
                       px-2 py-1 rounded-lg shadow-lg whitespace-nowrap"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.count === 0
              ? `No reviews · ${formatTooltipDate(tooltip.ds)}`
              : `${tooltip.count} review${tooltip.count !== 1 ? 's' : ''} · ${formatTooltipDate(tooltip.ds)}`}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                            border-x-4 border-x-transparent border-t-4 border-t-roast-dark dark:border-t-night-border" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-espresso-300 mr-0.5">Less</span>
        {[0, 1, 2, 3].map((l) => (
          <svg key={l} width={CELL} height={CELL}>
            <rect width={CELL} height={CELL} rx={2} className={`heatmap-${l}`} />
          </svg>
        ))}
        <span className="text-[10px] text-espresso-300 ml-0.5">More</span>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { unit, toggleUnit, formatDistance } = useUnits();
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [savingPrefs, setSavingPrefs] = useState(false);

  const passportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.mine().then((r) => r.data.reviews),
  });

  const { data: passport, isLoading: passportLoading } = useQuery({
    queryKey: ['passport'],
    queryFn: () => usersApi.passport().then((r) => r.data),
    enabled: showPassport,
    staleTime: 10 * 60 * 1000,
  });

  const downloadPassport = async () => {
    if (!passportRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(passportRef.current, { pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = 'brewbuddy-passport.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export passport', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleVibe = (v) =>
    setPrefs((p) => ({
      ...p,
      vibes: p.vibes?.includes(v) ? p.vibes.filter((x) => x !== v) : [...(p.vibes || []), v],
    }));

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      const { data } = await usersApi.updatePreferences(prefs);
      updateUser({ preferences: data.user.preferences });
      setEditingPrefs(false);
    } catch { /* noop */ } finally { setSavingPrefs(false); }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-night pt-14 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* User header */}
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-espresso-400 flex items-center justify-center text-white text-xl font-display font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-semibold text-roast-dark text-lg truncate">{user?.name}</h2>
              <p className="text-sm text-espresso-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-cream-100 transition-colors text-espresso-300">
              <LogOut size={18} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: <Coffee size={16} />, label: 'Reviews', value: reviews.length },
              { icon: <Star size={16} />, label: 'Avg rating', value: avgRating },
              { icon: <Bookmark size={16} />, label: 'Saved', value: user?.savedShops?.length || 0 },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-cream-50 dark:bg-night-raised rounded-xl p-3 border border-cream-200 dark:border-night-border text-center">
                <div className="text-espresso-400 flex justify-center mb-1">{icon}</div>
                <p className="text-lg font-semibold text-roast-dark dark:text-cream-100">{value}</p>
                <p className="text-xs text-espresso-300">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Review heatmap */}
        {!isLoading && <ReviewHeatmap reviews={reviews} />}

        {/* Coffee Passport */}
        <div>
          {!showPassport ? (
            <button
              onClick={() => setShowPassport(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-espresso-200
                         text-sm font-medium text-espresso-400 hover:border-espresso-400
                         hover:text-espresso-500 transition-colors flex items-center justify-center gap-2"
            >
              ☕ View my Coffee Passport
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-roast-mid text-sm">Coffee Passport</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPassport}
                    disabled={downloading || passportLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-espresso-500
                               bg-cream-100 border border-cream-200 px-3 py-1.5 rounded-lg
                               hover:bg-cream-200 transition-colors disabled:opacity-50"
                  >
                    {downloading
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Download size={12} />}
                    {downloading ? 'Saving…' : 'Download'}
                  </button>
                  <button
                    onClick={() => setShowPassport(false)}
                    className="text-xs text-espresso-300 hover:text-espresso-500"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {passportLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-espresso-400" />
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <PassportCard ref={passportRef} passport={passport} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Taste profile */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-espresso-400" />
              <h3 className="font-semibold text-roast-mid">Taste profile</h3>
            </div>
            <button
              onClick={() => editingPrefs ? savePrefs() : setEditingPrefs(true)}
              disabled={savingPrefs}
              className="text-xs text-espresso-500 font-medium hover:underline"
            >
              {editingPrefs ? (savingPrefs ? 'Saving…' : 'Save') : 'Edit'}
            </button>
          </div>

          {editingPrefs ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-roast-mid mb-2">Roast preference</p>
                <div className="grid grid-cols-4 gap-2">
                  {['light', 'medium', 'dark', 'any'].map((r) => (
                    <button key={r} type="button"
                      onClick={() => setPrefs((p) => ({ ...p, roastLevel: r }))}
                      className={`py-1.5 text-xs rounded-lg border capitalize transition-colors
                        ${prefs.roastLevel === r
                          ? 'bg-espresso-400 text-white border-espresso-400'
                          : 'border-cream-200 text-espresso-400 hover:bg-cream-100'}`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-roast-mid mb-2">Vibes</p>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button key={v} type="button" onClick={() => toggleVibe(v)}
                      className={`tag capitalize ${prefs.vibes?.includes(v) ? 'bg-espresso-400 text-white border-espresso-400' : ''}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-roast-mid">
                    Max distance: {formatDistance(prefs.maxDistance || 3000)}
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
                <input type="range" min={500} max={10000} step={500} value={prefs.maxDistance || 3000}
                  onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: parseInt(e.target.value) }))}
                  className="w-full accent-espresso-400" />
                <div className="flex justify-between text-xs text-espresso-300 mt-1">
                  <span>{formatDistance(500)}</span><span>{formatDistance(10000)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-espresso-400">Roast</span>
                <span className="text-roast-mid font-medium capitalize">{user?.preferences?.roastLevel || 'Any'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-espresso-400">Max distance</span>
                <span className="text-roast-mid font-medium">
                  {formatDistance(user?.preferences?.maxDistance || 3000)}
                </span>
              </div>
              <div className="flex items-start justify-between text-sm gap-3">
                <span className="text-espresso-400 shrink-0">Vibes</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {user?.preferences?.vibes?.length > 0
                    ? user.preferences.vibes.map((v) => <span key={v} className="tag capitalize text-xs">{v}</span>)
                    : <span className="text-roast-mid">Not set</span>
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Review history */}
        <div>
          <h3 className="font-semibold text-roast-mid mb-3 flex items-center gap-2">
            <Star size={16} className="text-espresso-400" /> Your reviews
          </h3>
          {isLoading ? (
            <div className="card p-6 text-center text-sm text-espresso-400">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="card p-6 text-center">
              <Coffee size={28} className="text-cream-300 mx-auto mb-2" />
              <p className="text-sm text-espresso-400">No reviews yet.</p>
              <p className="text-xs text-espresso-300 mt-1">Discover a coffee shop and leave your first review!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reviews.map((r) => (
                <div key={r._id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-sm text-roast-dark">{r.shopName}</p>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  {r.body && <p className="text-sm text-espresso-400 mb-2">{r.body}</p>}
                  <div className="flex flex-wrap gap-1">
                    {r.tags?.map((t) => <span key={t} className="tag text-xs">{t.replace(/-/g, ' ')}</span>)}
                  </div>
                  <p className="text-xs text-espresso-300 mt-2">
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
