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

    // Check DB cache first
    const cached = await PhotoCache.findOne({ photoReference: reference });
    if (cached) {
      res.set('Cache-Control', `public, max-age=${SEVEN_DAYS_S}`);
      return res.redirect(302, cached.resolvedUrl);
    }

    // Follow the Google redirect without downloading the full image
    const googleUrl = `${GOOGLE_PHOTO_URL}?maxwidth=${maxwidth}&photoreference=${reference}&key=${KEY}`;
    const response = await axios.get(googleUrl, {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const resolvedUrl = response.headers.location || response.request?.res?.responseUrl;

    if (!resolvedUrl) {
      return res.status(404).end();
    }

    // Cache resolved URL (fire-and-forget — don't block the response)
    PhotoCache.create({ photoReference: reference, resolvedUrl }).catch(() => {});

    res.set('Cache-Control', `public, max-age=${SEVEN_DAYS_S}`);
    res.redirect(302, resolvedUrl);
  } catch (err) {
    // Don't propagate photo errors — just return 404 so the client shows its placeholder
    res.status(404).end();
  }
});

export default router;
