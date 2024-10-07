// backend/src/routes/coffeeShops.js

const express = require('express');
const { searchCoffeeShops } = require('../services/yelpService');

const router = express.Router();

/**
 * @route   GET /api/coffee-shops
 * @desc    Search for coffee shops based on query parameters
 * @access  Public or Private (depending on your app's requirements)
 */
router.get('/', async (req, res) => {
  const {
    latitude,
    longitude,
    location,
    term = 'coffee',
    radius,
    price,
    open_now,
    sort_by,
    limit = 20,
    offset = 0,
  } = req.query;

  // Validate required parameters
  if ((!latitude || !longitude) && !location) {
    return res.status(400).json({
      error: 'Please provide either latitude and longitude or location.',
    });
  }

  const params = {
    term,
    latitude,
    longitude,
    location,
    radius,
    price,
    open_now,
    sort_by,
    limit,
    offset,
  };

  // Remove undefined or empty parameters
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined || params[key] === '') {
      delete params[key];
    }
  });

  try {
    const businesses = await searchCoffeeShops(params);
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coffee shops.' });
  }
});

module.exports = router;