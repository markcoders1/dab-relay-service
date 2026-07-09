const { isValidApiKey, extractApiKey } = require('../middleware/auth');
const config = require('../config');

async function checkDabHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.dabHealthTimeoutMs);

  try {
    const response = await fetch(`${config.dabBaseUrl}/health`, {
      signal: controller.signal,
    });
    return {
      reachable: true,
      statusCode: response.status,
    };
  } catch {
    return {
      reachable: false,
      statusCode: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function createHealthRouter() {
  const express = require('express');
  const router = express.Router();

  router.get('/health', async (req, res, next) => {
    const key = extractApiKey(req);
    if (isValidApiKey(key)) {
      req.upstream = 'dab';
      return next();
    }

    const dab = await checkDabHealth();
    res.status(200).json({
      status: 'ok',
      service: 'dab-relay',
      uptime: Math.floor(process.uptime()),
      dab,
    });
  });

  return router;
}

module.exports = { createHealthRouter, checkDabHealth };
