import { useEffect, useState } from 'react';
import { X, MapPin, Phone, Globe, Clock, Bookmark, ChevronRight, Navigation, Coffee, Sparkles } from 'lucide-react';
import StarRating from './StarRating';
import ReviewModal from './ReviewModal';
import { shopsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUnits } from '../hooks/useUnits';

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
  'outdoor-seating': 'Outdoor seating',
  'fast-service':    'Fast service',
  'good-wifi':       'Good WiFi',
  'good-food':       'Good food',
  'good-value':      'Good value',
};

const getDirectionsUrl = (shop) => {
  const lat = shop.geometry?.location?.lat;
  const lng = shop.geometry?.location?.lng;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(shop.name)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(shop.place_id)}`;
};

// Prefer @username, fall back to "First L."
const displayName = (user = {}) => {
  if (user.username) return `@${user.username}`;
  const parts = (user.name || '').trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// Time-ago helper
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const ShopDetail = ({ placeId, distanceM, onClose }) => {
  const { user, updateUser } = useAuth();
  const { formatDistance } = useUnits();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [saved, setSaved] = useState(user?.savedShops?.includes(placeId));

  useEffect(() => {
    setLoading(true);
    shopsApi.detail(placeId)
      .then(({ data: d }) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [placeId]);

  const handleSave = async () => {
    try {
      const meta = data?.shop ? {
        name: data.shop.name,
        photoUrl: data.shop.photos?.[0]?.url || '',
      } : {};
      const { data: d } = await usersApi.toggleSaved(placeId, meta);
      setSaved(d.saved);
      updateUser({ savedShops: d.savedShops });
    } catch { /* noop */ }
  };

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-30" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white dark:bg-night-surface shadow-2xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-espresso-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!data) return null;
  const {
    shop, predicted, userReview,
    communityReviews = [],
    topDrinks = [], topDrinksSource,
    topVibes = [],  topVibesSource,
  } = data;
  const todayIdx = new Date().getDay();

  return (
    <>
      {/* Invisible backdrop — click anywhere outside the panel to close */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white dark:bg-night-surface shadow-2xl flex flex-col overflow-hidden">
        {/* Photo carousel */}
        <div className="relative h-52 bg-cream-200 dark:bg-night-raised shrink-0">
          {shop.photos?.length > 0 ? (
            <>
              <img
                src={shop.photos[activePhoto]?.url}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
              {shop.photos.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {shop.photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors
                        ${i === activePhoto ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cream-400">No photos</div>
          )}

          {/* Top controls */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 p-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition-colors"
          >
            <X size={18} className="text-roast-mid" />
          </button>
          <button
            onClick={handleSave}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-xl hover:bg-white transition-colors"
          >
            <Bookmark size={18} className={saved ? 'text-espresso-500 fill-espresso-500' : 'text-espresso-300'} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-roast-dark dark:text-cream-100">{shop.name}</h2>
              {shop.price_level && (
                <span className="tag shrink-0">{'$'.repeat(shop.price_level)}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <StarRating value={shop.rating || 0} size={15} />
              <span className="text-sm text-espresso-400">
                {shop.rating?.toFixed(1)} · {shop.user_ratings_total?.toLocaleString()} ratings
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {shop.opening_hours != null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                  ${shop.opening_hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {shop.opening_hours.open_now ? 'Open now' : 'Closed'}
                </span>
              )}
              {distanceM != null && (
                <span className="flex items-center gap-1 text-xs text-espresso-400">
                  <Navigation size={12} className="shrink-0" />
                  {formatDistance(distanceM)} away
                </span>
              )}
            </div>
          </div>

          {/* Predicted rating */}
          {predicted && (
            <div className="bg-cream-100 dark:bg-night-raised rounded-2xl p-4 border border-cream-200 dark:border-night-border">
              <p className="text-xs text-espresso-400 dark:text-espresso-300 mb-1">Based on your taste profile</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-display font-semibold text-espresso-500">{predicted}</span>
                <StarRating value={predicted} size={18} />
                <span className="text-sm text-espresso-400">predicted for you</span>
              </div>
            </div>
          )}

          {/* Top drinks */}
          {topDrinks.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Coffee size={15} className="text-espresso-400" />
                <p className="text-sm font-medium text-roast-mid dark:text-cream-200">
                  {topDrinksSource === 'google' ? 'Recommended drinks' : 'Regulars order'}
                </p>
                {topDrinksSource === 'google' && (
                  <span className="text-[10px] text-espresso-300 bg-cream-100 dark:bg-night-raised px-1.5 py-0.5 rounded-full border border-cream-200 dark:border-night-border">
                    Google
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {topDrinks.map(({ tag, count }) => (
                  <div key={tag}
                    className="flex items-center gap-1.5 bg-cream-100 dark:bg-night-raised border border-cream-200 dark:border-night-border rounded-full px-3 py-1">
                    <span className="text-xs font-medium text-espresso-500 dark:text-espresso-200">
                      {DRINK_LABEL[tag] ?? tag.replace(/-/g, ' ')}
                    </span>
                    <span className="text-[10px] text-espresso-300 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top vibes */}
          {topVibes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles size={15} className="text-espresso-400" />
                <p className="text-sm font-medium text-roast-mid dark:text-cream-200">
                  {topVibesSource === 'google' ? 'Vibe from reviews' : 'The vibe'}
                </p>
                {topVibesSource === 'google' && (
                  <span className="text-[10px] text-espresso-300 bg-cream-100 dark:bg-night-raised px-1.5 py-0.5 rounded-full border border-cream-200 dark:border-night-border">
                    Google
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {topVibes.map(({ tag, count }) => (
                  <div key={tag}
                    className="flex items-center gap-1.5 bg-cream-100 dark:bg-night-raised border border-cream-200 dark:border-night-border rounded-full px-3 py-1">
                    <span className="text-xs font-medium text-espresso-500 dark:text-espresso-200">
                      {VIBE_LABEL[tag] ?? tag.replace(/-/g, ' ')}
                    </span>
                    <span className="text-[10px] text-espresso-300 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="space-y-2.5">
            {shop.formatted_address && (
              <div className="flex items-start gap-2.5 text-sm text-roast-mid dark:text-cream-200">
                <MapPin size={16} className="text-espresso-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span>{shop.formatted_address}</span>
                  <a
                    href={getDirectionsUrl(shop)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-espresso-500
                               bg-cream-100 dark:bg-night-raised border border-cream-200 dark:border-night-border
                               px-2.5 py-1 rounded-lg hover:bg-cream-200 dark:hover:bg-night-border transition-colors"
                  >
                    <Navigation size={11} />
                    Get directions
                  </a>
                </div>
              </div>
            )}
            {shop.formatted_phone_number && (
              <div className="flex items-center gap-2.5 text-sm text-roast-mid dark:text-cream-200">
                <Phone size={16} className="text-espresso-400 shrink-0" />
                <a href={`tel:${shop.formatted_phone_number}`} className="hover:text-espresso-500 transition-colors">
                  {shop.formatted_phone_number}
                </a>
              </div>
            )}
            {shop.website && (
              <div className="flex items-center gap-2.5 text-sm text-roast-mid dark:text-cream-200">
                <Globe size={16} className="text-espresso-400 shrink-0" />
                <a href={shop.website} target="_blank" rel="noreferrer" className="hover:text-espresso-500 transition-colors truncate">
                  {shop.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Hours */}
          {shop.opening_hours?.weekday_text?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={15} className="text-espresso-400" />
                <p className="text-sm font-medium text-roast-mid dark:text-cream-200">Hours</p>
              </div>
              <div className="space-y-1">
                {shop.opening_hours.weekday_text.map((line, i) => (
                  <p key={i} className={`text-xs ${i === todayIdx ? 'text-espresso-500 font-medium' : 'text-espresso-300'}`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Recent BrewBuddy reviews */}
          {communityReviews.length > 0 && (
            <div>
              <p className="text-sm font-medium text-roast-mid mb-2.5">
                BrewBuddy reviews
                <span className="ml-1.5 text-xs font-normal text-espresso-300">
                  ({communityReviews.length} recent)
                </span>
              </p>
              <div className="space-y-2.5">
                {communityReviews.map((r) => (
                  <div key={r._id} className="bg-cream-50 dark:bg-night-raised rounded-xl p-3 border border-cream-200 dark:border-night-border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-espresso-200 dark:bg-night-border flex items-center justify-center text-[10px] font-bold text-espresso-600 dark:text-espresso-200 overflow-hidden shrink-0">
                          {r.user?.avatar
                            ? <img src={r.user.avatar} alt="" className="w-full h-full object-cover" />
                            : (r.user?.name?.[0] ?? '?').toUpperCase()
                          }
                        </div>
                        <span className="text-xs font-medium text-roast-mid dark:text-cream-200">
                          {displayName(r.user ?? {})}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={r.rating} size={11} />
                        <span className="text-[10px] text-espresso-300">{timeAgo(r.createdAt)}</span>
                      </div>
                    </div>
                    {r.body && (
                      <p className="text-xs text-roast-mid mt-1 line-clamp-2">{r.body}</p>
                    )}
                    {r.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.tags.map((t) => (
                          <span key={t} className="text-[10px] bg-cream-200 text-espresso-400 px-1.5 py-0.5 rounded-full capitalize">
                            {DRINK_LABEL[t] ?? t.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your review */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-roast-mid dark:text-cream-200">Your review</p>
              <button
                onClick={() => setShowReview(true)}
                className="flex items-center gap-1 text-xs text-espresso-400 hover:text-espresso-600 transition-colors"
              >
                {userReview ? 'Edit' : 'Write'} <ChevronRight size={13} />
              </button>
            </div>
            {userReview ? (
              <div className="bg-cream-50 dark:bg-night-raised rounded-xl p-3 border border-cream-200 dark:border-night-border">
                <StarRating value={userReview.rating} size={14} />
                {userReview.body && <p className="text-sm text-roast-mid dark:text-cream-200 mt-1">{userReview.body}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {userReview.tags?.map((t) => (
                    <span key={t} className="tag text-xs capitalize">
                      {DRINK_LABEL[t] ?? t.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-cream-300 dark:border-night-border text-espresso-300 dark:text-espresso-500 text-sm hover:border-espresso-300 hover:text-espresso-400 transition-colors"
              >
                How was your experience here?
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-cream-200 dark:border-night-border shrink-0">
          <button onClick={() => setShowReview(true)} className="btn-primary w-full">
            {userReview ? 'Update review' : 'Leave a review'}
          </button>
        </div>
      </div>

      {showReview && (
        <ReviewModal
          shop={shop}
          existing={userReview}
          onClose={() => setShowReview(false)}
          onSaved={(review) => {
            setData((d) => ({ ...d, userReview: review }));
            setShowReview(false);
          }}
          onDeleted={() => {
            setData((d) => ({ ...d, userReview: null }));
            setShowReview(false);
          }}
        />
      )}
    </>
  );
};

export default ShopDetail;
