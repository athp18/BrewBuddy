// backend/src/services/yelpService.js

const axios = require('axios');

const yelpClient = axios.create({
  baseURL: 'https://api.yelp.com/v3',
  headers: {
    Authorization: `Bearer ${process.env.YELP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Search for coffee shops using Yelp Fusion API.
 * @param {Object} params - Query parameters for the search.
 * @returns {Promise<Array>} - A promise that resolves to an array of businesses.
 */
const searchCoffeeShops = async (params) => {
  try {
    const response = await yelpClient.get('/businesses/search', { params });
    return response.data.businesses;
  } catch (error) {
    console.error('Error fetching coffee shops:', error.response.data);
    throw error;
  }
};

/**
 * Get detailed information about a specific coffee shop.
 * @param {string} businessId - The Yelp ID of the business.
 * @returns {Promise<Object>} - A promise that resolves to the business details.
 */
const getCoffeeShopDetails = async (businessId) => {
  try {
    const response = await yelpClient.get(`/businesses/${businessId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching coffee shop details:', error.response.data);
    throw error;
  }
};

module.exports = {
  searchCoffeeShops,
  getCoffeeShopDetails,
};