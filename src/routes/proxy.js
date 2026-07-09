const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

function createProxyRouter() {
  const express = require('express');
  const router = express.Router();

  const proxy = createProxyMiddleware({
    target: config.dabBaseUrl,
    changeOrigin: true,
    on: {
      proxyReq(proxyReq, req) {
        if (req.id) {
          proxyReq.setHeader('x-request-id', req.id);
        }
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error(err, req, res) {
        req.log?.error({ err, upstream: 'dab' }, 'Upstream proxy error');
        if (!res.headersSent) {
          res.status(502).json({ error: 'Bad Gateway', message: 'Failed to reach DAB upstream' });
        }
      },
    },
  });

  router.use('/api', proxy);
  router.use('/graphql', proxy);
  router.use('/mcp', proxy);
  router.use('/health', proxy);

  return router;
}

module.exports = createProxyRouter;
