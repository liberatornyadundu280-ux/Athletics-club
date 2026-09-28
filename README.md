# STMS - Smart Trainer Management System

Multi-club athletics management platform with offline-first PWA, real-time attendance, AI-powered recommendations, and comprehensive club management.

## 🏗️ Architecture

```
stms/
├── apps/
│   ├── backend/          # Node.js/Express API (TypeScript)
│   └── frontend/         # React/Vite PWA (TypeScript)
├── packages/
│   ├── shared/           # Shared types, Zod schemas, constants
│   ├── ui/               # Design system components (Storybook)
│   └── config/           # Shared ESLint, Prettier, Turbo configs
├── docker-compose.yml    # Local development stack
└── turbo.json            # Turborepo pipeline config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Firebase project (Auth + Firestore)
- MongoDB Atlas cluster
- Cloudinary account

### 1. Clone & Install
```bash
git clone <repo>
cd stms
pnpm install
```

### 2. Environment Setup
```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit with your credentials

# Frontend
cp apps/frontend/.env.example apps/frontend/.env
# Edit with your credentials
```

### 3. Generate RS256 Keys (one-time)
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Copy contents to .env JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
```

### 4. Start Development
```bash
# Option A: Docker (recommended)
docker-compose up -d

# Option B: Local
pnpm dev
```

### 5. Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/healthz
- API Docs: Import `apps/backend/openapi.yaml` into Postman/Swagger

## 📦 Project Structure

### Apps

| App | Tech | Port | Description |
|-----|------|------|-------------|
| `backend` | Node.js + Express + TypeScript | 3000 | REST API with Firebase Auth, MongoDB, Redis |
| `frontend` | React 18 + Vite + TypeScript | 5173 | PWA with React Query, Tailwind, Firebase |

### Packages

| Package | Purpose |
|---------|---------|
| `@stms/shared` | Types, Zod schemas, constants, validation |
| `@stms/ui` | Design system (Button, Input, Card, Modal, Table...) |
| `@stms/config` | Shared ESLint, Prettier, Turbo, TSConfig |

## 🔐 Authentication

- **Firebase Auth**: Google OAuth + Email/Password
- **JWT**: RS256 access tokens (15min) + refresh tokens (7d, httpOnly cookie)
- **Custom Claims**: Role, clubIds, activeClubId, permissions
- **RBAC**: Role-based + permission-based (8-letter codes)

## 🏢 Multi-Tenant Architecture

Every document scoped by `clubId`. Middleware injects `req.clubId` on all requests.

```
User → Club Membership → Role → Permissions
```

Roles: `system_admin` > `club_admin` > `coach` > `athlete`

## 📱 PWA Features

- Offline-first workout player (IndexedDB + Service Worker)
- Background sync for attendance/completions
- Install prompt, shortcuts, push notifications
- iOS "Add to Home Screen" guide

## 🧪 Testing

```bash
# Unit tests
pnpm test:unit

# Integration tests (requires MongoDB + Redis)
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

## 🏗️ CI/CD

GitHub Actions pipeline:
```
lint → typecheck → unit tests → integration tests → build → deploy staging → deploy production
```

## 📚 Documentation

- API Spec: `apps/backend/openapi.yaml`
- Design System: Run `pnpm storybook` in `packages/ui`
- Database Migrations: `apps/backend/src/migrations/`

## 🔑 Required Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Redis connection string |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM) |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM) |
| `ALLOWED_ORIGINS` | Comma-separated Vercel URLs |
| `CLOUDINARY_*` | Cloudinary credentials |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_FIREBASE_*` | Firebase config |

## 🤝 Contributing

1. Create feature branch
2. Write tests
3. Ensure lint/typecheck pass
4. Submit PR

## 📄 License

Proprietary - STMS Team