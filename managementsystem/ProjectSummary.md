# Project Summary — Session Log

## Session 1 — 2026-10-01

**Contributor(s):** AI Assistant (opencode)

**Focus:** Connect local XGBoost RPE recommendation model to STMS backend via Redis Streams inference worker

**Decisions made:**

- **Architecture**: Use Redis Streams for async communication between Node.js backend and Python inference worker. This provides reliable message delivery, consumer groups for scaling, and built-in acknowledgment.
- **Integration Pattern**: Backend publishes trigger with `requestId` to `stms:recommendation:triggers` stream; inference worker processes and writes result to `stms:recommendation:triggers:results` stream with same `requestId` for correlation.
- **ML Outputs**: Extended model output to include `injuryRisk` and `progressionAdjustment` fields computed from features, in addition to predicted RPE, focus, intensity, and confidence.
- **Fallback**: Cold-start rule-based recommendations remain as fallback when ML is disabled or times out.

**Changes / additions:**

- Added ML environment variables to `.env` and `.env.example`: `ML_MODEL_ENABLED`, `ML_INFERENCE_STREAM_KEY`, `ML_INFERENCE_CONSUMER_GROUP`, `ML_INFERENCE_TIMEOUT_MS`
- Created shared Redis client module at `src/config/redis.ts` for ML inference
- Implemented `callMLInference` in `src/services/recommendation.service.ts` using Redis Streams with request/response correlation and timeout
- Updated Python inference worker (`managmentsystem/feature_engineering/stms_ml/inference_worker.py`) to:
  - Read `requestId` from incoming trigger messages
  - Write results to results stream with correlation ID
  - Include `injury_risk_score` and `progression_adjustment` in output
  - Estimate injury risk and progression adjustment from features
- Created startup scripts for inference worker: `start_worker.sh` (Linux/macOS) and `start_worker.bat` (Windows)

**Skill(s) used:**
- backend-development

**Open questions / next steps:**

- Deploy and run inference worker in production environment (Render/Redis)
- Verify end-to-end integration with real data
- Add monitoring/metrics for inference latency and success rate
- Consider adding multi-target model for focus/intensity classification in addition to RPE regression
- Add circuit breaker pattern for ML inference failures

## Session 2 — 2026-10-01

**Contributor(s):** GitHub Copilot

**Focus:** Prepare synthetic athlete roster data for club setup.

**Decisions made:**

- **Changes / additions:** Added `Docs/AgentsDocumentation/datasets/athlete-roster-sample.csv` with 24 fictional athlete profiles matching the existing roster CSV importer. All emails use the reserved `example.com` domain.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** Import the CSV from the club's athlete roster. It creates athlete profiles only; Firebase sign-in accounts must be created separately through the invitation/registration flow.

## Session 3 — 2026-10-01

**Contributor(s):** GitHub Copilot

**Focus:** Improve workout recommendation generation and plan visibility.

**Decisions made:**

- **Changes / additions:** The recommendation screen now selects the first available athlete, directs coaches to add athletes when the roster is empty, and shows all prescription fields for a selected saved workout.
- **Skill(s) used (if any):** frontend-design, vercel-react-best-practices.
- **Open questions / next steps:** Recommendations remain training guidance rather than standalone generated workouts; coaches select saved workouts to assign. The frontend file diagnostics pass; the Vite build did not return a captured completion result.

## Session 4 — 2026-10-17

**Contributor(s):** AI Assistant (opencode)

**Focus:** Split the repository so STMS is self-contained under `managementsystem/`, then restore a working build, CI and lint across its three projects.

**Decisions made:**

- **Repository layout:** STMS now owns `managementsystem/` with three independent projects — `landing/`, `stms-frontend/`, `stms-backend/` — plus `feature_engineering/` and `Docs/`. The Athletics Club Website keeps the repository root. There is no root workspace or Turbo pipeline; each project carries its own manifest, lockfile, lint config and build.
- **Duplicate scaffolding deleted:** the root `apps/` prototype and the unreferenced `packages/` workspaces (`@stms/shared`, `@stms/ui`) were removed after confirming zero imports across both real projects. `turbo.json`, `tsconfig.base.json`, `pnpm-workspace.yaml`, the stale root `package-lock.json` and root `node_modules/` went with them.
- **The landing page is the public entry point and stays separate from the app:** it is a standalone Vite app at `managementsystem/landing`. The in-app landing page inside `stms-frontend` is kept deliberately. Visitors see the landing page, then continue to login.
- **CI lives at the repository root**, because GitHub only reads `.github/workflows` there.
- **Redis dependency drift corrected:** declare `redis` where it is imported, drop the unused `ioredis`.

