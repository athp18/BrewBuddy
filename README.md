# BrewBuddy

Discover and review local coffee shops with personalized recommendations based on your location, taste profile, and rating history.

## Project Structure

```
brewbuddy/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Navbar, ShopCard, MapView, ShopDetail, FilterPanel, ReviewModal, StarRating
│   │   ├── pages/           # Discover, Login, Register, Profile
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # useLocation
│   │   └── services/        # api.js (axios client)
│   └── ...config files
└── server/                  # Express backend
    └── src/
        ├── models/          # User, Review
        ├── routes/          # auth, shops, reviews, users
        ├── services/        # googlePlaces.js, recommendations.js
        └── middleware/      # auth.js, errorHandler.js
```

## How the Recommendation Engine Works

Each nearby shop gets a **BrewScore** (0–1) from four signals:

1. **Google rating** (35%) — normalised 1–5 → 0–1
2. **Distance** (30%) — closer scores higher, capped at user's max distance
3. **Vibe match** (20%) — matches user's preferred vibes against their highly-rated review tags
4. **Past sentiment** (15%) — blended from the user's overall rating average

Shops are sorted descending by BrewScore on the Discover feed.
