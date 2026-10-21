# Smart Trainer Management System (STMS)

## What This Project Is

STMS is an athletics/training management platform that helps coaches and trainers run their programs and serve their athletes well — replacing paper-based record-keeping with digital attendance tracking, performance monitoring, workout management, injury tracking, club management, and an AI-driven training recommendation engine.

## Scope Boundaries

- **In scope:** STMS — the platform-wide, multi-club system.
- **Out of scope:** the existing Athletics Club Website. It's a separate, already-functional project. Don't read, reference, or modify it while working here.

## Documentation Location

All documentation about STMS — specs, diagrams, architecture notes, decisions, session summaries — lives inside `managementsystem/Docs/AgentsDocumentation`. Nothing about the system's design or progress gets created anywhere else; that's the one place every session's changes accumulate, so the next session only has to look in one folder.

## Repository Layout

STMS is self-contained under `managementsystem/`. The Athletics Club Website lives at the repository root and is out of scope here.

| Path | What it is |
| ---- | ---------- |
| `landing/` | Public landing page (Vite + React). Every visitor sees this, then continues to login. |
| `stms-frontend/` | Coach and athlete application (React + Vite) |
| `stms-backend/` | REST API (Node.js + Express + TypeScript) |
| `feature_engineering/` | Python ML pipeline — features, training, inference worker |
| `Docs/` | Requirements, architecture, decisions, session log |

Each project owns its own `package.json`, lockfile, lint config and build. There is no root workspace; install and run them independently.

## Before Starting Any Task

Read, in this order:

1. The **Development Process & Progress** checklist below — to see what's already done.
2. `managementsystem/ProjectSummary.md` — for the detailed history of decisions from past sessions.
3. The rest of the documentation in `managementsystem/Docs/` — for full requirements/design context.

This file governs _how we work_; `managementsystem/` governs _what we're building and what's already been decided_.

**Current phase:** Implementation for Sprints 2–8 is in place; owner review/acceptance remains pending. External service requirements and remaining implementation gaps are listed in `managementsystem/Docs/AgentsDocumentation/tasks/sprints-2-8-todo.md`.

## Role & Working Style

Act as a lead/senior software developer and engineering partner, not an order-taker:

- Reason through trade-offs and make well-justified technical calls rather than waiting to be told every step.
- Flag risks, edge cases, and better alternatives when you spot them, instead of implementing the first idea literally.
- Bring anything that materially changes architecture, scope, or cost back for sign-off before locking it in.
- Keep commits small and clearly described.
- add an appropriate emoji at the end of the chart
- flag at the start of the chart the skill used if any

## Design & Decision-Making Principles

Weigh every design or product decision against, in order:

1. **UI/UX** — is it clear and pleasant for coaches and athletes to actually use?
2. **Functionality** — does it solve the real workflow it's meant to solve?

Technical elegance matters, but comes after those two.

## Tech Stack

| Layer         | Choice                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Frontend      | React.js                                                                                               |
| Backend / API | Node.js + Express.js                                                                                   |
| Database      | Hybrid: Firebase (auth, real-time pieces) + MongoDB (primary data store)                               |
| AI / ML       | Python (scikit-learn, pandas) for the recommendation engine, accelerated with OpenAI APIs where useful |
| Datasets      | Kaggle and other open sources                                                                          |
| Deployment    | Frontend → Vercel · Backend → Render · Media/storage → Cloudinary                                      |

Treat this table as a quick reference — `managementsystem/` has the full architecture, schema, and API design as they're finalized.

## Development Process & Progress

Built in sprints; each sprint is reviewed and evaluated before the next one starts. **Update this checklist the moment a task or sprint item is completed** — check it off, add the date, a one-line summary, and (if a chart, diagram, or other generated artifact was involved) which skill built it. A new session should be able to read this list alone and know exactly where things stand, instead of re-deriving it from scratch.

