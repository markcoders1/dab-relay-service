const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');
const config = require('./config');
const { authMiddleware } = require('./middleware/auth');
const validateBody = require('./middleware/validateBody');
const { createHealthRouter } = require('./routes/health');
const createKeysRouter = require('./routes/keys');
const createProxyRouter = require('./routes/proxy');

const logger = pino({ level: config.logLevel });

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
      customProps: (req) => ({
        userId: req.userId || undefined,
        upstream: req.upstream || undefined,
      }),
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    })
  );

  const proxyRouter = express.Router();
  proxyRouter.use(express.json({ limit: '1mb' }));
  proxyRouter.use(authMiddleware);
  proxyRouter.use(validateBody);
  proxyRouter.use((req, _res, next) => {
    req.upstream = 'dab';
    next();
  });
  proxyRouter.use(createProxyRouter());

  app.use(createHealthRouter());
  app.use('/keys', express.json({ limit: '1mb' }), authMiddleware, createKeysRouter());
  app.use(proxyRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}

module.exports = { createApp, logger };
