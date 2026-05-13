import axios from 'axios';

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
 * Build a photo URL from a photo reference.
 * @param {string} photoReference
 * @param {number} maxWidth
 */
export const photoUrl = (photoReference, maxWidth = 800) =>
  `${BASE_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${KEY}`;
