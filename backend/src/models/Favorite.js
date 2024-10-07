// backend/src/models/Favorite.js

const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shopId: { type: String, required: true },
  dateAdded: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Favorite', FavoriteSchema);