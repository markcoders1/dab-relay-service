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

function extractApiKey(req) {
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey) {
    return xApiKey;
  }

  const auth = req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '');
  }

  return null;
}

function isValidApiKey(key) {
  return key && timingSafeEqual(key, config.relayApiKey);
}

function authMiddleware(req, res, next) {
  const key = extractApiKey(req);

  if (!key) {
    req.log?.warn({ reason: 'missing_key' }, 'Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!isValidApiKey(key)) {
    req.log?.warn({ reason: 'invalid_key' }, 'Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = { authMiddleware, extractApiKey, isValidApiKey };
