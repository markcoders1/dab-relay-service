require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  relayApiKey: requireEnv('RELAY_API_KEY'),
  dabBaseUrl: requireEnv('DAB_BASE_URL').replace(/\/$/, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  dabHealthTimeoutMs: 2000,
};

module.exports = config;
