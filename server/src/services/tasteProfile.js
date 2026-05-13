import Review from '../models/Review.js';
import User from '../models/User.js';

const DRINK_TAGS = [
  'great-espresso', 'great-pour-over', 'specialty-coffee',
  'latte', 'cappuccino', 'cold-brew', 'matcha', 'flat-white', 'americano', 'cortado',
];

const VIBE_TAGS = [
  'cozy', 'quiet', 'loud', 'laptop-friendly', 'outdoor-seating',
  'fast-service', 'good-wifi', 'good-food', 'good-value',
];

/**
 * Recompute a user's dynamic taste profile from their full review history
 * and save it back onto the User document.
 *
 * Currently tracks: drink tag weights, vibe tag weights.
 * Distance and price are intentionally excluded — neither is reliably
 * available on a Review document. They'll be added in a later pass
 * once we decide on a clean data source (e.g. caching shop metadata
 * at review time).
 *
 * @param {string|ObjectId} userId
 */
export const recomputeTasteProfile = async (userId) => {
  const reviews = await Review.find({ user: userId }).lean();
  if (!reviews.length) return;

  // Higher-rated reviews carry more weight: 1★ = 0.2, 5★ = 1.0
  const ratingWeight = (r) => r.rating / 5;

  const drinkScores = {};
  const vibeScores  = {};

  // Explicit user tags carry full weight; Google-inferred signals carry 0.4×
  // (they tell us what the shop is known for, not what the user explicitly chose)
  const GOOGLE_WEIGHT = 0.4;

  for (const review of reviews) {
    const w = ratingWeight(review);

    for (const tag of review.tags) {
      if (DRINK_TAGS.includes(tag)) drinkScores[tag] = (drinkScores[tag] || 0) + w;
      if (VIBE_TAGS.includes(tag))  vibeScores[tag]  = (vibeScores[tag]  || 0) + w;
    }

    for (const tag of (review.googleDrinkSignals || [])) {
      if (DRINK_TAGS.includes(tag)) drinkScores[tag] = (drinkScores[tag] || 0) + w * GOOGLE_WEIGHT;
    }
    for (const tag of (review.googleVibeSignals || [])) {
      if (VIBE_TAGS.includes(tag))  vibeScores[tag]  = (vibeScores[tag]  || 0) + w * GOOGLE_WEIGHT;
    }
  }

  // Normalise scores to 0–1 relative to the highest observed value
  const normalise = (scores) => {
    const max = Math.max(...Object.values(scores), 1);
    return Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, parseFloat((v / max).toFixed(3))])
    );
  };

  // Average price level from snapshotted shop data (only reviews where we captured it)
  const priceReviews = reviews.filter((r) => r.shopPriceLevel != null);
  const avgPriceLevel = priceReviews.length > 0
    ? parseFloat(
        (priceReviews.reduce((sum, r) => sum + r.shopPriceLevel, 0) / priceReviews.length).toFixed(2)
      )
    : null;

  await User.findByIdAndUpdate(userId, {
    'tasteProfile.drinks':        normalise(drinkScores),
    'tasteProfile.vibes':         normalise(vibeScores),
    'tasteProfile.avgPriceLevel': avgPriceLevel,
    'tasteProfile.reviewCount':   reviews.length,
    'tasteProfile.lastUpdated':   new Date(),
  });
};
