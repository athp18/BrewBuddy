import { Schema, model } from 'mongoose';

const schema = new Schema({
  photoReference: { type: String, required: true, unique: true, index: true },
  resolvedUrl:    { type: String, required: true },
  expiresAt:      { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
});

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model('PhotoCache', schema);
