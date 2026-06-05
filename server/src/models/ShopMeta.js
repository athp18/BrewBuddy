import { Schema, model } from 'mongoose';

const schema = new Schema({
  placeId:        { type: String, required: true, unique: true, index: true },
  photoReference: { type: String },
  updatedAt:      { type: Date, default: Date.now },
});

export default model('ShopMeta', schema);
