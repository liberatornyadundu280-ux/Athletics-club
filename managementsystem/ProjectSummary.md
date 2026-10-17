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