const crypto = require('crypto');
const config = require('../config');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function adminAuthMiddleware(req, res, next) {
  const adminKey = req.body?.admin_api_key;

  if (typeof adminKey !== 'string' || !adminKey.trim()) {
    req.log?.warn({ reason: 'missing_admin_key' }, 'Admin authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!timingSafeEqual(adminKey.trim(), config.adminApiKey)) {
    req.log?.warn({ reason: 'invalid_admin_key' }, 'Admin authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { adminAuthMiddleware };
