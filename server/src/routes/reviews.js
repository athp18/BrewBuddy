import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import protect from '../middleware/auth.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { recomputeTasteProfile } from '../services/tasteProfile.js';
import { extractTagsFromReview } from '../services/claude.js';
import { placeDetails } from '../services/googlePlaces.js';
import { extractTagStrings, GOOGLE_DRINK_KEYWORDS, GOOGLE_VIBE_KEYWORDS } from '../services/parsers.js';

const router = Router();

// POST /api/reviews — create or update a review
router.post(
  '/',
  protect,
  [
    body('placeId').notEmpty().withMessage('placeId required'),
    body('shopName').notEmpty().withMessage('shopName required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('tags').optional().isArray(),
    body('body').optional().isString().isLength({ max: 500 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { placeId, shopName, rating, tags, body: reviewBody } = req.body;

      // Upsert so users can edit their review
      const review = await Review.findOneAndUpdate(
        { user: req.user._id, placeId },
        { rating, tags, body: reviewBody, shopName, visitedAt: new Date() },
        { new: true, upsert: true, runValidators: true }
      );

      // Update total review count — synchronous so it's accurate in the response
      await User.findByIdAndUpdate(req.user._id, {
        $set: { totalReviews: await Review.countDocuments({ user: req.user._id }) },
      });

      // Fire async jobs — none of these block the HTTP response
      const userId   = req.user._id;
      const reviewId = review._id;

      // 1. Claude: extract extra tags from review text and merge into the review
      if (reviewBody?.trim()) {
        extractTagsFromReview({ body: reviewBody, existingTags: tags || [] })
          .then(async (inferred) => {
            if (inferred.length > 0) {
              await Review.findByIdAndUpdate(reviewId, {
                $addToSet: { tags: { $each: inferred } },
              });
            }
          })
          .catch(console.error);
      }

      // 2. Google: fetch Place Details → snapshot price_level + parse customer reviews
      //    → store signals on this Review → recompute taste profile.
      placeDetails(placeId)
        .then(async (shop) => {
          const update = {};
          // Snapshot price level so tasteProfile can compute avgPriceLevel
          if (shop.price_level != null) update.shopPriceLevel = shop.price_level;
          // Parse Google review text for drink/vibe signals
          if (shop.reviews?.length) {
            update.googleDrinkSignals = extractTagStrings(shop.reviews, GOOGLE_DRINK_KEYWORDS);
            update.googleVibeSignals  = extractTagStrings(shop.reviews, GOOGLE_VIBE_KEYWORDS);
          }
          if (Object.keys(update).length) {
            await Review.findByIdAndUpdate(reviewId, update);
          }
        })
        .catch(console.error)
        // Always recompute after both async jobs have had a chance to run
        .finally(() => recomputeTasteProfile(userId).catch(console.error));

      res.status(201).json({ review });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/reviews/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    await review.deleteOne();
    await User.findByIdAndUpdate(req.user._id, {
      $set: { totalReviews: await Review.countDocuments({ user: req.user._id }) },
    });
    recomputeTasteProfile(req.user._id).catch(console.error);

    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/me — all reviews by the current user
router.get('/me', protect, async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id }).sort('-createdAt').lean();
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

export default router;