- [x] 1. Authentication & user management — done 2026-09-29, owner reviewed and confirmed Sprint 1 acceptance; Firebase sessions, club access, profile updates, roster management, and invitation acceptance wired to APIs; aligned local Firebase/API configuration, corrected JWT key pair, bounded auth requests, fixed sign-out menu, removed duplicate PWA worker registration, and removed mock login bypass.
- [x] Sprint 1 platform account administration — done 2026-09-29, added system-admin account search and permanent Firebase/MongoDB deletion with a one-time secure role-promotion command.
- [x] Platform account directory handles legacy MongoDB users without club membership arrays — done 2026-09-29, missing clubIds now display as an empty club list.
- [x] Backend shutdown closes MongoDB and Redis clients cleanly — done 2026-09-29, removed duplicate signal handlers and added central graceful cleanup.
- [x] System administrators can view existing clubs and add their own active membership — done 2026-09-29, global club directory opens the selected club's roster for user management.
- [x] Club membership route TypeScript syntax — done 2026-09-30, corrected the malformed `/mine` response closure; backend typecheck passes.
- [x] Platform administrators can select clubs from the header — done 2026-09-30, system admins load the platform club directory in the switcher; other users remain limited to active memberships.
- [x] Club switching server error — done 2026-09-30, resolve Firebase UIDs through Mongo user records, synchronize club claims, and issue fresh access tokens; focused switch tests pass.
- [x] Athlete creation payload — done 2026-09-30, align `apps/backend` validation with the frontend's injected club ID, date-only birth dates, and nullable fields; athlete date formatting and payload tests pass.
- [x] Athlete self-service club enrollment — done 2026-09-30, athletes without a club can request enrollment; club admins review requests and approval activates membership.
- [x] Synthetic athlete roster import dataset — done 2026-10-01, added 24 fictitious athlete profiles using reserved `example.com` email addresses; these create roster records only, not Firebase sign-in accounts.
- [x] Recommendation generation usability — done 2026-10-01, auto-select the first available athlete, direct empty-roster users to athlete management, and show complete exercise prescriptions for selected workouts.
- [ ] 2. Athlete profiles & club management — implementation ready 2026-09-29, added club-scoped athlete CRUD/archive APIs, searchable roster and profile editor, bounded CSV import with row results and client-side limits, system-admin club creation, invitation/account linking, and a working Sprint 2 progress page; frontend/backend production builds pass, owner acceptance pending.
- [ ] 3. Attendance module — implementation ready 2026-09-30, club-scoped sessions/records, manual bulk marking, expiring check-in links, summaries, and API-backed screens; builds pass. QR image rendering/Firebase real-time sync and owner acceptance pending.
- [ ] 4. Workout module — implementation ready 2026-09-30, exercise/workout authoring, assignments, workout player/completion, and attendance-on-open; builds pass. Multi-week program/mesocycle design and owner acceptance pending.
- [ ] 5. Performance tracking — implementation ready 2026-09-30, results, PB/SB, fitness tests, goals, and CSV export; builds pass. Trend/ranking/report depth and owner acceptance pending.
- [x] 6. Recommendation engine — done 2026-10-01, connected local XGBoost RPE model to backend via Redis Streams inference worker; added ML env vars, shared Redis client, callMLInference with request/response correlation, updated Python worker to write results stream with injury risk & progression adjustment; builds pass (skill used: backend-development)
- [ ] 7. Injury & permissions — implementation ready 2026-09-30, privacy-scoped injury/wellness/rehab/RTP and permission generation/review/status verification; builds pass. Attachments/PDF generation and owner acceptance pending.
- [ ] 8. Analytics & deployment — implementation ready 2026-09-30, live club reports/export, announcements/read-state APIs, IndexedDB offline workout sync, Vercel SPA routing, corrected CI paths and operational docs; builds pass. Hosted notification delivery, deployment credentials, monitoring, and owner acceptance pending.

