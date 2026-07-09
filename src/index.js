const { createApp, logger } = require('./app');
const config = require('./config');

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, dabBaseUrl: config.dabBaseUrl },
    'DAB relay service started'
  );
});

function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
