import { forwardRef } from 'react';

// Explicit hex values — no CSS variables — so html-to-image captures correctly
const C = {
  bg:         '#1a0f08',
  bgMid:      '#2c1a0e',
  bgLight:    '#3d2410',
  cream:      '#f5ede0',
  creamDim:   '#c9a882',
  gold:       '#d4a853',
  pill:       'rgba(255,255,255,0.12)',
  pillBorder: 'rgba(255,255,255,0.20)',
};

const DRINK_LABEL = {
  'great-espresso':  'Espresso',
  'great-pour-over': 'Pour Over',
  'specialty-coffee':'Specialty',
  'latte':           'Latte',
  'cappuccino':      'Cappuccino',
  'cold-brew':       'Cold Brew',
  'matcha':          'Matcha',
  'flat-white':      'Flat White',
  'americano':       'Americano',
  'cortado':         'Cortado',
};

const VIBE_LABEL = {
  'cozy':            'Cozy',
  'quiet':           'Quiet',
  'loud':            'Lively',
  'laptop-friendly': 'Laptop-friendly',
  'outdoor-seating': 'Outdoor',
  'good-wifi':       'Good WiFi',
  'good-food':       'Good food',
  'fast-service':    'Fast service',
  'good-value':      'Good value',
};

const Pill = ({ label }) => (
  <span style={{
    display: 'inline-block',
    background: C.pill,
    border: `1px solid ${C.pillBorder}`,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    color: C.cream,
    margin: '2px 3px 2px 0',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </span>
);

const Divider = () => (
  <div style={{ borderTop: `1px solid ${C.pillBorder}`, margin: '14px 0' }} />
);

const FieldLabel = ({ children }) => (
  <p style={{ fontSize: 9, letterSpacing: '0.12em', color: C.creamDim, marginBottom: 5, textTransform: 'uppercase' }}>
    {children}
  </p>
);

/**
 * PassportCard — pass a `ref` to capture this element with html-to-image.
 *
 * Props:
 *   passport: { name, memberSince, reviewCount, avgRating, savedCount, tasteProfile, personality }
 */
const PassportCard = forwardRef(({ passport }, ref) => {
  if (!passport) return null;

  const { name, memberSince, reviewCount, avgRating, tasteProfile, personality } = passport;

  const initial = (name || '?').charAt(0).toUpperCase();
  const firstName = (name || '').split(' ')[0];
  const lastName  = (name || '').split(' ').slice(1).join(' ');
  const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;

  const memberYear = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const topDrinks = Object.entries(tasteProfile?.drinks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => DRINK_LABEL[t] ?? t.replace(/-/g, ' '));

  const topVibes = Object.entries(tasteProfile?.vibes || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => VIBE_LABEL[t] ?? t.replace(/-/g, ' '));

  const priceLevel = tasteProfile?.avgPriceLevel
    ? '$'.repeat(Math.round(tasteProfile.avgPriceLevel))
    : null;

  return (
    <div
      ref={ref}
      style={{
        width: 360,
        background: C.bg,
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: 'Georgia, serif',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Header bar */}
      <div style={{
        background: C.bgMid,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${C.pillBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>☕</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.cream, letterSpacing: '0.05em' }}>
            BREWBUDDY
          </span>
        </div>
        <span style={{ fontSize: 9, color: C.creamDim, letterSpacing: '0.15em' }}>COFFEE PASSPORT</span>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 22px' }}>

        {/* Avatar + name + personality */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: C.bgLight,
            border: `2px solid ${C.gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: C.gold, fontWeight: 700,
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: C.cream, margin: 0, lineHeight: 1.2 }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: C.gold, margin: '4px 0 0', fontStyle: 'italic' }}>
              {personality}
            </p>
          </div>
        </div>

        <Divider />

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 18 }}>
          {[
            { label: 'Shops visited', value: reviewCount ?? '—' },
            { label: 'Avg rating',    value: avgRating ? `${avgRating}★` : '—' },
            { label: 'Member since',  value: memberYear },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              flex: 1,
              textAlign: 'center',
              borderRight: i < 2 ? `1px solid ${C.pillBorder}` : 'none',
              padding: '0 8px',
            }}>
              <FieldLabel>{label}</FieldLabel>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.cream, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* Drinks */}
        {topDrinks.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Drinks</FieldLabel>
            <div>{topDrinks.map((d) => <Pill key={d} label={d} />)}</div>
          </div>
        )}

        {/* Vibes */}
        {topVibes.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Vibes</FieldLabel>
            <div>{topVibes.map((v) => <Pill key={v} label={v} />)}</div>
          </div>
        )}

        {/* Price */}
        {priceLevel && (
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Usual spend</FieldLabel>
            <p style={{ fontSize: 14, color: C.cream, margin: 0 }}>{priceLevel}</p>
          </div>
        )}

        <Divider />

        {/* Footer dots + url */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i % 3 === 0 ? C.gold : C.pillBorder,
              }} />
            ))}
          </div>
          <p style={{ fontSize: 9, color: C.creamDim, letterSpacing: '0.08em', margin: 0 }}>
            brewbuddy.app
          </p>
        </div>
      </div>
    </div>
  );
});

PassportCard.displayName = 'PassportCard';
export default PassportCard;
