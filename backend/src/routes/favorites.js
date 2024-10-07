// backend/src/routes/favorites.js

const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @route   POST /api/favorites
 * @desc    Add a coffee shop to favorites
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  const { shopId } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (user.favorites.includes(shopId)) {
      return res.status(400).json({ msg: 'Shop already in favorites' });
    }

    user.favorites.push(shopId);
    await user.save();

    res.json(user.favorites);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/favorites
 * @desc    Get user's favorite coffee shops
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('favorites');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user.favorites);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   DELETE /api/favorites/:shopId
 * @desc    Remove a coffee shop from favorites
 * @access  Private
 */
router.delete('/:shopId', auth, async (req, res) => {
  const { shopId } = req.params;

  try {
    const user = await User.findById(req.user.id);

    if (!user.favorites.includes(shopId)) {
      return res.status(400).json({ msg: 'Shop not found in favorites' });
    }

    user.favorites = user.favorites.filter((id) => id !== shopId);
    await user.save();

    res.json(user.favorites);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;