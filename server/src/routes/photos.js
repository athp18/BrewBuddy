import { Router } from 'express';
import axios from 'axios';
import PhotoCache from '../models/PhotoCache.js';
import ShopMeta from '../models/ShopMeta.js';

const router = Router();
const KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';
const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

/**
 * GET /api/photos/:reference?w=400
 * Proxy for Google Places photos. No auth required — img tags load these directly.
 * First hit follows the Google redirect and caches the resolved CDN URL.
 * Subsequent hits skip Google entirely and redirect straight to CDN.
 * Sends Cache-Control so browsers cache the image for 7 days.
 */
router.get('/:reference', async (req, res, next) => {
  try {
    const { reference } = req.params;
    const maxwidth = parseInt(req.query.w) || 400;

    if (!reference || reference === 'undefined') {
      return res.status(404).end();
    }

    // Check DB cache for the resolved CDN url
    const cached = await PhotoCache.findOne({ photoReference: reference });
    const imageUrl = cached?.resolvedUrl || null;

    const googleUrl = `${GOOGLE_PHOTO_URL}?maxwidth=${maxwidth}&photoreference=${reference}&key=${KEY}`;

    // Stream the image through the server so the browser never touches Google CDN directly.
    // This avoids CORP/COEP issues and keeps the API key server-side.
    const upstream = await axios.get(imageUrl || googleUrl, {
      responseType: 'stream',
      timeout: 10000,
    });

    // If we fetched from Google directly, cache the final resolved URL for next time
    if (!imageUrl) {
      const resolvedUrl = upstream.request?.res?.responseUrl || upstream.config?.url;
      if (resolvedUrl && resolvedUrl !== googleUrl) {
        PhotoCache.create({ photoReference: reference, resolvedUrl }).catch(() => {});
      }
    }

    res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', `public, max-age=${SEVEN_DAYS_S}`);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    upstream.data.pipe(res);
  } catch (err) {
    // Don't propagate photo errors — just return 404 so the client shows its placeholder
    res.status(404).end();
  }
});

export default router;
