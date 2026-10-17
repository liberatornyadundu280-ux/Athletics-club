# STMS — Smart Trainer Management System

Multi-club athletics management platform: attendance, workouts, performance tracking, injury and
permission workflows, analytics, and an AI-driven training recommendation engine.

## Repository layout

```
managementsystem/
├── landing/              # Public landing page — every visitor sees this, then continues to login
├── stms-frontend/        # Coach / athlete application (React + Vite)
├── stms-backend/         # REST API (Node.js + Express + TypeScript)
├── feature_engineering/  # Python ML pipeline (feature engineering, training, inference worker)
└── Docs/                 # Requirements, architecture, decisions, session log
```

Each project is self-contained and owns its own `package.json`, lockfile, lint config and build.
There is no root workspace — install and run them independently.

## Prerequisites

- Node.js 20+
- MongoDB Atlas cluster (or local MongoDB)
- Redis (local or cloud) — rate limiting, refresh tokens, and ML inference streams
- Firebase project with Auth enabled
- Cloudinary account (media storage)
- Python 3.10+ (only for `feature_engineering/`)

## Getting started

### 1. Landing page

```bash
cd landing
npm install
npm run dev      # http://localhost:5173
npm run build    # single-file bundle in dist/
```

Set `VITE_APP_URL` to the deployed app URL so the "Get Started" actions continue to the login page.

### 2. Backend API

```bash
cd stms-backend
cp .env.example .env      # fill in credentials
npm install

# One-time: generate RS256 keys
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# paste into .env as JWT_PRIVATE_KEY / JWT_PUBLIC_KEY

npm run dev               # http://localhost:5000 · health check at /healthz
```

Local stack (MongoDB, Redis, Firebase emulator):

```bash
docker-compose up -d
```

### 3. Frontend app

```bash
cd stms-frontend
cp .env.example .env
npm install
npm run dev
```

## Testing, linting, building

Run these from inside the relevant project directory:

| Command | Scope |
| ------- | ----- |
| `npm run typecheck` | `stms-backend`, `landing`, `stms-frontend` |
| `npm run lint` | `stms-backend`, `stms-frontend` |
| `npm run test:unit` | `stms-backend` (Vitest) |
| `npm run test:integration` | `stms-backend` (needs MongoDB + Redis) |
| `npm run build` | all three |

## Authentication

- **Firebase Auth** — email/password and Google OAuth
- **Access token** — RS256 JWT, 15 minutes, `Authorization` header
- **Refresh token** — HttpOnly cookie, 7 days, rotated on each use
- **RBAC** — `system_admin` > `club_admin` > `coach` > `athlete`, plus permission codes such as
  `workout:read`, `attendance:write`, `permission:approve`

## Multi-tenant isolation

Every club-owned document is scoped by `clubId`, injected as `req.clubId` from the caller's active
club. All queries filter on `clubId`, and writes verify record ownership and role before applying.

## Required environment variables

### Backend

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin service account |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | RS256 key pair |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `CLOUDINARY_*` | Media storage |
| `ML_MODEL_ENABLED`, `ML_INFERENCE_*` | Recommendation-engine inference |

### Frontend / landing

| Variable | Purpose |
| -------- | ------- |
| `VITE_API_URL` | Backend API base URL |
| `VITE_FIREBASE_*` | Firebase client config |
| `VITE_APP_URL` | Landing page → app URL |

## Documentation

Everything about the system's design and progress lives in `Docs/`:

- `Docs/AgentsDocumentation/tasks/` — implementation plans and per-sprint checklists
- `Docs/AgentsDocumentation/datasets/` — sample import data
- `ProjectSummary.md` — append-only session log of decisions

## CI

`.github/workflows/ci.yml` at the **repository root** builds all three projects on every push and
pull request that touches `managementsystem/`. Backend unit tests run non-blocking while the stale
tests are rewritten.

## License

Proprietary — STMS Team
