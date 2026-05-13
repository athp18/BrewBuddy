import Review from '../models/Review.js';

/**
 * Score a list of Google Places results for a given user.
 *
 * Scoring factors (all normalised to 0–1):
 *   1. Google rating          — weight 0.30
 *   2. Distance               — weight 0.25  (closer = higher score)
 *   3. Drink/vibe match       — weight 0.20  (user's preference tags vs. shop's known tags)
 *   4. Price preference match — weight 0.15  (user's preferred price range)
 *   5. Past review sentiment  — weight 0.10  (avg user rating as a quality signal)
 *
 * Tag match is now shop-aware: it compares the user's drink/vibe preference tags
 * against tags that BrewBuddy reviewers have actually applied to *that shop*.
 * For shops with no BrewBuddy reviews yet, the score is neutral (0.5).
 *
 * Returns the same array, sorted by descending score, with a `brewScore` field added.
 */
export const scoreShops = async (shops, user, userLat, userLng) => {
  const pastReviews = await Review.find({ user: user._id }).lean();

  const avgUserRating =
    pastReviews.length > 0
      ? pastReviews.reduce((sum, r) => sum + r.rating, 0) / pastReviews.length
      : 3.5;

  // --- Per-shop tag maps from BrewBuddy community reviews ---
  // One bulk query for all shops being scored; avoids N+1 queries.
  //
  // Google signal weight decays as BrewBuddy review count grows:
  //   googleWeight(n) = 0.4 × max(0, 1 − n / GOOGLE_DECAY_AT)
  //   At 0 BrewBuddy reviews  → Google signals at full 0.4×
  //   At 5 BrewBuddy reviews  → 0.2×
  //   At 10+ BrewBuddy reviews → 0× (pure community data, Google no longer needed)
  const GOOGLE_WEIGHT_MAX  = 0.4;
  const GOOGLE_DECAY_AT    = 10; // reviews until Google signals are fully phased out

  const shopIds = shops.map((s) => s.place_id).filter(Boolean);
  const communityReviews = shopIds.length
    ? await Review.find({ placeId: { $in: shopIds } })
        .select('placeId tags googleDrinkSignals googleVibeSignals')
        .lean()
    : [];

  // First pass: count explicit BrewBuddy tags per shop (before mixing in Google signals)
  const brewbuddyReviewCount = {}; // placeId → number of BrewBuddy reviews
  const shopTagFreq = {};          // placeId → { tag: weightedCount }

  communityReviews.forEach((r) => {
    brewbuddyReviewCount[r.placeId] = (brewbuddyReviewCount[r.placeId] || 0) + 1;
    if (!shopTagFreq[r.placeId]) shopTagFreq[r.placeId] = {};
    const freq = shopTagFreq[r.placeId];
    r.tags.forEach((tag) => { freq[tag] = (freq[tag] || 0) + 1; });
  });

  // Second pass: add Google signals at their dynamic (decayed) weight
  communityReviews.forEach((r) => {
    const n = brewbuddyReviewCount[r.placeId] || 0;
    const googleWeight = GOOGLE_WEIGHT_MAX * Math.max(0, 1 - n / GOOGLE_DECAY_AT);
    if (googleWeight === 0) return; // no point iterating once fully decayed

    const freq = shopTagFreq[r.placeId];
    (r.googleDrinkSignals || []).forEach((tag) => { freq[tag] = (freq[tag] || 0) + googleWeight; });
    (r.googleVibeSignals  || []).forEach((tag) => { freq[tag] = (freq[tag] || 0) + googleWeight; });
  });

  // --- Dynamic taste profile (computed from full review history) ---
  // Falls back to static preferences when not yet built (new users).
  const tp = user.tasteProfile || {};
  const hasProfile = (tp.reviewCount || 0) > 0;

  // Merge all known preference tags from both dynamic profile and static preferences
  const vibeToTagMap = {
    cozy: ['cozy'],
    'laptop-friendly': ['laptop-friendly', 'good-wifi', 'quiet'],
    quiet: ['quiet'],
    lively: ['loud'],
    fast: ['fast-service'],
    specialty: ['specialty-coffee', 'great-espresso', 'great-pour-over'],
  };
  const staticVibeTags = (user.preferences?.vibes || []).flatMap((v) => vibeToTagMap[v] || []);

  // Dynamic profile tags: union of top drink + vibe keys with score ≥ 0.3
  const dynamicTags = hasProfile
    ? [
        ...Object.entries(tp.drinks || {}).filter(([, s]) => s >= 0.3).map(([t]) => t),
        ...Object.entries(tp.vibes  || {}).filter(([, s]) => s >= 0.3).map(([t]) => t),
      ]
    : [];

  const allPreferenceTags = [...new Set([...staticVibeTags, ...dynamicTags])];

  // Past 4+ star reviews — used for "Because you liked [shop]" matching
  const pastGoodReviews = pastReviews.filter((r) => r.rating >= 4);

  const scored = shops.map((shop) => {
    // 1. Google rating score (30%)
    const ratingScore = shop.rating ? shop.rating / 5 : 0.5;

    // 2. Distance score (25%)
    const distanceM = distanceMeters(
      userLat, userLng,
      shop.geometry.location.lat,
      shop.geometry.location.lng
    );
    const maxDist = user.preferences?.maxDistance || 5000;
    const distanceScore = Math.max(0, 1 - distanceM / maxDist);

    // 3. Drink/vibe match score (20%)
    // Compare the user's preference tags against *this shop's* community-reviewed tags.
    // A latte lover gets a boost at shops where reviewers have tagged lattes, not everywhere.
    // Falls back to 0.5 (neutral) when the shop has no BrewBuddy reviews yet.
    let tagScore = 0.5; // neutral default for shops with no community data
    const shopFreq = shopTagFreq[shop.place_id];
    if (allPreferenceTags.length > 0 && shopFreq) {
      const matches = allPreferenceTags.reduce((sum, t) => sum + (shopFreq[t] ? 1 : 0), 0);
      tagScore = matches / allPreferenceTags.length;
    }

    // 4. Price score (15%)
    // Prefer dynamic revealed price level; fall back to static priceRange preference.
    let priceScore = 0.5;
    if (shop.price_level != null) {
      if (hasProfile && tp.avgPriceLevel != null) {
        // Revealed preference: penalise proportionally to distance from avg
        const diff = Math.abs(shop.price_level - tp.avgPriceLevel);
        priceScore = Math.max(0, 1 - diff * 0.4);
      } else {
        const userPriceRange = user.preferences?.priceRange || [1, 4];
        const [minP, maxP] = [Math.min(...userPriceRange), Math.max(...userPriceRange)];
        priceScore = shop.price_level >= minP && shop.price_level <= maxP ? 1 : 0.1;
      }
    }

    // 5. Sentiment score (10%)
    const sentimentScore = avgUserRating >= 4 ? ratingScore : ratingScore * 0.8;

    const brewScore =
      0.30 * ratingScore +
      0.25 * distanceScore +
      0.20 * tagScore +
      0.15 * priceScore +
      0.10 * sentimentScore;

    const brewReason = deriveBrewReason(
      shop, shopFreq, allPreferenceTags, pastGoodReviews, distanceScore
    );

    // Tags the user prefers that this shop is actually known for (sorted by strength)
    const matchedDrinks = shopFreq
      ? allPreferenceTags
          .filter((t) => DRINK_TAGS_SET.has(t) && shopFreq[t] > 0)
          .sort((a, b) => (shopFreq[b] || 0) - (shopFreq[a] || 0))
      : [];

    // Best-matching past liked shop (≥2 overlapping tags)
    let similarTo = null;
    if (shopFreq) {
      let bestShop = null, bestOverlap = 1;
      pastGoodReviews.forEach((r) => {
        const overlap = r.tags.filter((t) => shopFreq[t] > 0).length;
        if (overlap > bestOverlap) { bestOverlap = overlap; bestShop = r.shopName; }
      });
      if (bestShop) similarTo = bestShop;
    }

    return {
      ...shop,
      brewScore: Math.round(brewScore * 100) / 100,
      distanceM: Math.round(distanceM),
      brewReason,
      matchedDrinks,
      similarTo,
    };
  });

  return scored.sort((a, b) => b.brewScore - a.brewScore);
};

