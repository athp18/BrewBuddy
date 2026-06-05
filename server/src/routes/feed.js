import { Router } from 'express';
import protect from '../middleware/auth.js';
import { nearbyCoffeeShops, photoUrl, cachePhotoReferences } from '../services/googlePlaces.js';
import { scoreShops } from '../services/recommendations.js';
import { generateFeedSummary, generateWhyBlurbs } from '../services/claude.js';
import { recomputeTasteProfile } from '../services/tasteProfile.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

const router = Router();

/**
 * GET /api/feed?lat=...&lng=...
 * Returns the personalised feed for the current user:
 *   - savedShops     : their bookmarked shops (metadata, no API call needed)
 *   - forYou         : top brewScore shops they haven't reviewed yet
 *   - recentReviews  : their last 5 reviews
 *   - newNearby      : shops they haven't interacted with, sorted by distance
 *   - tasteProfile   : their current computed profile for the profile card
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Fetch user with full taste profile and saved meta
    const [user, recentReviews, { results: nearbyRaw }] = await Promise.all([
      User.findById(req.user._id).lean(),
      Review.find({ user: req.user._id }).sort('-createdAt').limit(5).lean(),
      nearbyCoffeeShops(userLat, userLng, 8000),
    ]);

    // Build a set of place IDs the user has already reviewed or saved
    const reviewedIds = new Set(recentReviews.map((r) => r.placeId));
    // Fetch all reviewed place IDs (not just the 5 recent ones)
    const allReviewedIds = new Set(
      (await Review.find({ user: req.user._id }).select('placeId').lean()).map((r) => r.placeId)
    );

    // Persist photo references before scoring strips the raw data
    cachePhotoReferences(nearbyRaw);

    // Score and attach photos to all nearby shops
    const scored = await scoreShops(nearbyRaw, user, userLat, userLng);
    const withPhotos = scored.map((shop) => ({
      ...shop,
      photos: (shop.photos || [])
        .filter((p) => p.photo_reference)
        .slice(0, 1)
        .map((p) => ({ url: photoUrl(p.photo_reference, 400) })),
    }));

    // "For you" — unreviewed, sorted by brewScore desc (top 10)
    const forYou = withPhotos
      .filter((s) => !allReviewedIds.has(s.place_id))
      .slice(0, 10);

    // "New nearby" — also unreviewed, sorted by distance (different cut from forYou)
    const newNearby = withPhotos
      .filter((s) => !allReviewedIds.has(s.place_id))
      .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
      .slice(0, 10);

    // Saved shops meta (already stored, no extra API call)
    const savedShops = (user.savedShopsMeta || [])
      .slice()
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .slice(0, 10);

    let tasteProfile = user.tasteProfile || {};
    // Backfill: old accounts have reviews but no tasteProfile yet.
    // Recompute now so the feed summary and scoring work immediately.
    if ((!tasteProfile.reviewCount || tasteProfile.reviewCount === 0) && recentReviews.length > 0) {
      await recomputeTasteProfile(req.user._id);
      const refreshed = await User.findById(req.user._id).select('tasteProfile').lean();
      tasteProfile = refreshed.tasteProfile || {};
    }
    const hasProfile = (tasteProfile.reviewCount || 0) > 0;

    // ── "Because you…" rows ──────────────────────────────────────────────────
    // Group unreviewed shops by their top matched drink or similar past shop.
    // Each row needs ≥3 shops to be worth showing; cap at 3 rows total.
    const DRINK_ROW_LABEL = {
      latte: 'lattes', cappuccino: 'cappuccinos', 'cold-brew': 'cold brew',
      matcha: 'matcha', 'flat-white': 'flat whites', americano: 'americanos',
      cortado: 'cortados', 'great-espresso': 'great espresso',
      'great-pour-over': 'pour overs', 'specialty-coffee': 'specialty coffee',
    };

    const rowMap = {}; // title → shops[]
    withPhotos
      .filter((s) => !allReviewedIds.has(s.place_id))
      .forEach((s) => {
        // Drink-based row: use the user's top preferred drink this shop is known for
        if (s.matchedDrinks?.length > 0) {
          const drink = s.matchedDrinks[0];
          const title = `Because you like ${DRINK_ROW_LABEL[drink] || drink.replace(/-/g, ' ')}`;
          if (!rowMap[title]) rowMap[title] = [];
          rowMap[title].push(s);
        }
        // Similar-shop row: group by the past shop they resemble
        if (s.similarTo) {
          const title = `Because you liked ${s.similarTo}`;
          if (!rowMap[title]) rowMap[title] = [];
          rowMap[title].push(s);
        }
      });

    const becauseRows = Object.entries(rowMap)
      .filter(([, shops]) => shops.length >= 3)
      .sort((a, b) => b[1].length - a[1].length) // most-populated rows first
      .slice(0, 3)
      .map(([title, shops]) => ({
        title,
        // Sort each row by brewScore so the best match leads
        shops: shops.sort((a, b) => b.brewScore - a.brewScore).slice(0, 10),
      }));

    // AI feed summary — optional, fails gracefully
    const feedSummary = hasProfile
      ? await generateFeedSummary({ tasteProfile, recentReviews, forYouShops: forYou }).catch(() => '')
      : '';

    res.json({
      savedShops,
      forYou,
      becauseRows,
      recentReviews,
      newNearby,
      tasteProfile,
      feedSummary,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
