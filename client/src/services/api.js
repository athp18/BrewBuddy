import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '');

/** Resolve a photo URL — turns server-relative paths into absolute ones. */
export const resolvePhoto = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — kick to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bb_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ---- Shops ----
export const shopsApi = {
  nearby: (lat, lng, radius, pagetoken) =>
    api.get('/shops/nearby', { params: { lat, lng, radius, pagetoken } }),
  search: (q, lat, lng) => api.get('/shops/search', { params: { q, lat, lng } }),
  detail: (placeId) => api.get(`/shops/${placeId}`),
  reviews: (placeId) => api.get(`/shops/${placeId}/reviews`),
};

// ---- Reviews ----
export const reviewsApi = {
  create: (data) => api.post('/reviews', data),
  delete: (id) => api.delete(`/reviews/${id}`),
  mine: () => api.get('/reviews/me'),
};

// ---- Users ----
export const usersApi = {
  updatePreferences: (data) => api.patch('/users/preferences', data),
  toggleSaved: (placeId, meta) => api.patch(`/users/saved/${placeId}`, meta || {}),
  updateProfile: (data) => api.patch('/users/profile', data),
  dismissShop: (placeId) => api.patch(`/users/dismiss/${placeId}`),
  passport: () => api.get('/users/passport'),
};

// ---- Feed ----
export const feedApi = {
  get: (lat, lng) => api.get('/feed', { params: { lat, lng } }),
};

export default api;