/**
 * Predict what a user would rate a shop, based on their history.
 * Returns a number 1–5 (or null if not enough data).
 */
export const predictRating = async (userId, shop) => {
  const reviews = await Review.find({ user: userId }).lean();
  if (reviews.length < 3) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const googleNorm = shop.rating ? shop.rating / 5 : 0.7;

  // Simple weighted blend: user average × 0.6 + google rating × 0.4
  const predicted = avg * 0.6 + googleNorm * 5 * 0.4;
  return Math.round(predicted * 10) / 10;
};

// ── "Because you…" reason derivation ────────────────────────────────────────
const DRINK_TAGS_SET = new Set([
  'latte', 'cappuccino', 'cold-brew', 'matcha', 'flat-white', 'americano',
  'cortado', 'great-espresso', 'great-pour-over', 'specialty-coffee',
]);
const VIBE_TAGS_SET = new Set([
  'cozy', 'quiet', 'loud', 'laptop-friendly', 'outdoor-seating',
  'fast-service', 'good-wifi', 'good-food', 'good-value',
]);
const DRINK_REASON_LABEL = {
  latte: 'lattes', cappuccino: 'cappuccinos', 'cold-brew': 'cold brew',
  matcha: 'matcha', 'flat-white': 'flat whites', americano: 'americanos',
  cortado: 'cortados', 'great-espresso': 'great espresso',
  'great-pour-over': 'pour overs', 'specialty-coffee': 'specialty coffee',
};
const VIBE_REASON_LABEL = {
  cozy: 'cozy spots', quiet: 'quiet spots', loud: 'lively spots',
  'laptop-friendly': 'laptop-friendly spots', 'outdoor-seating': 'spots with outdoor seating',
  'fast-service': 'fast service', 'good-wifi': 'good WiFi',
  'good-food': 'great food', 'good-value': 'good value',
};

