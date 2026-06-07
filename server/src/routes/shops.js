import { Router } from 'express';
import protect from '../middleware/auth.js';
import { nearbyCoffeeShops, placeDetails, textSearch, photoUrl, cachePhotoReferences } from '../services/googlePlaces.js';
import { scoreShops, predictRating, distanceMeters } from '../services/recommendations.js';
import { parseTagsFromGoogleReviews, extractTagStrings, GOOGLE_DRINK_KEYWORDS, GOOGLE_VIBE_KEYWORDS } from '../services/parsers.js';
import Review from '../models/Review.js';
import ShopMeta from '../models/ShopMeta.js';

const router = Router();

/**
 * GET /api/shops/nearby
 * Query params: lat, lng, radius (metres), pagetoken
 * Returns shops ranked by brewScore for authenticated users,
 * or by Google rating for unauthenticated.
 */
router.get('/nearby', protect, async (req, res, next) => {
  try {
    const { lat, lng, radius = 3000, pagetoken } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });

    const { results, nextPageToken } = await nearbyCoffeeShops(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      pagetoken
    );

    cachePhotoReferences(results);

    // Score and rank for this user
    const ranked = await scoreShops(results, req.user, parseFloat(lat), parseFloat(lng));

    // Attach photo URLs server-side so the client never needs the Places API key
    const shopsWithPhotos = ranked.map((shop) => ({
      ...shop,
      photos: (shop.photos || [])
        .filter((p) => p.photo_reference)
        .slice(0, 1)
        .map((p) => ({
          url: photoUrl(p.photo_reference, 400),
          attribution: p.html_attributions?.[0] || '',
        })),
    }));

    res.json({ shops: shopsWithPhotos, nextPageToken });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/shops/search
 * Query params: q, lat (optional), lng (optional)
 * No radius restriction — lat/lng are a soft location bias only.
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q, lat, lng } = req.query;
    if (!q) return res.status(400).json({ message: 'Query (q) is required' });

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const results = await textSearch(q, parsedLat, parsedLng);
    cachePhotoReferences(results);
    const hasLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);

    const shopsWithPhotos = results.map((shop) => ({
      ...shop,
      ...(hasLocation && shop.geometry?.location
        ? {
            distanceM: Math.round(distanceMeters(
              parsedLat,
              parsedLng,
              shop.geometry.location.lat,
              shop.geometry.location.lng
            )),
          }
        : {}),
      photos: (shop.photos || [])
        .filter((p) => p.photo_reference)
        .slice(0, 1)
        .map((p) => ({
          url: photoUrl(p.photo_reference, 400),
          attribution: p.html_attributions?.[0] || '',
        })),
    }));

    res.json({ shops: shopsWithPhotos });
  } catch (err) {
    next(err);
  }
});

const DRINK_TAGS = [
  'great-espresso', 'great-pour-over', 'specialty-coffee',
  'latte', 'cappuccino', 'cold-brew', 'matcha', 'flat-white', 'americano',
];

const VIBE_TAGS = [
  'cozy', 'quiet', 'loud', 'laptop-friendly', 'outdoor-seating',
  'fast-service', 'good-wifi', 'good-food', 'good-value',
];

/**
 * GET /api/shops/:placeId
 * Returns full place details + brewScore prediction + user's past review +
 * recent community reviews + top drink tags.
 */
router.get('/:placeId', protect, async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const [shop, userReview, communityReviews, allBrewBuddyReviews] = await Promise.all([
      placeDetails(placeId),
      Review.findOne({ user: req.user._id, placeId }),
      Review.find({ placeId })
        .populate('user', 'name username avatar')
        .sort('-createdAt')
        .limit(5)
        .lean(),
      Review.find({ placeId }).select('tags').lean(),
    ]);

    const predicted = await predictRating(req.user._id, shop);

    // Attach photo URLs to the first 5 photos
    const photos = (shop.photos || []).slice(0, 5).map((p) => ({
      url: photoUrl(p.photo_reference, 800),
      attribution: p.html_attributions?.[0] || '',
    }));

    // Helper: tally BrewBuddy tags for a given allowed set
    const tallyBrewBuddyTags = (allowedSet) => {
      const counts = {};
      allBrewBuddyReviews.forEach((r) => {
        r.tags.forEach((tag) => {
          if (allowedSet.includes(tag)) counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));
    };

    // 1. Top drinks — BrewBuddy tags first, Google review parsing as fallback
    let topDrinks = tallyBrewBuddyTags(DRINK_TAGS);
    let topDrinksSource = 'brewbuddy';
    if (topDrinks.length === 0 && shop.reviews?.length > 0) {
      topDrinks = parseTagsFromGoogleReviews(shop.reviews, GOOGLE_DRINK_KEYWORDS);
      topDrinksSource = 'google';
    }

    // 2. Top vibes — same pattern
    let topVibes = tallyBrewBuddyTags(VIBE_TAGS);
    let topVibesSource = 'brewbuddy';
    if (topVibes.length === 0 && shop.reviews?.length > 0) {
      topVibes = parseTagsFromGoogleReviews(shop.reviews, GOOGLE_VIBE_KEYWORDS);
      topVibesSource = 'google';
    }

    // Cache Google signals in ShopMeta so the recommendation engine can use them
    // even for shops no one has BrewBuddy-reviewed yet. Fire-and-forget.
    if (shop.reviews?.length > 0) {
      const drinkSignals = extractTagStrings(shop.reviews, GOOGLE_DRINK_KEYWORDS);
      const vibeSignals  = extractTagStrings(shop.reviews, GOOGLE_VIBE_KEYWORDS);
      ShopMeta.findOneAndUpdate(
        { placeId },
        { $set: { googleDrinkSignals: drinkSignals, googleVibeSignals: vibeSignals, signalsCachedAt: new Date(), updatedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
    }

    // Strip raw Google reviews from the shop object before sending to client
    const { reviews: _googleReviews, ...shopWithoutReviews } = shop;

    res.json({
      shop: { ...shopWithoutReviews, photos },
      predicted,
      userReview,
      communityReviews,
      topDrinks,
      topDrinksSource,
      topVibes,
      topVibesSource,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/shops/:placeId/reviews
 * All BrewBuddy user reviews for this shop
 */
router.get('/:placeId/reviews', protect, async (req, res, next) => {
  try {
    const reviews = await Review.find({ placeId: req.params.placeId })
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .lean();
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

export default router;