- [x] Repository split: STMS made self-contained under `managementsystem/` — done 2026-10-17, moved the monorepo scaffolding, README, TASKS, LICENSE and tooling out of the repository root; deleted the duplicated `apps/` prototype and the unreferenced `packages/` workspaces (`@stms/shared`, `@stms/ui`, zero imports anywhere); the Athletics Club Website now owns the repository root.
- [x] Landing page extracted into its own project — done 2026-10-17, created `managementsystem/landing` with a reconstructed `package.json` (its manifest had been lost, so the app had never been typechecked); added the missing `import.meta.env` typings and the missing `ButtonPrimary` import in `Navbar.tsx`; production build passes.
- [x] Backend build unblocked — done 2026-10-17, `src/config/redis.ts`, `src/middleware/rate-limit.middleware.ts` and `src/utils/tokens.ts` imported `redis` without it being declared (it had been resolving from a deleted ancestor `node_modules`); declared `redis@^6.2.1`, removed the unused `ioredis`, and restored a green `typecheck` and `build`.
- [x] CI now actually runs — done 2026-10-17, replaced the root workflow (its `stms-backend/**` paths never matched the real layout, so it never triggered), removed the invisible nested workflow under `stms-backend/.github/` (GitHub only reads the repo root), and added a landing-page build job.
- [x] Lint restored per project — done 2026-10-17, removed the monorepo-root `.eslintrc.cjs` (it governed the backend and could not resolve its plugins), added a backend config using only declared dependencies, and declared the missing `eslint-plugin-react` and `eslint-config-prettier` in the frontend.
- [ ] Backend unit tests are stale — 5 of 11 tests in `tests/unit/auth.service.test.ts` fail: they pass non-ObjectId strings (`'user-123'`, `'club-456'`) to `switchClub`, `refreshToken` and `logout`, which now resolve records by ObjectId. Marked non-blocking in CI until rewritten.
- [ ] Lint debt — recorded 2026-10-17, `stms-backend` reports 84 problems (57 errors) and `stms-frontend` 850 (805 errors), mostly `@typescript-eslint/no-explicit-any`. Lint runs but does not pass.

- [x] Credentials removed from tracked configuration — done 2026-10-17, `feature_engineering/config.local.yaml` untracked and gitignored, live MongoDB and Cloudinary secrets stripped out of `stms_ml/config.yaml`, and the Python pipeline now overlays `MONGO_URI` / `MONGO_DB` / `REDIS_URL` / `CLOUDINARY_*` from the environment. Also fixed a latent bug: the URI was written as a multiline YAML scalar, so it carried a trailing newline.
- [x] Schema migrations actually runnable — done 2026-10-17, added `src/migrate.ts` with shared logic in `src/migrations/runner.ts` and an ordered registry. Migrations are now idempotent via `ensureCollection` (create, or `collMod` when present) and `ensureIndexes`, because `connectToDatabase()` pre-creates several of the same collections and would have thrown `NamespaceExists`. `users`, `clubs`, `club_memberships`, `audit_logs` and `daily_readiness` now carry live `$jsonSchema` validators, and the unique indexes on `users.email`, `users.firebaseUid` and `clubs.slug` exist for the first time. Rollback no longer drops indexes the application owns.
- [x] STMS database isolated from the campus system — done 2026-10-17, the Atlas `MONGODB_URI` had no database name, so the driver fell back to MongoDB's default `test`. That database is shared with an unrelated campus management application (90 accounts in the same `users` collection under a different schema). STMS now targets `stms_dev`, matching `docker-compose.yml` and `.env.example`; `test` was left untouched. Applying the `users` validator there would have rejected the other application's writes.
- [x] Development seed — done 2026-10-17, `npm run db:seed` applies pending migrations, then upserts a club, a `system_admin` and a `coach` login, the 24-athlete synthetic roster and a 12-exercise catalogue. Idempotent, and refuses to run against production without `--force`.
- [ ] Rotate the leaked credentials — the MongoDB Atlas password and Cloudinary API secret were committed in `HEAD` and in `1270414`. They must be rotated in the Atlas and Cloudinary consoles; removing them from the files does not invalidate them.
- [ ] Deployment environment needs the same database fix — Render's `MONGODB_URI` must end with `/stms_dev`, otherwise production will read the shared `test` database.
- [x] Seed demo history — done 2026-10-20, `npm run db:seed:history` writes a deterministic 8-week history (26 athletes, 8 workout templates, 24 sessions, 624 attendance records, 156 assignments, 117 workout logs, 3 competitions, 208 performance results, 78 fitness tests, 26 goals, 331 readiness check-ins, 3 injuries). It is idempotent, tagged `demoSeed: true`, and removable with `--reset`.

