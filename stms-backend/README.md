# STMS Backend

Smart Trainer Management System - Backend API built with Node.js, Express, TypeScript, MongoDB, and Firebase Auth.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas cluster (or local MongoDB)
- Redis (local or cloud)
- Firebase project with Auth enabled
- Cloudinary account (for media storage)

### Installation

```bash
# Clone and install
cd stms-backend
cp .env.example .env
# Edit .env with your credentials
npm install

# Generate RS256 keys (one-time)
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Copy contents to .env JWT_PRIVATE_KEY and JWT_PUBLIC_KEY

# Start development server
npm run dev
```

### Docker Development

```bash
# Start all services (MongoDB, Redis, Firebase Emulator, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

## 📁 Project Structure

```
src/
├── config/         # Configuration (env, firebase, database)
├── controllers/    # Request handlers (to be implemented)
├── middleware/     # Auth, validation, rate-limit, errors, logging
├── migrations/     # MongoDB migrations (Mongock-style)
├── models/         # Database models (to be implemented)
├── repositories/   # Data access layer (to be implemented)
├── routes/         # API route definitions
├── services/       # Business logic
├── types/          # TypeScript types
├── utils/          # Helpers (errors, tokens, constants)
├── app.ts          # Express app setup
└── server.ts       # Entry point
```

## 🔐 Authentication

### Token Strategy
- **Access Token**: RS256 JWT, 15 min expiry, in Authorization header
- **Refresh Token**: HttpOnly cookie, 7 days, rotated on each use
- **Custom Claims**: Synced via Firebase Cloud Functions

### Roles & Permissions
| Role | Description |
|------|-------------|
| `system_admin` | Platform-wide access |
| `club_admin` | Club management, user management, all modules |
| `coach` | Athlete management, workouts, attendance, injuries |
| `athlete` | Own profile, workouts, attendance, performance |

### 8-Letter Permission System
Permissions use codes like `workout:read`, `attendance:write`, `permission:approve`

## 🛠️ API Endpoints (Sprint 1)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (requires Firebase Client SDK) |
| POST | `/api/v1/auth/google` | Login with Google OAuth |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/switch-club` | Switch active club |

### Users (Club Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List club users |
| POST | `/api/v1/users/invite` | Invite user to club |
| GET | `/api/v1/users/:id` | Get user details |
| PATCH | `/api/v1/users/:id/role` | Update user role |
| DELETE | `/api/v1/users/:id` | Soft delete user |

### Clubs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/clubs` | Create club (system_admin) |
| GET | `/api/v1/clubs/:id` | Get club details |
| PATCH | `/api/v1/clubs/:id` | Update club settings |
| GET | `/api/v1/clubs/:id/members` | List club members |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check |

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Unit tests with coverage
npm run test:unit -- --coverage

# Integration tests (requires MongoDB & Redis)
npm run test:integration

# Watch mode
npm run test:unit:watch
```

## 📦 Build & Deploy

```bash
# Build
npm run build

# Production start
npm start

# Docker build
docker build -t stms-backend .

# Lint
npm run lint
npm run lint:fix

# Type check
npm run typecheck
```

## 🔧 Key Features

- **Multi-tenant**: Club-scoped data isolation via middleware
- **Firebase Auth**: Email/password + Google OAuth
- **JWT + Refresh Tokens**: RS256, rotation, HttpOnly cookies
- **RBAC**: Role-based + permission-based access control
- **Rate Limiting**: Redis-backed, different limits per endpoint
- **Audit Logging**: All write operations logged
- **OpenAPI Spec**: `openapi.yaml` for contract testing
- **Migrations**: Versioned schema changes

## 📝 Environment Variables

See `.env.example` for all required variables.

### Required
- `MONGODB_URI`
- `REDIS_URL`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`
- `ALLOWED_ORIGINS`

### Optional
- `CLOUDINARY_*`
- `SENTRY_DSN`
- `LOG_LEVEL`

## 📚 Documentation

- API Spec: `openapi.yaml`
- Migration: `src/migrations/001-initial-schema.ts`
- Firebase Functions: `functions/src/index.ts`

## 🤝 Contributing

1. Create feature branch
2. Write tests
3. Ensure lint/typecheck pass
4. Submit PR

## 📄 License

Proprietary - STMS Team