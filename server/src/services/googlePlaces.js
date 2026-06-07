import axios from 'axios';
import ShopMeta from '../models/ShopMeta.js';

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const KEY = process.env.GOOGLE_PLACES_API_KEY;

/**
 * Search for nearby coffee shops using Google Places Nearby Search.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius - metres (max 50000)
 * @param {string} [pagetoken] - for pagination
 */
export const nearbyCoffeeShops = async (lat, lng, radius = 3000, pagetoken) => {
  const params = {
    location: `${lat},${lng}`,
    radius,
    type: 'cafe',
    keyword: 'coffee',
    key: KEY,
  };
  if (pagetoken) params.pagetoken = pagetoken;

  const { data } = await axios.get(`${BASE_URL}/nearbysearch/json`, { params });

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status} — ${data.error_message || ''}`);
  }

  return {
    results: data.results,
    nextPageToken: data.next_page_token || null,
  };
};

/**
 * Fetch full details for a single place (hours, phone, website, photos, etc.)
 * @param {string} placeId
 */
export const placeDetails = async (placeId) => {
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'formatted_phone_number',
    'geometry',
    'opening_hours',
    'photos',
    'price_level',
    'rating',
    'user_ratings_total',
    'website',
    'url',
    'reviews',
    'types',
  ].join(',');

  const { data } = await axios.get(`${BASE_URL}/details/json`, {
    params: { place_id: placeId, fields, key: KEY },
  });

  if (data.status !== 'OK') {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return data.result;
};

/**
 * Text search — used for the search bar.
 * No radius restriction — searches globally, optionally biased toward a location.
 * @param {string} query
 * @param {number|null} lat  — pass null for no location bias
 * @param {number|null} lng
 */
export const textSearch = async (query, lat, lng) => {
  const params = {
    query: `${query} coffee shop`,
    type: 'cafe',
    key: KEY,
  };

  // Add location bias only if coords are provided — does not restrict results
  if (lat != null && lng != null) {
    params.location = `${lat},${lng}`;
  }

  const { data } = await axios.get(`${BASE_URL}/textsearch/json`, { params });

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return data.results;
};

/**
 * Persist the first photo_reference for each shop so we can always rebuild the URL later.
 * Fire-and-forget — never blocks the request path.
 */
export const cachePhotoReferences = (shops) => {
  const ops = shops
    .filter((s) => s.place_id && s.photos?.[0]?.photo_reference)
    .map((s) => ({
      updateOne: {
        filter: { placeId: s.place_id },
        update: { $set: { photoReference: s.photos[0].photo_reference, updatedAt: new Date() } },
        upsert: true,
      },
    }));
  if (ops.length) ShopMeta.bulkWrite(ops).catch(() => {});
};

/**
 * Build an internal proxy URL for a photo reference.
 * The /api/photos/:ref route fetches from Google server-side and caches the result,
 * so the API key is never exposed to the client.
 */
export const photoUrl = (photoReference, maxWidth = 800) => {
  const base = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5001}`;
  return `${base}/api/photos/${photoReference}?w=${maxWidth}`;
};