- [x] Backend runs without Redis — done 2026-10-18, rate limiting and refresh-token storage now fall back to in-process stores when Redis is unreachable, so login works on a machine with no Redis at all. A node-redis outage logs one readable line instead of a stack trace per retry, the ML client fails fast rather than hanging on the command timeout, and the rate-limit store is built lazily (which removes the stray `SCRIPT LOAD`/`AbortSignal` error that appeared 15s after startup). Verified end to end with a real Firebase ID token: login → refresh → logout → refresh rejected, with 5 × 400 then 429 from the limiter and zero 500s.
- [x] Revoked or expired refresh tokens answer 401 — done 2026-10-18, `verifyRefreshToken` threw a bare `Error`, and the global handler only honours the status of `AppError` instances, so a revoked token answered 500 `INTERNAL_ERROR`.
- [x] Unmatched routes answer 404 — done 2026-10-18, same cause: the 404 handler attached `statusCode` to a plain `Error`, so unknown paths reported 500.
- [x] Redis-backed paths verified against a real server — done 2026-10-21, a native Redis 8.10.2 now runs on 127.0.0.1:6379. After a real login, `refresh_token:<hash>` exists with a ~30-day TTL and `refresh_tokens_by_user:<uid>` holds the rotation set; the auth limiter wrote `stms:rate-limit:auth:<ip>`; and the ML worker consumed a trigger and returned a result over `stms:recommendation:triggers:results`. The fallback paths remain for machines without Redis ⚙️
- [x] Sign-in no longer deadlocks when a Firebase uid is reissued — done 2026-10-18, `firebaseAuthHandler` matched accounts on `firebaseUid` only, so when the seeded admin's stored uid became stale every Google sign-in fell through to an insert and collided with the unique email index: `409 email already exists`, unclearable from the app. The handler now falls back to a case-insensitive match on the **verified** email, links the record to the current uid and rewrites its claims. The admin's uid and 12 `exercises.createdBy` values were repaired; the stale uid no longer appears anywhere in `stms_dev`.
- [x] A stray Firebase account existed for `libyeratornyadundu280@gmail.com` (note the "libyerator" typo) — resolved 2026-10-20, the Firebase Admin SDK now answers `auth/user-not-found` for that address and there is no matching MongoDB user, so it can no longer silently provision a new athlete.
- [x] A valid sign-in can no longer be refused with 429 — done 2026-10-20, the auth limiter allowed 5 requests per 15 minutes per IP and counted every failed exchange, so ordinary retries (and everyone behind one campus NAT address) locked the account out. `/auth/google` only exchanges a verified Firebase ID token, so the counter guards little; it is now 30 per 15 minutes in production and 300 in development, with preflights excluded. `app.set('trust proxy', 1)` was also missing, which on Render makes every visitor share the proxy's IP.
- [x] Sessions stay signed in until sign-out — done 2026-10-20, the frontend treated an expired 15-minute access token as "signed out" instead of refreshing against the weeks-long HttpOnly cookie, and the Redis fallback kept refresh tokens in process memory so a restart ended every session. Restore now refreshes first, refresh tokens fall back to a MongoDB collection with a TTL index (migration 003), the cookie lasts 30 days and uses `sameSite: none` in production so it is actually sent between Vercel and Render. Proven by refreshing with a cookie saved *before* a full backend restart.
- [x] Visitors can browse the app without an account — done 2026-10-20, `ProtectedRoute` no longer redirects guests to `/login`; it shows an in-place sign-in panel that names the module inside the normal app shell. Guests see the full module list, a "Browsing as guest" footer and a Sign in button, and the landing page's "Explore the platform" CTA opens the app rather than the login form.
- [x] Sign-out is guaranteed even when the logout request fails — done 2026-10-20, `api.logout()` now records an explicit signed-out marker after clearing local state, and session restore refuses to use a surviving HttpOnly cookie until the user signs in again; the marker is removed by `setAuth()` on the next interactive sign-in.
- [x] Auth screens are readable and escapable — done 2026-10-20, the global `body` rule read `--color-text-primary` / `--color-track-900`, neither of which exists in the Tailwind v4 `@theme` block, and a bare `var()` with no fallback is invalid at computed-value time, so the colour fell back to the browser default (black). The app only looked correct because `MainLayout` sets `body.style.color` inline. Both declarations now carry fallbacks, the login/register screens were moved off a non-existent `surface-*` scale onto the real `white` / `mist` / `fog` / `volt` / `line` tokens, `AuthLayout` sets an explicit base colour, and it gained a Back button (history when there is an entry, home otherwise) plus a clickable STMS mark that returns to the home page 🎨
- [x] AI recommendations actually come from the trained model — done 2026-10-20, the worker now translates the 211 runtime features into the model's 31 training columns (only 4 matched by name before), stops applying a scaler the model was never trained with, keeps the model's own recovery/driver explanations, and no longer writes a duplicate recommendation document. Verified end to end against `stms_dev`: `modelVersion` is `ml-model_next_workout_rpe_20261001_043023.pkl` and focus/RPE differ per athlete 🧠
- [x] Readiness and event-group features reach inference correctly — done 2026-10-20, `FeaturePipeline` defaulted to a group list that omitted `readiness`, so the trained model never saw soreness/sleep/stress; the list now comes from config and defaults to every registered extractor. Roster labels such as `"100m sprint"` and `"long jump"` were also falling through to `event_group_unknown`; they now resolve to sprints/jumps/throws/distance in both the Python extractor and the Node rule engine 🏃
- [x] Recommendation latency bounded — done 2026-10-20, the worker's Redis client used a 5-second socket timeout while blocking reads waited 5 seconds (every cycle failed with `Timeout reading from socket`), the backend used a 10-second ML timeout for a pipeline that takes longer against a remote Atlas cluster, and feature extractors ran their ~21 queries sequentially. Blocking reads no longer race the socket, the ML timeout is 30 seconds, extractors run concurrently, and results are read with `XREAD` instead of a shared consumer group so concurrent requests cannot steal each other's results ⚙️
- [x] Load warnings need enough history to be credible — done 2026-10-21, the cold-start recommendation treated an acute:chronic ratio of 2.83 built from three sessions as a caution, and the worker's injury-risk and progression logic did the same. The workload extractor now emits `sessions_28d`, and ACWR only changes focus, intensity, recovery, injury risk or progression once at least eight sessions exist in the window. Below that, the explanation says how many sessions it saw and that the ratio needs more history instead of presenting it as evidence 📊
- [x] Athletes can open and complete their own assigned workouts — done 2026-10-21, both athlete routes compared the assignment's athlete-profile id with the requester's user-account id, so every athlete got 403 "This workout belongs to another athlete". They now resolve the profile through `athletes.userId`, still reject another athlete's assignment (verified 403), and completion responds immediately while the recommendation refresh runs in the background 🏋️

