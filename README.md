# localpaste

A modern, self-hosted Pastebin alternative — built end-to-end with **FastAPI**, **PostgreSQL**, **Redis**, **MinIO**, and **Angular** (standalone components, signals, Tailwind / Zard-style UI).

> **Tech**: FastAPI · SQLAlchemy 2 (async) · PostgreSQL · Redis · MinIO · Angular 19 (latest stable, Standalone + Signals) · Tailwind CSS · Docker · Kubernetes.

---

## Features

- **Paste creation** with title, language, visibility, expiration, and burn-after-reading.
- **Optional AES-GCM encryption** of the paste body before persisting to object storage.
- **Pre-computed Base62 key pool** (KGS) — no collisions or retries on creation.
- **Cache-aside on Redis** for hot pastes; sliding-window rate limiting middleware.
- **JWT-authenticated API** (no expiry tokens, per requirement) — every paste endpoint requires login.
- **Seed data** — default `demo` and `admin` users plus three sample pastes are loaded on first boot.
- **Modern Angular UI** — signals-based state, dark/light theme switcher, toast micro-delights, mobile drawer for settings, live expiry countdown, and one-click copy.
- **Production manifests** for Docker Compose and Kubernetes.

---

## Project layout

```
localpaste/
├── backend/                FastAPI service
│   ├── app/
│   │   ├── api/v1/         REST endpoints (auth, pastes, health)
│   │   ├── core/           config, logging, security, encryption, base62
│   │   ├── db/             async engine + Base + session
│   │   ├── middleware/     rate limiter
│   │   ├── models/         SQLAlchemy ORM
│   │   ├── schemas/        Pydantic v2 request/response contracts
│   │   ├── services/       auth · paste · KGS · MinIO · Redis
│   │   └── utils/          startup seed
│   └── tests/              pytest unit + integration suites
├── frontend/               Angular standalone SPA
│   ├── src/app/
│   │   ├── core/           services, guards, interceptors, models
│   │   ├── features/       auth · editor · paste-view · dashboard
│   │   └── shared/         app shell, toast, utilities
│   └── tests/              Playwright e2e example + Karma specs
├── k8s/                    Kubernetes manifests (namespace, stateful, app, ingress)
├── scripts/                init-db.sql
├── docker-compose.yml      one-command local stack
└── .env.example            all env variables
```

---

## Quick start (Docker Compose)

```bash
cp .env.example .env
docker compose up --build
```

This brings up:

| Service           | URL                               | Notes                           |
|-------------------|-----------------------------------|---------------------------------|
| Frontend (Angular) | http://localhost:4200            | served by nginx, proxies `/api` |
| Backend (FastAPI)  | http://localhost:8000/docs       | auto-generated OpenAPI          |
| MinIO console      | http://localhost:9001            | `minioadmin / minioadmin123`    |
| PostgreSQL         | `localhost:5432`                  | `localpaste / localpaste_secret`|
| Redis              | `localhost:6379`                  |                                 |

### Seeded accounts

| Email                     | Password    | Role  |
|---------------------------|-------------|-------|
| `demo@localpaste.dev`     | `demo12345` | user  |
| `admin@localpaste.dev`    | `admin12345`| admin |

The startup hook also creates 3 sample pastes for the demo user.

---

## API quick tour (curl)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@localpaste.dev","password":"demo12345"}' | jq -r .access_token)

# Create a paste
curl -s -X POST http://localhost:8000/api/v1/pastes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Hi","content":"hello","language":"plaintext","visibility":"public","burn_after_read":false,"expiration":"never","encrypt":false}'

# List your pastes
curl -s http://localhost:8000/api/v1/pastes -H "Authorization: Bearer $TOKEN"

# Fetch a paste with body
curl -s http://localhost:8000/api/v1/pastes/<id> -H "Authorization: Bearer $TOKEN"

# Raw text (browser-friendly)
curl -s http://localhost:8000/api/v1/pastes/<id>/raw -H "Authorization: Bearer $TOKEN"

# Delete
curl -s -X DELETE http://localhost:8000/api/v1/pastes/<id> -H "Authorization: Bearer $TOKEN"
```

> **JWT note**: per the project requirement, `JWT_EXPIRE_MINUTES=0` means tokens are issued **without an `exp` claim** and never expire.

---

## Local development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Unit tests (no infra required)
pytest tests/test_unit_core.py tests/test_schemas.py

# Integration tests (require docker compose up)
LOCALPASTE_INTEGRATION=1 pytest tests/test_integration_api.py

# Run dev server (assumes Postgres/Redis/MinIO running locally)
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start          # dev server on http://localhost:4200
npm test           # Karma + Jasmine unit tests (headless Chrome)
npm run build      # production bundle
```

The dev server proxies `/api/*` to the backend through Nginx in Docker, or you can adjust `environment.ts` to point directly to `http://localhost:8000/api/v1`.

---

## Configuration reference

All values live in `.env` (see `.env.example`). Highlights:

