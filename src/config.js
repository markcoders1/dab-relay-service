const fs = require('fs');
const path = require('path');
require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const apiKeyFilePath = path.join(process.cwd(), 'api-key.json');

function writeApiKeyFile(key) {
  const tmpPath = `${apiKeyFilePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify({ api_key: key }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(tmpPath, apiKeyFilePath);
}

function loadRelayApiKey() {
  let raw;
  try {
    raw = fs.readFileSync(apiKeyFilePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Missing required API key file: ${apiKeyFilePath}`);
    }
    throw err;
  }

  const data = JSON.parse(raw);
  const key = typeof data.api_key === 'string' ? data.api_key.trim() : '';
  if (!key) {
    throw new Error(`api_key missing or empty in ${apiKeyFilePath}`);
  }
  return key;
}

const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  relayApiKey: loadRelayApiKey(),
  dabBaseUrl: requireEnv('DAB_BASE_URL').replace(/\/$/, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  dabHealthTimeoutMs: 2000,
  apiKeyFilePath,
};

function setRelayApiKey(key) {
  writeApiKeyFile(key);
  config.relayApiKey = key;
}

module.exports = config;
module.exports.setRelayApiKey = setRelayApiKey;