Example of a completed line:
`- [x] 3. Attendance module — done 2026-10-03, added QR check-in flow (skill used: frontend-design)`

## End-of-Session Documentation

After every session:

1. Update the **Development Process & Progress** checklist above.
2. Add an entry to `managementsystem/ProjectSummary.md` — the way authors credit chapters in a book, so the project builds a running record of who decided what and when. Create the file if it doesn't exist yet. Append; never overwrite an earlier entry.

Entry format:

```markdown
## Session N — YYYY-MM-DD

**Contributor(s):**
**Focus:**
**Decisions made:**

- **Changes / additions:**
- **Skill(s) used (if any):**
- **Open questions / next steps:**
-
```

## Setup & Commands

Each project is independent — run these from inside its own directory.

```bash
# Landing page (public entry point)
cd managementsystem/landing && npm install && npm run dev

# Backend API (port 5000, health check at /healthz)
cd managementsystem/stms-backend && npm install && npm run dev

# Frontend app
cd managementsystem/stms-frontend && npm install && npm run dev
```

- **Install:** `npm install` in each project (no root workspace)
- **Run locally:** `npm run dev` in each project; backend stack via `docker-compose up -d` in `managementsystem/`
- **Database:** `npm run migrate` · `npm run migrate:list` · `npm run migrate:down` · `npm run db:seed` (from `stms-backend`)
- **Test:** `npm run test:unit` · `npm run test:integration` (backend; integration needs MongoDB + Redis)
- **Build:** `npm run build` in each project
- **Lint / typecheck:** `npm run lint` · `npm run typecheck`

First-time database setup (from `stms-backend`):

```bash
npm run migrate      # apply schema validators and indexes
npm run db:seed      # create a club, two logins, the sample roster and exercises
npm run migrate:list # confirm what has been applied
```

`MONGODB_URI` must name the database — `.../stms_dev`, not just the host. Without it the driver silently uses MongoDB's default database, `test`.

_Keep this file current as scope, stack, or process decisions change — it's the fastest way to bring a new session, or a new contributor, up to speed._
