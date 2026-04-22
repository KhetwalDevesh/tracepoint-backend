# Tracepoint Backend

REST API for managing production incidents — built with **Bun**, **Elysia**, and **Prisma** on **PostgreSQL**.

## Setup & Run

### Prerequisites

- [Bun](https://bun.sh/) v1.x
- PostgreSQL 16+ (or a [Neon](https://neon.tech/) serverless instance)

### Local Development

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Push schema to database & generate Prisma client
bun run db:push
bun run db:generate

# Seed sample data (~200 incidents)
bun run db:seed

# Start dev server (with hot reload)
bun run dev
# → http://localhost:4000
```

### Docker

```bash
# Start PostgreSQL + API together
docker compose up --build

# Or just PostgreSQL (for local backend dev)
docker compose up postgres
```

### Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start with `--watch` (auto-restart on changes) |
| `bun run start` | Production start |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Run Prisma migrations |
| `bun run db:push` | Push schema to DB (no migration file) |
| `bun run db:seed` | Seed ~200 sample incidents |
| `bun run db:studio` | Open Prisma Studio (DB GUI) |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Lint with Biome |
| `bun run format` | Format with Biome |

---

## API Overview

**Base URL:** `http://localhost:4000/api`

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/incidents` | List incidents (paginated, filterable, sortable) |
| `GET` | `/api/incidents/:id` | Get a single incident by UUID |
| `POST` | `/api/incidents` | Create a new incident |
| `PATCH` | `/api/incidents/:id` | Partially update an incident |
| `GET` | `/health` | Health check |
| `GET` | `/openapi` | Interactive OpenAPI documentation |

### List Incidents — Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (1-indexed) |
| `pageSize` | number | 10 | Items per page (max 100) |
| `search` | string | — | Full-text search on title and summary |
| `service` | string | — | Filter by exact service name |
| `severity` | string | — | Comma-separated severity filter (e.g. `SEV1,SEV2`) |
| `status` | string | — | Comma-separated status filter (e.g. `OPEN,MITIGATED`) |
| `sortBy` | string | `createdAt` | Column to sort by |
| `sortOrder` | `asc` \| `desc` | `desc` | Sort direction |

### Example Requests

```bash
# List incidents (page 1, 10 per page)
curl http://localhost:4000/api/incidents

# Filter by severity and status
curl "http://localhost:4000/api/incidents?severity=SEV1,SEV2&status=OPEN"

# Search with sorting
curl "http://localhost:4000/api/incidents?search=outage&sortBy=severity&sortOrder=asc"

# Create an incident
curl -X POST http://localhost:4000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "API latency spike", "service": "api-gateway", "severity": "SEV2"}'

# Update status
curl -X PATCH http://localhost:4000/api/incidents/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"status": "RESOLVED"}'
```

### Data Model

```
Incident
├── id         UUID (auto-generated)
├── title      string (required)
├── service    string (required)
├── severity   SEV1 | SEV2 | SEV3 | SEV4
├── status     OPEN | MITIGATED | RESOLVED (default: OPEN)
├── owner      string (optional)
├── summary    string (optional)
├── createdAt  timestamp
└── updatedAt  timestamp
```

---

## Commit Convention

Commit messages are enforced by [commitlint](https://commitlint.js.org/) with the **Conventional Commits** preset (`@commitlint/config-conventional`). A [Husky](https://typicode.github.io/husky/) `commit-msg` hook runs automatically on every commit.

Format: `type(scope?): description`

Examples:

```
feat: add incident search endpoint
fix: handle null owner in PATCH
chore: update prisma to v7.4
docs: add API examples to README
```

---

## Design Decisions & Tradeoffs

### Elysia over Express/Hono

Elysia is purpose-built for Bun with end-to-end type safety via TypeBox. Route parameter/body/query validation is declarative and generates OpenAPI docs automatically — no manual schema duplication. The tradeoff is a smaller ecosystem compared to Express.

### Prisma with Driver Adapter (`@prisma/adapter-pg`)

Using Prisma's driver adapter pattern with a raw `pg` Pool gives control over connection pooling (max connections, idle timeouts) while retaining Prisma's type-safe query API. This is important for Neon's serverless PostgreSQL where connection limits are strict. The tradeoff is slightly more setup compared to Prisma's built-in connection handling.

### Retry Logic via `$extends`

Prisma's `$extends` API wraps every database operation with automatic retry on transient errors (connection drops, timeouts). This is critical for serverless databases like Neon that suspend idle compute. The tradeoff is added complexity and slightly increased latency on retries (500ms–1.5s backoff).

### Server-Side Pagination, Filtering & Sorting

All data operations happen in PostgreSQL, not in application memory. The API sends only one page of results (~10 rows) regardless of total dataset size. This scales to thousands of incidents without performance degradation. The tradeoff is a network round-trip on every sort/filter change.

### PATCH over PUT for Updates

PATCH allows partial updates — clients send only changed fields. This avoids accidental data loss from omitting fields in a PUT request and reduces payload size.

### Comma-Separated Multi-Value Filters

Severity and status filters accept comma-separated values (`?severity=SEV1,SEV2`) using Prisma's `in` operator. This keeps the URL simple and avoids repeated query params (`?severity=SEV1&severity=SEV2`). The tradeoff is manual parsing vs. framework-level array param support.

### Database Indexes

Composite index on `[status, severity]` optimizes the most common dashboard query (open incidents by severity). Individual indexes on `service`, `severity`, `status`, and `createdAt` cover filtering and sorting use cases. The tradeoff is slightly slower writes.

### Multi-Stage Docker Build

Four-stage Dockerfile separates dependency installation, build/validation, and production runtime. Dev dependencies (Prisma CLI, TypeScript) are excluded from the final image. Typechecking at build time prevents deploying broken code. Layer caching means code-only changes don't reinstall dependencies.

### Centralized Error Handling

The `onError` handler maps database errors to 503 (Service Unavailable), validation errors to 400, and unknown errors to 500 — providing consistent error responses without try/catch blocks in every route.

---

## Improvements With More Time

- **Authentication & authorization** — JWT/session-based auth, role-based access control (viewer/editor/admin)
- **Delete endpoint** — `DELETE /api/incidents/:id` with soft-delete support
- **Incident timeline/history** — Audit log tracking status changes, who changed what and when
- **Rate limiting** — Protect API from abuse with per-IP or per-user rate limits
- **Request validation tests** — Integration tests for each endpoint with edge cases
- **Full-text search with PostgreSQL `tsvector`** — Replace `ILIKE` with proper full-text indexing for better search performance at scale
- **Cursor-based pagination** — More efficient than offset-based for large datasets and real-time data
- **WebSocket support** — Real-time incident updates pushed to connected clients
- **Structured logging** — JSON logs with request IDs for observability (correlation across services)
- **Health check with DB ping** — Current `/health` doesn't verify database connectivity
- **CI/CD pipeline** — GitHub Actions for lint, typecheck, test, build, and deploy
- **API versioning** — `/api/v1/incidents` to allow non-breaking API evolution

---

## Deploy To Hetzner VPS (Production)

This repository includes production deployment helpers:

- `.env.production.example`
- `docker-compose.prod.yml`
- `scripts/deploy-hetzner.sh`
- `scripts/nginx-tracepoint-api.conf`

### 1) Provision VPS

- Ubuntu 24.04 recommended
- Open ports 22, 80, 443
- Install Docker, Docker Compose plugin, and Nginx

### 2) Prepare app on the VPS

```bash
git clone <your-repository-url>
cd tracepoint-backend
cp .env.production.example .env.production
# edit .env.production with real values
chmod +x scripts/deploy-hetzner.sh
```

### 3) Deploy containers + run Prisma migrations

```bash
./scripts/deploy-hetzner.sh
```

This command sequence:

1. starts PostgreSQL
2. runs `prisma migrate deploy`
3. builds and starts API container

### 4) Configure Nginx reverse proxy

```bash
sudo cp scripts/nginx-tracepoint-api.conf /etc/nginx/sites-available/tracepoint-api
sudo ln -s /etc/nginx/sites-available/tracepoint-api /etc/nginx/sites-enabled/tracepoint-api
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` in `scripts/nginx-tracepoint-api.conf` to your API domain first.

### 5) Enable SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
sudo certbot renew --dry-run
```

### 6) Verify

```bash
curl http://127.0.0.1:4000/health
```

Then check:

- `https://api.yourdomain.com/health`
- `https://api.yourdomain.com/openapi`
