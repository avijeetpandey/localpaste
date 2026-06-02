# LocalPaste Architecture

## System Overview

```
Browser (Angular 21)
    │
    ├── HTTP/REST ──► FastAPI Backend ──► PostgreSQL (metadata)
    │                      │           ──► MinIO (paste bodies)
    │                      │           ──► Redis (cache + rate limit)
    │                      │           ──► ClickHouse (analytics events)
    │
    └── SSE ────────► /collab/{id}/stream (Redis Pub/Sub fan-out)
```

## Data Flows

### Paste Create
1. `POST /api/v1/pastes` → rate limit check (Redis)
2. KGS reserves a pre-generated Base62 key from pool
3. Optional: AES-GCM encrypt payload (server-side) or ZK-encrypt (client-side)
4. MinIO: stream plain/cipher text to `pastes/{key}` object
5. PostgreSQL: insert metadata row
6. Fire-and-forget: sanitizer scan, webhook dispatch, analytics track

### Paste Read
1. `GET /api/v1/pastes/{id}` → IP CIDR check (if restricted)
2. Redis cache-aside: check for cached body
3. Fallback: MinIO `get_object` + Redis `set` (5-min TTL)
4. Burn-after-read: delete MinIO object + mark DB row
5. Fire-and-forget: analytics track("view")

## Services

| Service | Technology | Responsibility |
|---------|-----------|----------------|
| KGS | PostgreSQL + asyncio | Pre-generate Base62 key pool |
| Storage | MinIO + aiohttp | Object CRUD with cache |
| Sanitizer | asyncio Queue | Pattern-scan for malicious content |
| Webhook | Redis LIST + httpx | HMAC-signed event delivery |
| Analytics | asyncio Queue + ClickHouse | Batch view event ingestion |
| Collab | Redis Pub/Sub + SSE | Real-time edit broadcast |

## Security

- **Authentication**: JWT HS256, no expiry (revocation via token rotation)
- **Rate limiting**: Redis sliding window (60 req/min anon, 300 auth)
- **Zero-Knowledge**: AES-GCM key never touches server (URL hash fragment)
- **IP Allowlist**: per-paste CIDR block enforcement
- **Payload scanning**: YARA-style pattern detection on create