**Changes / additions:**

- Moved the monorepo scaffolding, `README.md`, `TASKS.md`, `LICENSE`, `.prettierrc` and `.gitignore` into `managementsystem/`.
- Created `managementsystem/landing/` (`index.html`, `src/`, `public/`, `vite.config.ts`, `tsconfig.json`) and reconstructed its lost `package.json` — react, framer-motion, lenis, lucide-react, clsx, tailwind-merge, tailwindcss v4, `@tailwindcss/vite`, `vite-plugin-singlefile`. The manifest had been lost when the monorepo root `package.json` took over the folder, so the app had never been typechecked or built.
- Fixed two latent landing-page bugs: added `landing/src/vite-env.d.ts` for the `import.meta.env` typings, and the missing `ButtonPrimary` import in `landing/src/components/Navbar.tsx`. The landing build now passes (442 kB, 129 kB gzip, single file).
- Declared `redis@^6.2.1` in `stms-backend` and removed `ioredis`. This resolved 8 cascading TypeScript errors (TS2307 plus implicit-any) in `config/redis.ts`, `middleware/rate-limit.middleware.ts` and `utils/tokens.ts`; `typecheck` and `build` pass again.
- Replaced the repository-root CI workflow and deleted the invisible nested `stms-backend/.github/`. Backend unit tests run as a non-blocking job.
- Replaced the monorepo-root `.eslintrc.cjs` with `stms-backend/.eslintrc.cjs`, and added the missing `eslint-plugin-react` and `eslint-config-prettier` to `stms-frontend`.
- Rewrote `managementsystem/README.md` against the real layout and corrected the stale paths in `Agents.md`; added a Repository Layout section and filled in Setup & Commands.
- Archived the two duplicate project summaries into `Docs/archive/` (no history discarded).

**Skill(s) used:** none (no skill loaded)

**Open questions / next steps:**

- Rewrite the 5 stale tests in `stms-backend/tests/unit/auth.service.test.ts` (they pass non-ObjectId ids to `switchClub`, `refreshToken` and `logout`) so backend unit tests can block CI again.
- Reduce lint debt: 57 errors in `stms-backend`, 805 in `stms-frontend`, mostly `@typescript-eslint/no-explicit-any`.
- Decide where the landing page deploys (separate Vercel project?) and point `VITE_APP_URL` at the deployed app.
- The two-repository git split (`git filter-repo`) is still pending.
- Restore or discard the two SmartCivic decks deleted from `Docs/` — recoverable from git history only.
- This reorganization is not yet committed.

## Session 5 — 2026-10-17

**Contributor(s):** AI Assistant (opencode)

**Focus:** Make the system runnable end to end — scrub the committed credentials, turn the dormant schema migrations into something that actually runs, stand up a seedable database, and get a working login.

**Decisions made:**

