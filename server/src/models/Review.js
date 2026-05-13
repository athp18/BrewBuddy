import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    placeId: {
      type: String,
      required: true,
      index: true,
    },
    shopName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    tags: {
      type: [String],
      enum: [
        // vibes
        'good-wifi',
        'quiet',
        'loud',
        'cozy',
        'fast-service',
        'good-food',
        'laptop-friendly',
        'outdoor-seating',
        'good-value',
        // drinks
        'great-espresso',
        'great-pour-over',
        'specialty-coffee',
        'latte',
        'cappuccino',
        'cold-brew',
        'matcha',
        'flat-white',
        'americano',
      ],
      default: [],
    },
    body: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters'],
      default: '',
    },
    visitedAt: {
      type: Date,
      default: Date.now,
    },
    // Price level snapshotted from Google Places at review time (1–4).
    // Stored so the taste profile can compute avgPriceLevel without extra API calls.
    shopPriceLevel: { type: Number, default: null },
    // Drink/vibe signals inferred from Google reviews for this shop —
    // stored async after the review is saved, used to enrich the taste profile.
    googleDrinkSignals: { type: [String], default: [] },
    googleVibeSignals:  { type: [String], default: [] },
  },
  { timestamps: true }
);

// One review per user per shop
reviewSchema.index({ user: 1, placeId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
