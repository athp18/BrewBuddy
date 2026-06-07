import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    username: {
      type: String,
      trim: true,
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]*$/, 'Username can only contain letters, numbers, and underscores'],
      sparse: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: [150, 'Bio cannot exceed 150 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    dismissedShops: {
      type: [String],
      default: [],
    },
    // Static preferences — set at onboarding, editable in profile
    preferences: {
      roastLevel: {
        type: String,
        enum: ['light', 'medium', 'dark', 'any'],
        default: 'any',
      },
      vibes: {
        type: [String],
        enum: ['cozy', 'lively', 'quiet', 'laptop-friendly', 'outdoor', 'fast', 'specialty'],
        default: [],
      },
      maxDistance: {
        type: Number,
        default: 5000, // metres
      },
      priceRange: {
        type: [Number],
        default: [1, 4],
      },
    },

    // Dynamic taste profile — recomputed from review history on every review save
    tasteProfile: {
      // Drink weights: 0–1 score for each drink type derived from tagged reviews
      drinks: {
        type: Map,
        of: Number,
        default: {},
      },
      // Vibe weights: 0–1 score for each vibe tag
      vibes: {
        type: Map,
        of: Number,
        default: {},
      },
      // Revealed price preference: weighted avg price_level of positively-rated shops
      avgPriceLevel: {
        type: Number,
        default: null,
      },
      // Revealed distance tolerance: avg distanceM of reviewed shops
      avgDistanceM: {
        type: Number,
        default: null,
      },
      // Total reviews factored into this profile
      reviewCount: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: null,
      },
    },

    savedShops: [{ type: String }], // Google Place IDs

    // Lightweight metadata for saved shops — populated when user bookmarks a shop
    savedShopsMeta: [
      {
        placeId:  { type: String },
        name:     { type: String },
        photoUrl: { type: String, default: '' },
        savedAt:  { type: Date, default: Date.now },
      },
    ],
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Hash password before saving (skip for OAuth users who have no password)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