- **Migrations get a real runner (option A), before the seed.** The two migration files had never been executed, which mattered more than expected: `users`, `clubs`, `club_memberships` and `audit_logs` had **no indexes at all** in `config/database.ts`. Their unique constraints on `email`, `firebaseUid` and `slug` existed only in migration 001, so nothing was stopping duplicate accounts. Migrations now run first, and the seed runs after them.
- **Migrations are idempotent rather than one-shot.** `connectToDatabase()` creates several of the same collections implicitly through `createIndexes()`, so a plain `db.createCollection()` throws `NamespaceExists` the second time a database is touched. Rewrote both migrations to use `ensureCollection` (create, or `collMod` when the collection is present) and `ensureIndexes` (create only what is missing). This keeps a retried migration safe, which is what lets the runner record a migration only after it succeeds.
- **STMS gets its own database.** `MONGODB_URI` had no database name, so the driver fell back to MongoDB's default `test` — which turned out to be shared with an unrelated campus management application (90 accounts living in the *same* `users` collection under a completely different schema). Target is now `stms_dev`, which is what `docker-compose.yml` and `.env.example` had specified all along.
- **The credential leak is fixed by rotation, not by history rewriting.** The live MongoDB password and Cloudinary secret are in `HEAD` and in `1270414`, and the two copies disagree, so one variant is already stale. Scrubbing the files does not invalidate them; rotation does. `git filter-repo` is not required.
- **Secrets move to the environment.** `stms_ml/config.yaml` is committed and now holds no credentials; the Python pipeline overlays `MONGO_URI`, `MONGO_DB`, `REDIS_URL` and `CLOUDINARY_*` from the environment, matching what `inference_worker.py` already did.
- **The seed's admin account is `FIREBASE_INITIAL_ADMIN_EMAIL`.** It is an existing Firebase account, so it is reused untouched (sign in with Google). The coach account defaults to the reserved `coach@example.com` rather than deriving from the admin's domain — deriving it from a Gmail address would have created an account at an address a stranger might own.
- **No demo history in the seed.** Fabricating `training_sessions`, `attendance_records` and `performance_results` documents without reading those routes first would have produced plausible-looking records with wrong field names. Left as an explicit follow-up instead.

**Changes / additions:**

- Untracked `feature_engineering/config.local.yaml` (`git rm --cached`) and added `feature_engineering/.gitignore` covering `config.local.yaml`, `*.local.yaml`, `__pycache__/` and `.env`. The file stays on disk for local runs.
- Stripped the live MongoDB URI and Cloudinary keys out of `feature_engineering/stms_ml/config.yaml`; added `feature_engineering/.env.example`.
- Made `stms_ml/features/pipeline.py` environment-aware: added `import os`, resolved `mongo_uri`/`database` through argument → environment → YAML → default, and overlaid the Cloudinary and Redis values in `_load_config`.
- Fixed a latent bug in both YAML files: the MongoDB URI was written as a **multiline YAML scalar**, so the parsed value ended with a newline. Normalised `config.local.yaml` on disk as well.
- Added `src/migrations/helpers.ts` (`ensureCollection`, `ensureIndexes`, `dropIndexesByName`), `src/migrations/index.ts` (ordered registry) and `src/migrations/runner.ts` (shared logic). Rewrote `001-initial-schema.ts` and `002-daily-readiness-and-exercise-enhancements.ts` to use the helpers.
- Rewrote `src/migrate.ts` as a CLI over the runner: applies pending migrations, `--list` for status, `--down` to roll back one, `--db <name>` to target another database, `--force` to permit a production rollback. It opens its own MongoDB connection so a migration run does not also trigger the application's index bootstrap.
- Fixed migration 002's rollback, which called `dropIndexes()` and would have removed `idx_exercises_club_name` and `idx_workouts_club_updated` — indexes the running application still needs. It now drops only its own indexes by name.
- Added `migrate:list` and `migrate:down` scripts. Fixed `migrate:test`, which used bash `NODE_ENV=test` inline syntax (broken on Windows) and would have been rejected by `env.ts` regardless; it is now `--db stms_test`, and `test` was added to the accepted `NODE_ENV` values.
- Wrote `src/seed.ts` (~430 lines): applies pending migrations, then upserts a club, a `system_admin` and a `coach` Firebase account, the 24-athlete roster from `Docs/AgentsDocumentation/datasets/athlete-roster-sample.csv`, and a 12-exercise catalogue with the phase/energy-system fields migration 002 adds. Sets Firebase custom claims from `utils/role-permissions.ts`. Every record is keyed on a natural key (email, slug, club+name), so re-running is safe.
- Pointed the local `MONGODB_URI` at `/stms_dev` and added a comment to `.env.example` explaining that the database name must be present, since its absence is silent.
- Ran the migrations against `stms_dev` and verified the result: 5 collections now carry live `$jsonSchema` validators (`users`, `clubs`, `club_memberships`, `audit_logs`, `daily_readiness`), indexes are in place, and the seed produced 2 accounts, 1 club, 24 athletes and 12 exercises. Also proved the rollback path by rolling both migrations back and re-applying.
- Confirmed `test` was not modified: still 93 users (72 of them campus roles), no validators, no `_migrations` collection.
- `typecheck` and `build` pass for the backend.

