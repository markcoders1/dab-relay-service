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

function readKeyFile() {
  let raw;
  try {
    raw = fs.readFileSync(apiKeyFilePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Missing required API key file: ${apiKeyFilePath}`);
    }
    throw err;
  }

  return JSON.parse(raw);
}

function writeKeyFile(data) {
  const tmpPath = `${apiKeyFilePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.renameSync(tmpPath, apiKeyFilePath);
}

function requireKeyField(data, field) {
  const key = typeof data[field] === 'string' ? data[field].trim() : '';
  if (!key) {
    throw new Error(`${field} missing or empty in ${apiKeyFilePath}`);
  }
  return key;
}

function loadKeys() {
  const data = readKeyFile();
  return {
    apiKey: requireKeyField(data, 'api_key'),
    adminApiKey: requireKeyField(data, 'admin_api_key'),
  };
}

const keys = loadKeys();

const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  relayApiKey: keys.apiKey,
  adminApiKey: keys.adminApiKey,
  dabBaseUrl: requireEnv('DAB_BASE_URL').replace(/\/$/, ''),
  logLevel: process.env.LOG_LEVEL || 'info',
  dabHealthTimeoutMs: 2000,
  apiKeyFilePath,
};

function setRelayApiKey(key) {
  const data = readKeyFile();
  writeKeyFile({
    api_key: key,
    admin_api_key: requireKeyField(data, 'admin_api_key'),
  });
  config.relayApiKey = key;
}

module.exports = config;
module.exports.setRelayApiKey = setRelayApiKey;
