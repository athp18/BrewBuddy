import { useState } from 'react';
import { X } from 'lucide-react';
import StarRating from './StarRating';
import { reviewsApi } from '../services/api';

const VIBE_TAGS = [
  'cozy', 'quiet', 'loud', 'laptop-friendly', 'outdoor-seating',
  'fast-service', 'good-wifi', 'good-food', 'good-value',
];

const DRINK_TAGS = [
  'great-espresso', 'great-pour-over', 'specialty-coffee',
  'latte', 'cappuccino', 'cold-brew', 'matcha', 'flat-white', 'americano',
];

const ReviewModal = ({ shop, existing, onClose, onSaved }) => {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [tags, setTags] = useState(existing?.tags || []);
  const [body, setBody] = useState(existing?.body || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag) =>
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating'); return; }
    setSaving(true);
    try {
      const { data } = await reviewsApi.create({
        placeId: shop.place_id,
        shopName: shop.name,
        rating,
        tags,
        body,
      });
      onSaved(data.review);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-night-surface rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-cream-200 dark:border-night-border sticky top-0 bg-white dark:bg-night-surface rounded-t-3xl">
          <div>
            <h3 className="font-display font-semibold text-roast-dark dark:text-cream-100">{shop.name}</h3>
            <p className="text-xs text-espresso-400 dark:text-espresso-300">Write your review</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-cream-100 dark:hover:bg-night-raised rounded-xl transition-colors">
            <X size={18} className="text-espresso-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Star rating */}
          <div>
            <p className="text-sm font-medium text-roast-mid dark:text-cream-200 mb-2">Overall rating</p>
            <StarRating value={rating} interactive onChange={setRating} size={28} />
          </div>

          {/* Vibe tags */}
          <div>
            <p className="text-sm font-medium text-roast-mid dark:text-cream-200 mb-2">What was the vibe? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`tag capitalize transition-colors ${
                    tags.includes(t) ? 'bg-espresso-400 text-white border-espresso-400' : ''
                  }`}
                >
                  {t.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Drink tags */}
          <div>
            <p className="text-sm font-medium text-roast-mid dark:text-cream-200 mb-2">What did you order? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {DRINK_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`tag capitalize transition-colors ${
                    tags.includes(t) ? 'bg-espresso-400 text-white border-espresso-400' : ''
                  }`}
                >
                  {t.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-sm font-medium text-roast-mid dark:text-cream-200 mb-2">Tell us more (optional)</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What made this visit memorable?"
              className="input resize-none"
            />
            <p className="text-xs text-espresso-300 text-right mt-1">{body.length}/500</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving || rating === 0}
            className="btn-primary w-full"
          >
            {saving ? 'Saving…' : existing ? 'Update review' : 'Submit review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