| Variable                    | Default                            | Description                                |
|-----------------------------|------------------------------------|--------------------------------------------|
| `JWT_SECRET_KEY`            | `please-change-me…`                | HMAC key for tokens                        |
| `JWT_EXPIRE_MINUTES`        | `0`                                | `0` = tokens never expire                  |
| `AES_MASTER_KEY`            | 32-char string                     | Master key for AES-GCM body encryption     |
| `KGS_KEY_LENGTH`            | `6`                                | Length of generated Base62 paste IDs       |
| `KGS_POOL_TARGET`           | `5000`                             | Target unused-key pool size                |
| `KGS_REFILL_THRESHOLD`      | `1000`                             | Trigger refill when pool drops below       |
| `RATE_LIMIT_ANON_PER_MINUTE`| `30`                               | Per-IP requests/min for anonymous traffic  |
| `RATE_LIMIT_AUTH_PER_MINUTE`| `120`                              | Per-token requests/min for auth'd traffic  |
| `MINIO_BUCKET`              | `pastes`                           | Created on startup if missing              |
| `CORS_ORIGINS`              | localhost dev origins              | Comma-separated allow list                 |

---

## Kubernetes deployment

```bash
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/10-stateful.yaml      # Postgres + Redis + MinIO
kubectl apply -f k8s/20-app.yaml           # backend + frontend
kubectl apply -f k8s/30-ingress.yaml       # public ingress
```

Edit `30-ingress.yaml` to use your real hostname and TLS secret.

---

## Architecture in one diagram

```
        ┌──────────┐   /api    ┌────────────┐
        │ Angular  │──proxy──▶ │  FastAPI   │
        │ (nginx)  │           └─────┬──────┘
        └──────────┘                 │
                                     │ async
                  ┌──────────────────┼──────────────────┐
                  ▼                  ▼                  ▼
            ┌───────────┐      ┌──────────┐      ┌───────────┐
            │ Postgres  │      │  Redis   │      │   MinIO   │
            │ (metadata)│      │ (cache + │      │ (paste    │
            │           │      │   RL)    │      │  bodies)  │
            └───────────┘      └──────────┘      └───────────┘
```

- **Create flow**: `KGS.reserve_key → MinIO.put_object → Postgres.insert`. Failures roll back the reservation.
- **Read flow**: `Redis.get(body) → MinIO.get_object` (cached for 5 min). Burn-after-read deletes immediately after first successful fetch.
- **Rate limit**: per-IP / per-token sliding minute window in Redis; 429s returned without ever touching Postgres or MinIO.

---

## Enterprise Features

### Zero-Knowledge Encryption
Enable the **Zero-Knowledge Encryption** toggle in the editor. The payload is encrypted in-browser using AES-GCM 256-bit (Web Crypto API) before upload. The decryption key never touches the server — it is appended as a URL hash fragment:
```
http://localhost:4200/p/abc123#key=<base64key>.<base64iv>
```
Share the full URL (including the `#key=...` fragment) with recipients. The app decrypts locally when loading the page.

### CLI Tool
```bash
# Install dependencies (only stdlib used)
python3 cli/localpaste_cli.py --help

# Login
python3 cli/localpaste_cli.py login --email demo@localpaste.dev --password demo12345

# Create paste from stdin / file / pipe
echo "print('hello')" | python3 cli/localpaste_cli.py create --language python --title "Hello"
cat main.py | python3 cli/localpaste_cli.py create --private --language python

# List, get, delete
python3 cli/localpaste_cli.py list
python3 cli/localpaste_cli.py get <id> --raw
python3 cli/localpaste_cli.py delete <id> --yes

# Version management
python3 cli/localpaste_cli.py fork <id>
python3 cli/localpaste_cli.py versions <id>
python3 cli/localpaste_cli.py diff <id>

# Analytics
python3 cli/localpaste_cli.py analytics <id>
```
Set `LOCALPASTE_API_URL` and `LOCALPASTE_BASE_URL` environment variables to point to custom deployments.

### Webhooks
Configure HTTP webhook endpoints at `/webhooks` in the UI, or via the API:
```bash
TOKEN="..."
# Create webhook
curl -X POST http://localhost:8000/api/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_url":"https://example.com/hook","secret_token":"mysecret","events":["paste.created","paste.viewed"]}'

# Test delivery
curl -X POST http://localhost:8000/api/v1/webhooks/<id>/test \
  -H "Authorization: Bearer $TOKEN"
```
Deliveries include `X-Localpaste-Signature: sha256=<hmac-sha256>` for verification using `secret_token`.

### Versioning & Diff
Every paste can be forked to create a new version:
```bash
# Fork via API
curl -X POST http://localhost:8000/api/v1/pastes/<id>/fork \
  -H "Authorization: Bearer $TOKEN"

# Get diff vs parent
curl http://localhost:8000/api/v1/pastes/<fork_id>/diff \
  -H "Authorization: Bearer $TOKEN"

# Get full version chain
curl http://localhost:8000/api/v1/pastes/<id>/versions \
  -H "Authorization: Bearer $TOKEN"
```

### ClickHouse Analytics
View analytics at `/p/<id>/analytics` in the UI. Raw API:
```bash
curl http://localhost:8000/api/v1/pastes/<id>/analytics \
  -H "Authorization: Bearer $TOKEN"
```
ClickHouse is available at `http://localhost:8123` (HTTP interface).

### Team Workspaces
```bash
# Create workspace
curl -X POST http://localhost:8000/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Team","slug":"my-team"}'

# Invite member
curl -X POST http://localhost:8000/api/v1/workspaces/my-team/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_email":"colleague@example.com","role":"editor"}'
```

### Real-Time Collaboration (SSE)
Subscribe to live edits on any paste:
```bash
curl -N "http://localhost:8000/api/v1/collab/<paste_id>/stream?token=$TOKEN"
```
Broadcast an update:
```bash
curl -X POST "http://localhost:8000/api/v1/collab/<paste_id>/broadcast" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"edit","data":{"content":"new content"}}'
```

---

## License

MIT
