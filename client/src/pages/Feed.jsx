import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Bookmark, Star, MapPin, Coffee, Sparkles, Clock } from 'lucide-react';
import { feedApi, resolvePhoto } from '../services/api';
import { useLocation } from '../hooks/useLocation';
import { useUnits } from '../hooks/useUnits';
import { useAuth } from '../context/AuthContext';
import ShopDetail from '../components/ShopDetail';
import StarRating from '../components/StarRating';

// ── Saved shop pill ───────────────────────────────────────────────────────────
const SavedPill = ({ shop, onSelect }) => (
  <button
    onClick={() => onSelect(shop.placeId)}
    className="shrink-0 flex flex-col items-center gap-1.5 w-20"
  >
    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-cream-200 dark:bg-night-raised border border-cream-300 dark:border-night-border">
      {shop.photoUrl ? (
        <img src={resolvePhoto(shop.photoUrl)} alt={shop.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Coffee size={20} className="text-cream-400 dark:text-night-border" />
        </div>
      )}
    </div>
    <span className="text-[10px] text-espresso-500 dark:text-espresso-300 font-medium text-center line-clamp-2 leading-tight w-full">
      {shop.name}
    </span>
  </button>
);

// ── Horizontal shop card (compact) ───────────────────────────────────────────
const FeedShopCard = ({ shop, onSelect, formatDistance }) => (
  <button
    onClick={() => onSelect(shop.place_id)}
    className="shrink-0 w-44 bg-white dark:bg-night-surface rounded-2xl border border-cream-200 dark:border-night-border overflow-hidden shadow-sm
               hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
  >
    <div className="h-28 bg-cream-200 dark:bg-night-raised relative">
      {shop.photos?.[0]?.url ? (
        <img src={resolvePhoto(shop.photos[0].url)} alt={shop.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-cream-400 dark:text-night-border">
          <Coffee size={22} />
        </div>
      )}
      {shop.brewScore != null && (
        <div className="absolute top-1.5 left-1.5 brew-score text-[10px] px-1.5 py-0.5">
          ☕ {(shop.brewScore * 100).toFixed(0)}
        </div>
      )}
    </div>
    <div className="p-2.5">
      <p className="text-xs font-semibold text-roast-dark dark:text-cream-100 line-clamp-1">{shop.name}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <StarRating value={shop.rating || 0} size={10} />
        <span className="text-[10px] text-espresso-400 dark:text-espresso-300">{shop.rating?.toFixed(1)}</span>
      </div>
      {shop.distanceM != null && (
        <p className="text-[10px] text-espresso-300 dark:text-espresso-400 mt-0.5 flex items-center gap-0.5">
          <MapPin size={9} /> {formatDistance(shop.distanceM)}
        </p>
      )}
      {shop.brewReason && (
        <p className="text-[10px] text-espresso-500 dark:text-espresso-300 mt-1.5 font-medium line-clamp-2 border-t border-cream-100 dark:border-night-border pt-1.5 leading-snug">
          {shop.brewReason}
        </p>
      )}
    </div>
  </button>
);

// ── Review card (vertical list) ───────────────────────────────────────────────
const ReviewCard = ({ review, onSelect }) => {
  const timeAgo = (dateStr) => {
    const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <button
      onClick={() => onSelect(review.placeId)}
      className="w-full bg-white dark:bg-night-surface rounded-2xl border border-cream-200 dark:border-night-border p-3.5 text-left
                 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-roast-dark dark:text-cream-100 line-clamp-1">{review.shopName}</p>
        <span className="text-[10px] text-espresso-300 dark:text-espresso-400 shrink-0 flex items-center gap-0.5">
          <Clock size={10} /> {timeAgo(review.createdAt)}
        </span>
      </div>
      <StarRating value={review.rating} size={13} />
      {review.body && (
        <p className="text-xs text-espresso-400 dark:text-espresso-300 mt-1.5 line-clamp-2">{review.body}</p>
      )}
      {review.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {review.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] bg-cream-100 dark:bg-night-raised text-espresso-400 dark:text-espresso-300 px-1.5 py-0.5 rounded-full capitalize">
              {t.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </button>
  );
};

// ── Taste profile card ────────────────────────────────────────────────────────
const TasteProfileCard = ({ profile }) => {
  if (!profile?.reviewCount) return null;

  const topDrinks = Object.entries(profile.drinks || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topVibes = Object.entries(profile.vibes || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const DRINK_LABEL = {
    'great-espresso': 'Espresso', 'latte': 'Latte', 'great-pour-over': 'Pour Over',
    'cold-brew': 'Cold Brew', 'matcha': 'Matcha', 'cappuccino': 'Cappuccino',
    'flat-white': 'Flat White', 'americano': 'Americano', 'specialty-coffee': 'Specialty',
  };
  const VIBE_LABEL = {
    'cozy': 'Cozy', 'quiet': 'Quiet', 'laptop-friendly': 'Laptop-friendly',
    'outdoor-seating': 'Outdoor', 'good-wifi': 'Good WiFi', 'good-food': 'Good food',
    'fast-service': 'Fast service', 'good-value': 'Good value', 'loud': 'Lively',
  };

  return (
    <div className="bg-gradient-to-br from-espresso-400 to-roast-dark rounded-2xl p-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} />
        <p className="text-sm font-semibold">Your coffee profile</p>
        <span className="ml-auto text-[10px] opacity-60">{profile.reviewCount} reviews</span>
      </div>
      <div className="space-y-2">
        {topDrinks.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Drinks</p>
            <div className="flex gap-1.5 flex-wrap">
              {topDrinks.map(([tag, score]) => (
                <span key={tag} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {DRINK_LABEL[tag] ?? tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
        {topVibes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Vibes</p>
            <div className="flex gap-1.5 flex-wrap">
              {topVibes.map(([tag, score]) => (
                <span key={tag} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {VIBE_LABEL[tag] ?? tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
        {profile.avgPriceLevel != null && (
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">Usual spend</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {'$'.repeat(Math.round(profile.avgPriceLevel))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, icon, children, horizontal = false }) => (
  <div>
    <div className="flex items-center gap-2 px-4 mb-3">
      {icon}
      <h2 className="text-sm font-semibold text-roast-dark dark:text-cream-200">{title}</h2>
    </div>
    {horizontal ? (
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-1">{children}</div>
    ) : (
      <div className="px-4 space-y-2.5">{children}</div>
    )}
  </div>
);

// ── Main Feed page ────────────────────────────────────────────────────────────
const Feed = () => {
  const { user } = useAuth();
  const { location, loading: locationLoading } = useLocation();
  const { formatDistance } = useUnits();
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['feed', location?.lat, location?.lng],
    queryFn: () => feedApi.get(location.lat, location.lng),
    enabled: !!location,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  if (locationLoading || isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <Loader2 size={32} className="text-espresso-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-espresso-400">Building your feed…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen px-6">
      <p className="text-sm text-espresso-400 text-center">Failed to load feed. Please try again.</p>
    </div>
  );

  const {
    savedShops = [], forYou = [], becauseRows = [], recentReviews = [], newNearby = [],
    tasteProfile, feedSummary,
  } = data || {};

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-night pt-14 pb-24">
      {/* Greeting */}
      <div className="px-4 pt-5 pb-4">
        <h1 className="font-display text-2xl font-semibold text-roast-dark dark:text-cream-100">
          Hey, {user?.name?.split(' ')[0]} ☕
        </h1>
        {feedSummary ? (
          <p className="text-sm text-espresso-500 dark:text-espresso-300 mt-1 leading-relaxed">{feedSummary}</p>
        ) : (
          <p className="text-sm text-espresso-400 dark:text-espresso-400 mt-0.5">Here's what's brewing for you</p>
        )}
      </div>

      <div className="space-y-7">
        {/* Taste profile card */}
        {tasteProfile?.reviewCount > 0 && (
          <div className="px-4">
            <TasteProfileCard profile={tasteProfile} />
          </div>
        )}

        {/* Saved shops */}
        {savedShops.length > 0 && (
          <Section
            title="Saved"
            icon={<Bookmark size={15} className="text-espresso-400" />}
            horizontal
          >
            {savedShops.map((s) => (
              <SavedPill key={s.placeId} shop={s} onSelect={setSelectedPlaceId} />
            ))}
          </Section>
        )}

        {/* For you */}
        {forYou.length > 0 && (
          <Section
            title="For you"
            icon={<Star size={15} className="text-espresso-400" />}
            horizontal
          >
            {forYou.map((s) => (
              <FeedShopCard
                key={s.place_id}
                shop={s}
                onSelect={setSelectedPlaceId}
                formatDistance={formatDistance}
              />
            ))}
          </Section>
        )}

        {/* "Because you…" rows */}
        {becauseRows.map((row) => (
          <Section
            key={row.title}
            title={row.title}
            icon={<Sparkles size={15} className="text-espresso-400" />}
            horizontal
          >
            {row.shops.map((s) => (
              <FeedShopCard
                key={s.place_id}
                shop={s}
                onSelect={setSelectedPlaceId}
                formatDistance={formatDistance}
              />
            ))}
          </Section>
        ))}

        {/* Recently reviewed */}
        {recentReviews.length > 0 && (
          <Section
            title="Your recent visits"
            icon={<Clock size={15} className="text-espresso-400" />}
          >
            {recentReviews.map((r) => (
              <ReviewCard key={r._id} review={r} onSelect={setSelectedPlaceId} />
            ))}
          </Section>
        )}

        {/* New nearby */}
        {newNearby.length > 0 && (
          <Section
            title="New nearby"
            icon={<MapPin size={15} className="text-espresso-400" />}
            horizontal
          >
            {newNearby.map((s) => (
              <FeedShopCard
                key={s.place_id}
                shop={s}
                onSelect={setSelectedPlaceId}
                formatDistance={formatDistance}
              />
            ))}
          </Section>
        )}

        {/* Empty state */}
        {!tasteProfile?.reviewCount && forYou.length === 0 && recentReviews.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Coffee size={40} className="text-cream-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-espresso-400">Your feed is empty for now</p>
            <p className="text-xs text-espresso-300 mt-1">
              Discover and review coffee shops to personalise your feed
            </p>
          </div>
        )}
      </div>

      {selectedPlaceId && (
        <ShopDetail
          placeId={selectedPlaceId}
          onClose={() => setSelectedPlaceId(null)}
        />
      )}
    </div>
  );
};

export default Feed;
