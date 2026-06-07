/**
 * Keyword maps and parser for extracting drink/vibe signals from
 * free-text Google review bodies.
 *
 * Used by:
 *   - routes/shops.js   (ShopDetail display)
 *   - routes/reviews.js (background enrichment on review save)
 */

export const GOOGLE_DRINK_KEYWORDS = [
  ['great-espresso',  ['espresso']],
  ['latte',           ['latte']],
  ['great-pour-over', ['pour over', 'pourover', 'pour-over', 'v60', 'chemex', 'aeropress', 'filter coffee']],
  ['cold-brew',       ['cold brew', 'cold-brew', 'cold brew coffee']],
  ['matcha',          ['matcha']],
  ['cappuccino',      ['cappuccino']],
  ['flat-white',      ['flat white', 'flat-white']],
  ['americano',       ['americano']],
  ['cortado',         ['cortado']],
  ['specialty-coffee',['specialty coffee', 'single origin', 'single-origin', 'third wave']],
];

export const GOOGLE_VIBE_KEYWORDS = [
  ['cozy',            ['cozy', 'cosy', 'warm', 'homey', 'snug', 'comfortable', 'charming']],
  ['quiet',           ['quiet', 'peaceful', 'calm', 'tranquil', 'serene', 'relaxing']],
  ['loud',            ['loud', 'noisy', 'busy', 'crowded', 'lively', 'bustling', 'packed']],
  ['laptop-friendly', ['laptop', 'remote work', 'working', 'outlet', 'outlets', 'plug in', 'work here']],
  ['outdoor-seating', ['outdoor', 'outside', 'patio', 'terrace', 'al fresco', 'garden', 'sidewalk']],
  ['fast-service',    ['fast', 'quick', 'speedy', 'efficient', 'prompt', 'quick service']],
  ['good-wifi',       ['wifi', 'wi-fi', 'internet', 'wireless', 'good connection']],
  ['good-food',       ['food', 'pastry', 'pastries', 'sandwich', 'bagel', 'croissant', 'snack', 'baked']],
  ['good-value',      ['cheap', 'affordable', 'value', 'reasonable', 'inexpensive', 'worth it', 'good price']],
];

/**
 * Scan Google review texts against a keyword map.
 * @param {Array}  googleReviews  — array of { text: string } objects
 * @param {Array}  keywordMap     — one of GOOGLE_DRINK_KEYWORDS / GOOGLE_VIBE_KEYWORDS
 * @param {number} [limit=5]     — max results
 * @returns Array of { tag, count } sorted by count desc
 */
export const parseTagsFromGoogleReviews = (googleReviews = [], keywordMap, limit = 5) => {
  const counts = {};
  for (const review of googleReviews) {
    const text = (review.text || '').toLowerCase();
    for (const [tag, keywords] of keywordMap) {
      if (keywords.some((kw) => text.includes(kw))) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
};

/**
 * Convenience: return just the tag strings (no counts), used when
 * storing signals on a Review document.
 */
export const extractTagStrings = (googleReviews = [], keywordMap) =>
  parseTagsFromGoogleReviews(googleReviews, keywordMap, 10).map((r) => r.tag);
