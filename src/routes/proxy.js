const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const config = require('../config');

function createProxyRouter() {
  const express = require('express');
  const router = express.Router();

  const proxy = createProxyMiddleware({
    target: config.dabBaseUrl,
    changeOrigin: true,
    pathFilter: (pathname) =>
      pathname.startsWith('/api') ||
      pathname.startsWith('/graphql') ||
      pathname.startsWith('/mcp') ||
      pathname === '/health',
    on: {
      proxyReq(proxyReq, req) {
        if (req.id) {
          proxyReq.setHeader('x-request-id', req.id);
        }
        fixRequestBody(proxyReq, req);
      },
      error(err, req, res) {
        req.log?.error({ err, upstream: 'dab' }, 'Upstream proxy error');
        if (!res.headersSent) {
          res.status(502).json({ error: 'Bad Gateway', message: 'Failed to reach DAB upstream' });
        }
      },
    },
  });

  router.use(proxy);

  return router;
}

module.exports = createProxyRouter;
