# Deployment

## Production-like staging target

This project is packaged for a Hetzner/VPS-style deployment with four services:

- `db` — Postgres
- `web` — TanStack Start server runtime
- `worker` — pg-boss worker process
- `caddy` — reverse proxy / TLS termination

## Required files

- `Dockerfile`
- `docker-compose.production.yml`
- `Caddyfile`
- `.env.production.example`

## Environment

Copy `.env.production.example` to `.env.production` and fill in real values.

Minimum required:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `APP_DOMAIN`

## Build and start

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

## Migration on deploy

Both `web` and `worker` currently run:

```bash
npm run deploy:migrate
```

before their main process starts.

This is acceptable for staging, but for stricter production control you may later move migrations into a one-shot release job.

## Health endpoint

The application exposes:

```txt
GET /api/health
```

Responses:

- `200` when DB and queue are healthy
- `503` when one of them is unavailable

Payload shape:

```json
{
  "status": "ok",
  "services": {
    "web": "ok",
    "db": "ok",
    "queue": "ok"
  },
  "timestamp": "2026-05-06T20:00:00.000Z"
}
```

## Suggested Hetzner rollout

1. Provision VPS.
2. Install Docker + Compose.
3. Copy app and `.env.production`.
4. Point DNS to the VPS.
5. Set `APP_DOMAIN` in `Caddyfile` environment.
6. Run compose build/up.
7. Verify `https://your-domain/api/health`.

## Notes

- This setup assumes the built TanStack handler lives in `dist/server/server.js` and is served through `scripts/start-web.mjs`.
- The worker container currently runs `tsx src/worker/index.ts` for maximum compatibility with the app's ESM import graph.
- MCP stdio tools must exist inside the runtime image if enabled.
