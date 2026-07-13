const crypto = require('crypto');
const express = require('express');
const { setRelayApiKey } = require('../config');

const API_KEY_PREFIX = 'dab_';
const API_KEY_SUFFIX_LENGTH = 36;
const API_KEY_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRelayApiKey() {
  const bytes = crypto.randomBytes(API_KEY_SUFFIX_LENGTH);
  let suffix = '';
  for (let i = 0; i < API_KEY_SUFFIX_LENGTH; i++) {
    suffix += API_KEY_CHARSET[bytes[i] % API_KEY_CHARSET.length];
  }
  return `${API_KEY_PREFIX}${suffix}`;
}

function createKeysRouter() {
  const router = express.Router();

  router.post('/rotate', (req, res) => {
    const newKey = generateRelayApiKey();

    try {
      setRelayApiKey(newKey);
    } catch (err) {
      req.log?.error({ err }, 'Failed to persist rotated API key');
      return res.status(500).json({ error: 'Failed to rotate API key' });
    }

    req.log?.info('API key rotated');
    return res.status(200).json({ api_key: newKey });
  });

  return router;
}

module.exports = createKeysRouter;