**Skill(s) used:** none (no skill loaded)

**Open questions / next steps:**

- **Rotate the leaked credentials** in the Atlas and Cloudinary consoles — the highest-priority outstanding item. Scrubbing the files did not invalidate them.
- **Update Render's `MONGODB_URI`** to end with `/stms_dev`, or production will keep reading the shared `test` database.
- Decide whether to copy the three STMS accounts still stranded in `test` (notably `liberatornyadundu2480@gmail.com`, a `system_admin`) into `stms_dev`, or simply re-promote them with `npm run admin:promote` after a first sign-in. Any account that signs in before it exists in `stms_dev` is provisioned as an `athlete`.
- Seed demo history for the review screens: `training_sessions`, `attendance_records`, `workouts` and `performance_results` are still empty. This needs those routes read first so the documents have the right shape.
- The AI/ML model remains last by design — `ruleEngine.ts` already produces recommendations, and the current model's training data is synthetic and its targets are not real coach decisions.
- Backend unit tests (5 of 11) and lint debt are unchanged from Session 4.
- This session's changes are not yet committed.

## Session 6 — 2026-10-18

**Contributor(s):** AI Assistant (opencode)

**Focus:** Get the system actually running on a developer machine. Login turned out to have a hard dependency on Redis, and Redis was unreachable from the local machine, so the system could not be signed into at all.

**Decisions made:**

- **Redis becomes an enhancement outside production, not a requirement.** `authLimiter` sits in front of `POST /auth/firebase`, so a rate-limit store that fails takes login down with it — and refresh-token storage (`storeRefreshToken`) is on the same login path. Both now fall back to an in-process store, which degrades the *strictness* of the limit and the *durability* of sessions rather than availability. Production still prefers the shared instance. The fallback is announced once, and announced as an error under `NODE_ENV=production`, because per-process refresh tokens are genuinely not shared between instances.
- **Never `await connect()` against an unreachable server.** node-redis retries on its own, so that promise never settles; awaiting it stalls the request for the entire command timeout. `getMLRedisClient()` now starts the connection in the background and refuses the request immediately until the client is ready, which lets the caller's existing "fall back to the rule engine" path run in the same request instead of 15 seconds later.
- **The rate-limit Redis store is constructed lazily.** `rate-limit-redis` eagerly issues two `SCRIPT LOAD` commands from its constructor; against an unreachable server those sit in the command queue and abort after the command timeout. That was the stray `AbortSignal`/`commands-queue` error appearing 15 seconds after startup, and it predates this session.
- **Degrading must not mean failing quietly.** A single line per outage replaces node-redis's per-retry stack-trace flood, and a `ready` event re-arms the warning so a genuine production outage is still visible in the logs.
- **WSL2 is the blocker for Docker on this machine, not the fallback.** Docker Desktop is installed but cannot start because no WSL2 distribution is present. Local Redis is therefore genuinely unavailable, which is what made the fallback the right fix rather than a workaround.
- **A login must be matched by email as well as by Firebase uid.** `firebaseAuthHandler` looked the account up by `firebaseUid` only and inserted when that missed. The seeded admin's stored uid (`MQwguByzZURTlyeRV7BMUUGf7vi1`) no longer exists in Firebase — the account's real uid is `66jke2z9ofYOqdqlq1PGbAa16F92` — so every Google sign-in missed the lookup, fell through to an insert, and hit the unique email index added by migration 001. The result was `409 email already exists`, which the user could not clear from the app. The handler now falls back to the verified email and links the record to the current uid.
- **Linking by email requires a verified address.** A uid can be reissued, but email is not something to link blindly: an unverified address would let anyone who registers the same address inherit the existing account's role, clubs and history. The fallback therefore only links when `email_verified` is true, and otherwise returns a 401 explaining how to proceed.

**Changes / additions:**

