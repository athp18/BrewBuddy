import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import protect from '../middleware/auth.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { generateCoffeePersonality } from '../services/claude.js';

const router = Router();

// PATCH /api/users/preferences — update taste profile
router.patch(
  '/preferences',
  protect,
  [
    body('roastLevel').optional().isIn(['light', 'medium', 'dark', 'any']),
    body('vibes').optional().isArray(),
    body('maxDistance').optional().isInt({ min: 500, max: 50000 }),
    body('priceRange').optional().isArray({ min: 2, max: 2 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { roastLevel, vibes, maxDistance, priceRange } = req.body;
      const update = {};
      if (roastLevel !== undefined) update['preferences.roastLevel'] = roastLevel;
      if (vibes !== undefined) update['preferences.vibes'] = vibes;
      if (maxDistance !== undefined) update['preferences.maxDistance'] = maxDistance;
      if (priceRange !== undefined) update['preferences.priceRange'] = priceRange;

      const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/users/saved/:placeId — toggle saved shop
// Body (optional, only needed when saving): { name, photoUrl }
router.patch('/saved/:placeId', protect, async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const { name, photoUrl } = req.body;
    const isSaved = req.user.savedShops.includes(placeId);

    let update;
    if (isSaved) {
      update = {
        $pull: { savedShops: placeId, savedShopsMeta: { placeId } },
      };
    } else {
      update = {
        $addToSet: { savedShops: placeId },
        $push: {
          savedShopsMeta: {
            $each: [{ placeId, name: name || '', photoUrl: photoUrl || '', savedAt: new Date() }],
            $slice: -50, // keep at most 50
          },
        },
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ saved: !isSaved, savedShops: user.savedShops, savedShopsMeta: user.savedShopsMeta });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/profile — update name / username / bio / avatar
router.patch(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty(),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('bio').optional().isLength({ max: 150 }).withMessage('Bio cannot exceed 150 characters'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { name, username, bio, avatar } = req.body;
      const update = {};
      if (name)    update.name    = name;
      if (avatar)  update.avatar  = avatar;
      if (bio   !== undefined) update.bio      = bio;
      if (username !== undefined) {
        // Check uniqueness manually (sparse index won't enforce empty strings)
        if (username) {
          const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
          if (existing) return res.status(409).json({ message: 'Username is already taken' });
        }
        update.username = username || undefined;
      }

      const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/users/dismiss/:placeId — toggle a shop as "not interested"
router.patch('/dismiss/:placeId', protect, async (req, res, next) => {
  try {
    const { placeId } = req.params;
    const isDismissed = req.user.dismissedShops?.includes(placeId);
    const update = isDismissed
      ? { $pull: { dismissedShops: placeId } }
      : { $addToSet: { dismissedShops: placeId } };
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ dismissed: !isDismissed, dismissedShops: user.dismissedShops });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/passport — data for the shareable passport card
router.get('/passport', protect, async (req, res, next) => {
  try {
    const [user, reviews] = await Promise.all([
      User.findById(req.user._id).lean(),
      Review.find({ user: req.user._id }).lean(),
    ]);

    const avgRating = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    const tasteProfile = user.tasteProfile || {};

    // Generate personality type via Claude (fast haiku call)
    const personality = await generateCoffeePersonality({
      tasteProfile,
      reviewCount: reviews.length,
    }).catch(() => 'The Coffee Enthusiast');

    res.json({
      name: user.name,
      memberSince: user.createdAt,
      reviewCount: reviews.length,
      avgRating,
      savedCount: user.savedShops?.length || 0,
      tasteProfile,
      personality,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