/**
 * Derive a human-readable reason for why a shop is being recommended.
 * Priority: drink match → similar liked shop → vibe match → proximity → high rating
 */
function deriveBrewReason(shop, shopFreq, allPreferenceTags, pastGoodReviews, distanceScore) {
  if (shopFreq) {
    // 1. Drink match — most specific: user likes lattes, shop is known for lattes
    const matchedDrink = allPreferenceTags
      .filter((t) => DRINK_TAGS_SET.has(t) && shopFreq[t] > 0)
      .sort((a, b) => (shopFreq[b] || 0) - (shopFreq[a] || 0))[0];
    if (matchedDrink) {
      return `Because you like ${DRINK_REASON_LABEL[matchedDrink] || matchedDrink.replace(/-/g, ' ')}`;
    }

    // 2. Similar to a liked shop — find the best overlapping past 4★+ review
    let bestShopName = null;
    let bestOverlap = 1; // require at least 2 overlapping tags to avoid spurious matches
    pastGoodReviews.forEach((r) => {
      const overlap = r.tags.filter((t) => shopFreq[t] > 0).length;
      if (overlap > bestOverlap) { bestOverlap = overlap; bestShopName = r.shopName; }
    });
    if (bestShopName) return `Because you liked ${bestShopName}`;

    // 3. Vibe match
    const matchedVibe = allPreferenceTags
      .filter((t) => VIBE_TAGS_SET.has(t) && shopFreq[t] > 0)
      .sort((a, b) => (shopFreq[b] || 0) - (shopFreq[a] || 0))[0];
    if (matchedVibe) {
      return `Because you like ${VIBE_REASON_LABEL[matchedVibe] || matchedVibe.replace(/-/g, ' ')}`;
    }
  }

  // 4. Proximity (within ~40% of the user's max distance)
  if (distanceScore > 0.6) return "Because it's close to you";

  // 5. Google rating fallback — most good coffee shops sit 4.0–4.4
  if (shop.rating >= 4.3) return `Rated ${shop.rating?.toFixed(1)} on Google`;
  if (shop.rating >= 4.0) return 'Well-rated nearby';

  // 6. Catch-all — something always shows
  return 'Popular nearby';
}

// Haversine formula — returns distance in metres
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
