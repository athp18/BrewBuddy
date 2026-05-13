import { MapPin, Clock, DollarSign, Bookmark } from 'lucide-react';
import StarRating from './StarRating';
import { usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUnits } from '../hooks/useUnits';
import { useState } from 'react';

const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

const ShopCard = ({ shop, onClick }) => {
  const { user, updateUser } = useAuth();
  const { formatDistance } = useUnits();
  const isSaved = user?.savedShops?.includes(shop.place_id);
  const [saved, setSaved] = useState(isSaved);
  const [savingLoading, setSavingLoading] = useState(false);

  const handleSave = async (e) => {
    e.stopPropagation();
    setSavingLoading(true);
    try {
      const { data } = await usersApi.toggleSaved(shop.place_id, {
        name: shop.name,
        photoUrl: shop.photos?.[0]?.url || '',
      });
      setSaved(data.saved);
      updateUser({ savedShops: data.savedShops });
    } catch {
      // fail silently
    } finally {
      setSavingLoading(false);
    }
  };

  const distanceLabel = shop.distanceM != null ? formatDistance(shop.distanceM) : null;

  const photo = shop.photos?.[0];

  return (
    <div
      onClick={() => onClick(shop)}
      className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 fade-up"
    >
      {/* Photo */}
      <div className="relative h-36 bg-cream-200 dark:bg-night-raised overflow-hidden">
        {photo ? (
          <img
            src={photo.url}
            alt={shop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream-400 text-xs">No photo</div>
        )}

        {/* Brew score badge */}
        {shop.brewScore != null && (
          <div className="absolute top-2 left-2 brew-score">
            ☕ {(shop.brewScore * 100).toFixed(0)}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={savingLoading}
          className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg
                     hover:bg-white transition-colors"
        >
          <Bookmark
            size={16}
            className={saved ? 'text-espresso-500 fill-espresso-500' : 'text-espresso-300'}
          />
        </button>

        {/* Open/Closed indicator */}
        {shop.opening_hours != null && (
          <div
            className={`absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full
              ${shop.opening_hours.open_now
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
              }`}
          >
            {shop.opening_hours.open_now ? 'Open' : 'Closed'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-sm text-roast-dark dark:text-cream-100 leading-snug line-clamp-1">
            {shop.name}
          </h3>
          {shop.price_level != null && (
            <span className="text-xs text-espresso-400 font-medium shrink-0">
              {PRICE_LABELS[shop.price_level]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-2">
          <StarRating value={shop.rating || 0} size={13} />
          <span className="text-xs text-espresso-400">
            {shop.rating?.toFixed(1)} ({shop.user_ratings_total?.toLocaleString() || 0})
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-espresso-300 dark:text-espresso-400">
          {distanceLabel && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {distanceLabel}
            </span>
          )}
          {shop.vicinity && (
            <span className="truncate">{shop.vicinity}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopCard;
