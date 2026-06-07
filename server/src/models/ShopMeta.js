import { Schema, model } from 'mongoose';

const schema = new Schema({
  placeId:            { type: String, required: true, unique: true, index: true },
  photoReference:     { type: String },
  googleDrinkSignals: { type: [String], default: [] },
  googleVibeSignals:  { type: [String], default: [] },
  signalsCachedAt:    { type: Date },
  updatedAt:          { type: Date, default: Date.now },
});

export default model('ShopMeta', schema);
