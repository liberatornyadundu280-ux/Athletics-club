# Sprint 1 TASKS.md - Atomic Task Breakdown

## Overview
**Duration:** 2 weeks  
**Goal:** Foundation + Auth + Clubs (Multi-tenant ready)  
**Team:** 4 Agents (Backend, Frontend, Shared Contract, DevOps) + You (Reviewer)

---

## Agent Assignments

| Agent | Repository Scope | Primary Files |
|-------|------------------|---------------|
| **Backend** | `apps/backend/**` | Controllers, services, routes, middleware, models |
| **Frontend** | `apps/frontend/**` | Pages, components, hooks, context, services |
| **Shared Contract** | `packages/shared/**` | Types, Zod schemas, API constants, error codes |
| **DevOps** | `packages/config/**`, `docker-compose.yml`, `.github/**`, root configs | CI/CD, linting, Docker, Turbo config |

---

## Sprint 1 Tasks (25 Atomic Tasks)

### Phase 1: Project Setup (Days 1-2)

#### TASK-001: Initialize Turborepo Monorepo
- **Owner:** DevOps
- **Files:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- **Acceptance:** `pnpm install` works, `turbo run build` runs
- **Deps:** None

#### TASK-002: Configure Shared Package Structure
- **Owner:** DevOps
- **Files:** `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- **Acceptance:** `@stms/shared` importable from other packages
- **Deps:** TASK-001

#### TASK-003: Configure Backend Package
- **Owner:** DevOps
- **Files:** `apps/backend/package.json`, `apps/backend/tsconfig.json`, `apps/backend/.eslintrc.cjs`
- **Acceptance:** `cd apps/backend && pnpm dev` starts TypeScript server
- **Deps:** TASK-001

#### TASK-004: Configure Frontend Package
- **Owner:** DevOps
- **Files:** `apps/frontend/package.json`, `apps/frontend/tsconfig.json`, `apps/frontend/vite.config.ts`, `apps/frontend/.eslintrc.cjs`
- **Acceptance:** `cd apps/frontend && pnpm dev` starts Vite on port 5173
- **Deps:** TASK-001

#### TASK-005: Docker Compose for Local Dev
- **Owner:** DevOps
- **Files:** `docker-compose.yml`, `docker-compose.override.yml.example`
- **Services:** MongoDB, Redis, Firebase Emulator (Auth + Firestore)
- **Acceptance:** `docker-compose up -d` → all healthy
- **Deps:** TASK-001

---

### Phase 2: Shared Contracts (Days 2-3)

#### TASK-006: Define Zod Schemas for Auth API
- **Owner:** Shared Contract
- **Files:** `packages/shared/src/api/auth.ts`
- **Schemas:** `RegisterRequest`, `LoginRequest`, `GoogleAuthRequest`, `TokenResponse`, `RefreshResponse`, `AuthMeResponse`, `SwitchClubRequest`, `InviteUserRequest`, `UpdateUserRoleRequest`
- **Exports:** Types + Zod schemas + error codes
- **Acceptance:** Frontend + Backend can import identical types
- **Deps:** TASK-002

#### TASK-007: Define Zod Schemas for User/Club API
- **Owner:** Shared Contract
- **Files:** `packages/shared/src/api/users.ts`, `packages/shared/src/api/clubs.ts`
- **Schemas:** User CRUD, Club CRUD, Membership, Pagination, Query params
- **Acceptance:** Identical validation on FE + BE
- **Deps:** TASK-006

#### TASK-008: Define Shared Types & Constants
- **Owner:** Shared Contract
- **Files:** `packages/shared/src/types/index.ts`, `packages/shared/src/constants/permissions.ts`, `packages/shared/src/constants/roles.ts`, `packages/shared/src/constants/errors.ts`
- **Content:** UserRole, UserStatus, MembershipRole, Permission enum (8-letter), Role hierarchy, ERROR_CODES
- **Acceptance:** Single source of truth for all enums
- **Deps:** TASK-006

#### TASK-009: Define Validation Utilities
- **Owner:** Shared Contract
- **Files:** `packages/shared/src/utils/validation.ts`
- **Content:** Common Zod schemas (ObjectId, Email, Password, etc.), ApiResponse wrappers, helpers
- **Acceptance:** Reusable validation across FE/BE
- **Deps:** TASK-006

---

### Phase 3: Backend Core (Days 3-6)

#### TASK-010: Environment Config & Validation
- **Owner:** Backend
- **Files:** `apps/backend/src/config/env.ts`
- **Validates:** All required env vars at startup
- **Acceptance:** Throws descriptive error if missing
- **Deps:** TASK-003

#### TASK-011: MongoDB Connection + Graceful Shutdown
- **Owner:** Backend
- **Files:** `apps/backend/src/config/database.ts`
- **Features:** Connection pooling, retry logic, SIGINT/SIGTERM handlers
- **Acceptance:** Connects to local Docker MongoDB, survives restarts
- **Deps:** TASK-010, TASK-005

#### TASK-012: Firebase Admin SDK + Custom Claims Helpers
- **Owner:** Backend
- **Files:** `apps/backend/src/config/firebase.ts`
- **Exports:** `setUserClaims`, `getUserClaims`, `revokeUserClaims`, `verifyIdToken`
- **Acceptance:** Can sync claims from Firestore triggers
- **Deps:** TASK-010

#### TASK-013: JWT Token Utils (RS256 + Refresh Rotation)
- **Owner:** Backend
- **Files:** `apps/backend/src/utils/tokens.ts`
- **Features:** `generateTokens`, `hashRefreshToken`, `storeRefreshToken` (Redis), `verifyRefreshToken`, `revokeRefreshToken`
- **Acceptance:** Access 15min, Refresh 7d, rotation works, Redis TTL
- **Deps:** TASK-010, TASK-005

#### TASK-014: Custom Error Classes + Global Error Handler
- **Owner:** Backend
- **Files:** `apps/backend/src/utils/errors.ts`, `apps/backend/src/middleware/error-handler.ts`
- **Errors:** ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, RateLimitError
- **Acceptance:** Consistent JSON error responses, proper logging
- **Deps:** TASK-010

#### TASK-015: Auth Middleware (JWT Verify + Club Injection)
- **Owner:** Backend
- **Files:** `apps/backend/src/middleware/auth.middleware.ts`, `apps/backend/src/middleware/club.middleware.ts`, `apps/backend/src/middleware/rbac.middleware.ts`
- **Features:** `authenticate`, `optionalAuth`, `injectClubId`, `verifyClubAccess`, `requireRole`, `requirePermission`, `requireMinRole`
- **Acceptance:** All protected routes get `req.user` + `req.clubId`
- **Deps:** TASK-012, TASK-013

#### TASK-015b: Rate Limiting + Security Middleware
- **Owner:** Backend
- **Files:** `apps/backend/src/middleware/rate-limit.middleware.ts`, `apps/backend/src/middleware/logger.middleware.ts`
- **Limiters:** `apiLimiter` (100/15min), `authLimiter` (5/15min), `sensitiveLimiter` (10/hr)
- **Logger:** Pino with request ID, duration, user context
- **Acceptance:** Rate limits enforced, structured logs
- **Deps:** TASK-005, TASK-014

#### TASK-016: Validation Middleware (Zod)
- **Owner:** Backend
- **Files:** `apps/backend/src/middleware/validation.middleware.ts`
- **Export:** `validate(schema)` for body/query/params
- **Acceptance:** 400 with field-level errors on invalid input
- **Deps:** TASK-006, TASK-014

#### TASK-017: Auth Service (Business Logic)
- **Owner:** Backend
- **Files:** `apps/backend/src/services/auth.service.ts`
- **Methods:** `register`, `login`, `loginWithGoogle`, `refreshToken`, `logout`, `switchClub`, `getUserById`, `updateUserRole`, `deleteUser`
- **Acceptance:** All flows work, Firebase + MongoDB synced, claims updated
- **Deps:** TASK-011, TASK-012, TASK-013, TASK-014

#### TASK-018: User/Club Services
- **Owner:** Backend
- **Files:** `apps/backend/src/services/user.service.ts`, `apps/backend/src/services/club.service.ts`
- **User:** `listUsers`, `inviteUser`, `getUser`, `updateRole`, `deleteUser`, `switchClub`
- **Club:** `createClub`, `getClub`, `updateClub`, `getMembers`
- **Acceptance:** Club-scoped queries, proper permissions
- **Deps:** TASK-011, TASK-014, TASK-017

#### TASK-019: Auth Routes
- **Owner:** Backend
- **Files:** `apps/backend/src/routes/auth.routes.ts`
- **Endpoints:** POST `/register`, `/login`, `/google`, `/refresh`, `/logout`, GET `/me`, POST `/switch-club`
- **Middleware:** `authLimiter` on auth endpoints, `validate` on all
- **Acceptance:** OpenAPI spec matches implementation
- **Deps:** TASK-016, TASK-017

#### TASK-020: User/Club Routes
- **Owner:** Backend
- **Files:** `apps/backend/src/routes/user.routes.ts`, `apps/backend/src/routes/club.routes.ts`
- **Endpoints:** GET/POST `/users`, GET/PATCH/DELETE `/users/:id`, POST `/users/invite`, GET `/clubs`, POST `/clubs`, GET/PATCH `/clubs/:id`, GET `/clubs/:id/members`
- **Middleware:** `authenticate`, `injectClubId`, `requireRole`, `requirePermission`, `verifyClubAccess`
- **Acceptance:** Club-scoped, RBAC enforced
- **Deps:** TASK-016, TASK-018

#### TASK-020b: App Entry + Health Check
- **Owner:** Backend
- **Files:** `apps/backend/src/app.ts`, `apps/backend/src/server.ts`
- **Features:** Helmet, CORS, compression, request logging, `/healthz`, global error handler
- **Acceptance:** Server starts, health check returns 200, all middleware ordered correctly
- **Deps:** TASK-013, TASK-014, TASK-015, TASK-019, TASK-020

---

### Phase 4: Frontend Core (Days 4-7)

#### TASK-021: Frontend App Shell + Routing
- **Owner:** Frontend
- **Files:** `apps/frontend/src/main.tsx`, `apps/frontend/src/App.tsx`, `apps/frontend/src/routes.tsx`
- **Features:** QueryClient, BrowserRouter, AuthProvider, ThemeProvider, Toaster, lazy-loaded routes
- **Routes:** Public (login/register/forgot) + Protected (all modules)
- **Acceptance:** Route guards work, lazy loading, proper fallbacks
- **Deps:** TASK-004

#### TASK-022: Auth Context + Firebase Integration
- **Owner:** Frontend
- **Files:** `apps/frontend/src/context/AuthContext.tsx`, `apps/frontend/src/services/firebase.ts`
- **Features:** `useAuth` hook, login/register/Google/logout/switchClub/refreshUser, token persistence (localStorage), `hasPermission`, `hasRole`
- **Firebase:** `signInWithGoogle`, `getIdToken`, `onAuthStateChanged`
- **Acceptance:** Full auth flow works, tokens refresh, club switch updates context
- **Deps:** TASK-021

#### TASK-023: Theme Context
- **Owner:** Frontend
- **Files:** `apps/frontend/src/context/ThemeContext.tsx`
- **Features:** light/dark/system, persists to localStorage, applies to `<html>`
- **Acceptance:** Toggle works, system preference respected, no flash
- **Deps:** TASK-021

#### TASK-024: API Service Layer (Axios + Interceptors)
- **Owner:** Frontend
- **Files:** `apps/frontend/src/services/api.ts`
- **Features:** Base URL, auth header injection, auto token refresh (401 → refresh → retry), error formatting, `hasPermission`/`hasRole` helpers
- **Acceptance:** Transparent auth, refresh rotation works, typed responses
- **Deps:** TASK-022

#### TASK-025: Layout Components (Sidebar, Header, ClubSwitcher)
- **Owner:** Frontend
- **Files:** `apps/frontend/src/components/layout/Sidebar.tsx`, `Header.tsx`, `ClubSwitcher.tsx`, `MainLayout.tsx`
- **Features:** Role-based nav, responsive drawer, club switcher dropdown, mobile hamburger
- **Acceptance:** All roles see correct nav, club switch updates API calls
- **Deps:** TASK-022, TASK-023

#### TASK-026: Auth Pages (Login, Register, Forgot Password)
- **Owner:** Frontend
- **Files:** `apps/frontend/src/pages/auth/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`
- **Features:** React Hook Form + Zod validation, Google OAuth button, password strength meter, remember me, toast notifications
- **Acceptance:** Forms validate, submit to API, redirect on success, error toasts
- **Deps:** TASK-022, TASK-024

---

### Phase 5: Testing + CI + Polish (Days 8-10)

#### TASK-027: Backend Unit Tests
- **Owner:** Backend
- **Files:** `apps/backend/tests/unit/**/*.test.ts`
- **Coverage:** AuthService, token utils, permission logic, RBAC middleware
- **Target:** 80%+ coverage
- **Acceptance:** `pnpm test:unit` passes in CI
- **Deps:** TASK-017, TASK-018

#### TASK-028: Backend Integration Tests
- **Owner:** Backend
- **Files:** `apps/backend/tests/integration/**/*.test.ts`
- **Tests:** Full auth flow (register→login→me→refresh→logout), RBAC denial, club isolation, rate limiting
- **Services:** Testcontainers for MongoDB + Redis
- **Acceptance:** `pnpm test:integration` passes in CI
- **Deps:** TASK-019, TASK-020

#### TASK-029: Frontend Unit Tests
- **Owner:** Frontend
- **Files:** `apps/frontend/src/**/*.test.tsx`
- **Tests:** AuthContext, api service, form validation, utility functions
- **Target:** 70%+ coverage
- **Acceptance:** `pnpm test` passes
- **Deps:** TASK-022, TASK-024

#### TASK-030: GitHub Actions CI Pipeline
- **Owner:** DevOps
- **Files:** `.github/workflows/ci.yml`
- **Jobs:** lint → typecheck → unit tests → integration tests → build → deploy staging (develop) → deploy prod (main)
- **Services:** MongoDB, Redis for integration tests
- **Acceptance:** PR checks pass, staging deploys on develop push
- **Deps:** TASK-001, TASK-027, TASK-028, TASK-029

#### TASK-031: ESLint + Prettier + TypeCheck Scripts
- **Owner:** DevOps
- **Files:** Root `package.json`, `packages/config/eslint/*`, `packages/config/prettier/*`
- **Commands:** `pnpm lint`, `pnpm typecheck`, `pnpm format`
- **Acceptance:** Runs in CI, zero errors on clean code
- **Deps:** TASK-001

#### TASK-032: Storybook Setup (Design System Foundation)
- **Owner:** DevOps / Shared Contract
- **Files:** `packages/ui/.storybook/main.ts`, `preview.ts`, `package.json`
- **Content:** Button, Input, Card, Badge, Avatar, Modal, Table stories
- **Acceptance:** `pnpm storybook` runs, components documented
- **Deps:** TASK-002

---

## Dependency Graph

```
TASK-001
  ├─ TASK-002 ── TASK-006 ── TASK-007 ── TASK-008 ── TASK-009
  ├─ TASK-003 ── TASK-010 ── TASK-011 ── TASK-012 ── TASK-013 ── TASK-014 ── TASK-015 ── TASK-016 ── TASK-017 ── TASK-018 ── TASK-019 ── TASK-020 ── TASK-020b
  │                                                           │
  │                                                           ├─ TASK-027 ── TASK-028
  │                                                           │
  │                                                           └─ TASK-029
  ├─ TASK-004 ── TASK-021 ── TASK-022 ── TASK-023 ── TASK-024 ── TASK-025 ── TASK-026
  │                                                           │
  │                                                           └─ TASK-029
  ├─ TASK-005 ────────────────────────────────────────────────┘
  │
  ├─ TASK-030 (needs 027, 028, 029)
  ├─ TASK-031
  └─ TASK-032 (needs 002)
```

---

## Parallel Execution Strategy

### Week 1 (Days 1-5)
| Day | Backend | Frontend | Shared Contract | DevOps |
|-----|---------|----------|-----------------|--------|
| 1 | TASK-010, 011 | TASK-021 | TASK-006, 007, 008 | TASK-001, 002, 003, 004, 005 |
| 2 | TASK-012, 013, 014 | TASK-022 | (review) | TASK-031 |
| 3 | TASK-015, 015b, 016 | TASK-023 | | |
| 4 | TASK-017, 018 | TASK-024 | | |
| 5 | TASK-019, 020, 020b | TASK-025, 026 | | |

### Week 2 (Days 6-10)
| Day | Backend | Frontend | Shared Contract | DevOps |
|-----|---------|----------|-----------------|--------|
| 6 | TASK-027 | TASK-029 | | TASK-030, 032 |
| 7 | TASK-028 | (review) | | TASK-030 |
| 8 | (review PRs) | (review PRs) | | TASK-030 |
| 9 | Integration testing | Integration testing | | Deploy staging |
| 10 | Sprint review + retro | Sprint review + retro | | Deploy staging |

---

## Definition of Done (Per Task)

- [ ] Code written in correct package/files
- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] No `any` types (except test mocks)
- [ ] JSDoc comments on exported functions
- [ ] PR reviewed by you (human)

---

## Sprint 1 Success Criteria

1. **Auth works end-to-end:** Register → Login → Me → Refresh → Logout
2. **Club switching works:** User can switch clubs, API calls scoped correctly
3. **RBAC enforced:** Club admin can invite/users, athlete cannot
4. **Frontback integration:** FE calls BE, tokens refresh automatically
5. **CI green:** All checks pass on PR merge
5. **Staging deployed:** Accessible at `https://staging.stms.example.com`

---

## Next Steps

1. **You approve this plan** → I generate `TASKS.md` in repo
2. **You spin up agents** with their assigned tasks
3. **I coordinate** via PR reviews and task updates
4. **Sprint 2 planning** starts Day 8

---

**Ready to proceed?**