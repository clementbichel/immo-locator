import crypto from 'node:crypto';
import { logger } from '../logger.js';

export function adminAuth(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return res
      .status(503)
      .json({ error: 'ADMIN_DISABLED', message: 'Admin endpoints are not configured.' });
  }

  const providedKey = req.headers['x-admin-key'];
  if (!providedKey) {
    logger.warn({ ip: req.ip, path: req.path }, 'Admin auth: missing key');
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'X-Admin-Key header required.' });
  }

  const providedBuffer = Buffer.from(String(providedKey));
  const expectedBuffer = Buffer.from(adminKey);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    logger.warn({ ip: req.ip, path: req.path }, 'Admin auth: invalid key');
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid admin key.' });
  }

  next();
}