- Rewrote `src/config/redis.ts`: added `describeRedisError` (collapses node-redis's `AggregateError` into one readable line) and `attachRedisLogging` (logs the first failure of an outage, stays quiet until `ready`, then re-arms). Added a capped exponential `reconnectStrategy` so the process recovers if Redis appears later without hammering it, and an `isRedisReady` helper. `getMLRedisClient()` no longer caches a rejected connection promise, so a late Redis recovery is picked up instead of failing forever.
- Rewrote `src/middleware/rate-limit.middleware.ts` around a `ResilientRateLimitStore` that delegates to `RedisStore` when the client is ready and to `express-rate-limit`'s own `MemoryStore` otherwise, catching mid-request drops and serving those from memory too. Redis stays required for cross-instance counting; only the fallback is per-process (`localKeys = true`). Each limiter gets its own instance — express-rate-limit v7 rejects a shared store (`ERR_ERL_STORE_REUSE`).
- Rewrote `src/utils/tokens.ts` with a small TTL-aware `MemoryTokenStore` covering the commands the refresh-token store uses (`SETEX`, `GET`, `DEL`, `SADD`, `SREM`, `SMEMBERS`). Redis is still the source of truth when reachable.
- Wired `closeMLRedisClient` into the shutdown paths in `src/server.ts`; it destroys rather than quits when the connection is still pending.
- Fixed `verifyRefreshToken`: it threw a bare `Error`, and because the global handler only honours the status of `AppError` instances, a revoked or expired refresh token answered **500 `INTERNAL_ERROR`** instead of 401. It now throws `UnauthorizedError` with `TOKEN_EXPIRED`.
- Fixed the 404 handler in `src/app.ts` for the same reason: it attached `statusCode = 404` to a plain `Error`, so unmatched routes reported **500**. It now throws `NotFoundError`.
- Fixed `firebaseAuthHandler` in `src/routes/auth.routes.ts` so a reissued Firebase uid can no longer deadlock sign-in: it now falls back to a case-insensitive match on the verified email, updates the stored `firebaseUid`, and rewrites the custom claims for the new uid. Linked accounts are logged as warnings. Also normalises the stored email to lower case.
- Repaired the data: the seeded admin's `users.firebaseUid` was updated to the real uid (it self-heals on first sign-in now), and the 12 `exercises` documents still pointing at the stale uid as `createdBy` were corrected. No references to the stale uid remain in any collection.
- Reproduced the user's failure and confirmed the fix with a real Firebase ID token for the account's actual uid: `POST /api/v1/auth/google` returned **409** before and **200** after, with `role: system_admin` preserved and the stored uid corrected.
- Verified end to end with Redis down, using a real Firebase ID token minted through the Admin SDK and exchanged over REST (no password needed): login → refresh (rotating) → logout → refresh again is rejected with 401. Also confirmed the limiter still counts — 5 × 400 then 429 — and that no request produced a 500.
- `typecheck` and `build` pass; `eslint` reports no new problems in the touched files.

**Skill(s) used:** none (no skill loaded)

**Open questions / next steps:**

- **The Redis-*available* path is still unverified on this machine.** Docker Desktop cannot start (no WSL2 distribution) and there is no native Redis, so the `RedisStore` and Redis-backed token paths were reasoned through rather than exercised. They are close to untouched in substance, but they should be confirmed against a real Redis before relying on them.
- To get a local Redis: enable WSL2, then `docker run -d --name stms-redis -p 127.0.0.1:6379:6379 redis:7-alpine` and set `REDIS_URL=redis://localhost:6379`. Until then the backend simply runs without it.
- Rotate the leaked credentials, move Render's `MONGODB_URI` to `/stms_dev`, and switch `REDIS_URL` to the **internal** Key Value URL in the same region as the service. All still outstanding from Session 5.
- **A stray Firebase account exists for `libyeratornyadundu280@gmail.com`** — note the "libyerator" typo. It is password-only and absent from Mongo, so signing in with it would silently provision a new `athlete` account rather than reaching the admin. Worth deleting from the Firebase console.
- Seed demo history, and keep the model last.
- The rate-limit key prefix changed from the previous default `rl:` to `stms:rate-limit:`, so live counters reset once on deploy. Harmless, but worth knowing.