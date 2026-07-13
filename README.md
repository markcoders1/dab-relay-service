# DAB Relay Service

A Node.js/Express relay that sits in front of the local DAB (Data API Builder) instance. Third-party clients (e.g. purlin.ai) authenticate with a shared API key; the relay validates requests and proxies them to DAB on `127.0.0.1:5000` without exposing DAB publicly.

## Architecture

```
purlin.ai → Apache httpd (public) → dab-relay (localhost:8080) → DAB (127.0.0.1:5000)
```

## Setup

```bash
cp .env.example .env
# Edit .env with DAB_BASE_URL
echo '{"api_key":"dab_Qg1o2Rs5NzMg6HptjQ8iYhxf9mYBh3eP6gWL","admin_api_key":"dab_yourAdminSecretHere"}' > api-key.json
npm install
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Relay listen port (default: `8080`) |
| `DAB_BASE_URL` | Upstream DAB URL (e.g. `http://127.0.0.1:5000`) |
| `LOG_LEVEL` | Pino log level (default: `info`) |

Keys live in `api-key.json`:

```json
{
  "api_key": "dab_...",
  "admin_api_key": "dab_..."
}
```

Both fields are required at startup. The user `api_key` is shared with purlin.ai. The `admin_api_key` is used only for `POST /api/keys/rotate` and is never changed by rotation.

## Apache httpd (VPS deploy)

Proxy public traffic to the relay; keep DAB on localhost only:

```apache
ProxyPass        / http://127.0.0.1:8080/
ProxyPassReverse / http://127.0.0.1:8080/
```

## API Endpoints

### Public relay health

`GET /health` (no API key) — returns relay status and DAB reachability:

```json
{
  "status": "ok",
  "service": "dab-relay",
  "uptime": 12345,
  "dab": { "reachable": true, "statusCode": 200 }
}
```

### Authenticated DAB proxy

All DAB paths require API key via **either**:
- `Authorization: Bearer <api_key>`
- `X-API-Key: <api_key>`

| Path | Methods | Notes |
|------|---------|-------|
| `/api/insights` | POST | Requires `user_id` in body |
| `/api/goals` | POST | Requires `user_id` and `saved_goals` in body |
| `/api/*` | all | Catch-all for future DAB entities |
| `/graphql` | GET, POST | Pass-through |
| `/mcp` | all | Pass-through |
| `/health` | GET | Proxies raw DAB health (with API key) |

### Rotate API key (admin only)

`POST /api/keys/rotate` — send `admin_api_key` in the JSON body (not the user API key). Immediately invalidates the current user key, persists a new one to `api-key.json` (admin key unchanged), and returns it once:

```bash
curl -s -X POST http://localhost:8080/api/keys/rotate \
  -H "Content-Type: application/json" \
  -d '{"admin_api_key":"dab_yourAdminSecretHere"}' | jq .
```

Response:

```json
{ "api_key": "dab_<36-character-suffix>" }
```

Save the returned key; the old user key stops working on the next request (no restart needed).

## Smoke Tests

```bash
export RELAY_API_KEY=$(node -p "require('./api-key.json').api_key")
```

### 1. Relay health (no auth)

```bash
curl -s http://localhost:8080/health | jq .
```

Expected: `200` with `"status": "ok"` and `"dab"` reachability info.

### 2. Insights (Bearer auth)

```bash
curl -i -X POST http://localhost:8080/api/insights \
  -H "Authorization: Bearer $RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"testagent@firstteam.com"}'
```

Expected: `201` with `{"value":[...]}` from DAB.

### 3. Goals (X-API-Key auth)

```bash
curl -i -X POST http://localhost:8080/api/goals \
  -H "X-API-Key: $RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "testagent@firstteam.com",
    "saved_goals": {
      "avgSalesPrice": 590000,
      "commissionRate": 2.5,
      "totalClosedUnits": 15,
      "netCommissionIncome": 185000,
      "commissionSplit": 75
    }
  }'
```

Expected: `201` with `{"value":[]}` from DAB.

### 4. Missing API key (401)

```bash
curl -i -X POST http://localhost:8080/api/insights \
  -H "Content-Type: application/json" \
  -d '{"user_id":"testagent@firstteam.com"}'
```

Expected: `401` with `{"error":"Unauthorized"}`.

### 5. Invalid API key (401)

```bash
curl -i -X POST http://localhost:8080/api/insights \
  -H "Authorization: Bearer wrong-key" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"testagent@firstteam.com"}'
```

Expected: `401` with `{"error":"Unauthorized"}`.

### 6. Missing user_id (400)

```bash
curl -i -X POST http://localhost:8080/api/insights \
  -H "Authorization: Bearer $RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400` with `{"error":"user_id is required and must be a non-empty string"}`.

### 7. DAB health via relay (authenticated)

```bash
curl -i http://localhost:8080/health \
  -H "Authorization: Bearer $RELAY_API_KEY"
```

Expected: Raw DAB `/health` response proxied through.

### 8. Rotate API key (admin)

```bash
export ADMIN_API_KEY=$(node -p "require('./api-key.json').admin_api_key")

curl -s -X POST http://localhost:8080/api/keys/rotate \
  -H "Content-Type: application/json" \
  -d "{\"admin_api_key\":\"$ADMIN_API_KEY\"}" | jq .
```

Expected: `200` with `{"api_key":"dab_..."}`. Store the new user key; `admin_api_key` stays the same.

## Logging

Structured JSON logs via Pino to stdout. Each request logs:

- `reqId`, `method`, `path`, `clientIp`
- `userId` (when present in body)
- `statusCode`, `durationMs`, `upstream`

API keys are never logged.
