# Project Summary

## Session 6 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix STMS frontend console warnings and the Google authentication handoff.

**Decisions made:**

- **Changes / additions:** Opted into React Router v7 future behavior, removed the broken font URL and missing PWA asset references, corrected the Vite API proxy path, and made Google sign-in await Firebase token exchange with the backend before navigating.
- **Skill(s) used (if any):** vercel-react-best-practices.
- **Open questions / next steps:** If Firebase still rejects Google sign-in, check that Google is enabled as a provider and `localhost` is authorized in Firebase Authentication; capture the exact `auth/...` error code if it continues.

## Session 5 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Diagnose local backend Redis DNS connection failures.

**Decisions made:**

- **Changes / additions:** Corrected the backend environment example to use the local Redis URL and clarified that hosted services require an externally reachable connection URL when running locally.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** The local machine has no detected Redis or Docker installation. The project owner must run a Redis service locally or set `REDIS_URL` to a reachable hosted Redis URL in `stms-backend/.env`.

## Session 4 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Diagnose Firebase Admin's malformed private-key startup error.

**Decisions made:**

- **Changes / additions:** Validate the Firebase private key before SDK initialization and return an actionable error for invalid or truncated keys. Replaced the misleading Firebase private-key sample in `.env.example` with an empty value and a source note.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** The local `stms-backend/.env` key is truncated. The project owner must generate a new Firebase service-account key and update the local value before Firebase initialization can succeed.

## Session 3 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Resolve the TypeScript errors reported by the STMS backend build.

**Decisions made:**

- **Changes / additions:** Typed parsed CORS origins, aligned the backend compiler settings with its CommonJS runtime, corrected coded error constructors and response handler return types, fixed auth/token type mismatches and asynchronous crypto usage, and typed paginated MongoDB results.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** None for this build error.

## Session 2 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix local STMS backend startup failing to load its environment file.

**Decisions made:**

- **Changes / additions:** Load `stms-backend/.env` from the backend configuration module before validating required variables. Keep variables already supplied by the process environment as the higher-priority values.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Start the backend from the backend directory and confirm it loads the configured environment; database and Redis services must be reachable for full startup.

## Session 1 — 2026-09-26

**Contributor(s):**
Liberator Nyadundu

**Focus:**
STMS (Smart Trainer Management System) Design Phase — Complete module-by-module design specification for multi-club athletics management platform piloted at Aditya Athletics Club.

**Decisions made:**

### Project Scope & Architecture
- **Confirmed project scope distinction:** STMS (in scope, multi-club platform) vs. Athletics Club Website (out of scope, separate functional project at `athletic-club/`)
- **Multi-tenant architecture:** Every document scoped by `clubId`; middleware enforces isolation; global workout library read-only shared
- **Tech stack locked:** React PWA (Vercel) + Node/Express (Render) + MongoDB Atlas + Firebase Auth/Realtime + Redis Streams + Python FastAPI ML workers + Cloudinary

### Module Design Decisions

#### Module 1: Authentication & User Management
- Firebase Auth (email/password + Google OAuth) with email verification
- JWT access tokens (15min) + refresh tokens (7d) via backend
- Roles: `system_admin`, `club_admin`, `coach`, `athlete` via Firebase custom claims + MongoDB `Users.role`
- Club membership: many-to-many (User ↔ Clubs with role per club)
- Profile management, soft delete, audit log

#### Module 2: Athlete Profiles & Club Management
- Athlete profile: personal info, event specializations, medical notes, guardian info, school/grade
- Club CRUD (system_admin only), settings (branding, timezone, contact)
- Membership roles: athlete (`member`, `captain`, `alumni`), coach (`head_coach`, `assistant`, `specialist`)
- Invitation flow (email → magic link → auto-join)
- Bulk CSV import, athlete transfer between clubs (history preserved)

#### Module 3: Attendance Management
- Session management (date, time, venue, type, linked workout)
- **Three marking methods:** Manual, QR Code (Firebase Realtime), Bulk
- **Auto-capture:** Athlete opens assigned workout → attendance recorded (`method: "workout_open"`)
- QR: short-lived token, expires post-session, shows venue/time on scan
- Excused absences with attachments, coach approval
- Auto % calculation: `(present + excused) / (total - cancelled)`
- Reports: daily/weekly/monthly/seasonal, export PDF/Excel
- Alerts: 3+ consecutive misses or <75%
- Integrations: Permission letters → "Official Sports Leave"; Injuries → auto-suggest "Excused - Injury"
- Offline-first QR scanner (sync on reconnect)

#### Module 4: Workout Management
- **Hierarchy (Fully Customizable):**
  - **Exercise:** Atomic movement (Back Squat, 100m Sprint) — muscles, equipment, video, cues, difficulty, intensity prescription, progression rules
  - **Workout (Session):** Ordered exercises with sets/reps/rest/tempo/target zones, coaching notes per exercise
  - **Program (Mesocycle):** Multi-week progression with auto-progression (+% weekly), deload rules, test weeks
- Global exercise library (verified coaches, moderated)
- Club templates (private or shared)
- Assignment: individual, event group, club, custom selection; recurring schedules
- Athlete view: today's workouts, video demos, "Start" button (triggers attendance), completion logging (actuals)
- Verification levels: Verified / Community / Club Private
- Injury-aware assignment (warnings + alternative suggestions)
- History & analytics: volume, intensity distribution, compliance
- **Offline-First (Automatic):** PWA + Service Worker caches app shell; IndexedDB (Dexie) caches assigned workouts + library on login; writes queue locally, sync on reconnect; deep analysis requires internet

#### Module 5: Performance Tracking
- Competition results: name, date, venue, event, round, result (time/distance), wind, position, meet level
- Auto PB/SB detection with notifications
- Fitness testing: standardized battery (30m fly, standing LJ, med ball, Yo-Yo, 300m, etc.)
- Trends: result vs. date with training load overlay
- Club rankings per event (age-group, gender); opt-in anonymized cross-club leaderboards
- Goal setting (target time/distance per season)
- Event-specific metrics: sprint splits, jump approach speed, throw release velocity, WA scoring
- Wind/hand-time/altitude adjustments
- Export: WA format, PDF certificates, Excel for federation

#### Module 6: Smart Recommendation Engine
- **Inputs (per athlete):** Event, performance history, attendance %, injury status/history, fitness tests, workout compliance, training phase, age, gender, training age
- **Outputs:** Next workout, weekly focus, intensity prescription, recovery suggestions, progression adjustment
- **Architecture:** Gradient boosting (XGBoost/LightGBM) + optional sequence NN
- **Training:** Nightly batch → feature engineering → retrain → validate → versioned artifact to Cloudinary
- **Inference:** FastAPI workers consuming Redis Streams; triggered by workout completion, new result, injury change, weekly cron (Mon 6 AM)
- **Storage:** `Recommendations` collection (athleteId, generatedAt, trigger, workoutId, focus, intensity, recovery, confidence, modelVersion, status)
- **Coach review:** Accept (assigns), modify, dismiss — acceptance feeds back as label
- **Athlete view:** "Smart Plan" tab, start workout, swap, thumbs up/down
- **Explainability:** Top 3 drivers per recommendation
- **Cold start:** Rule-based heuristics (event templates + fitness baselines) until 4+ weeks data
- **Multi-tenant:** Per-club models + global baseline
- **Offline:** Latest recommendation cached in IndexedDB
- **A/B testing framework, drift monitoring**

#### Module 7: Injury Management
- Recording: type, body part (laterality), onset date, mechanism, severity (Grade 1-3), diagnosis source, imaging attachments
- Recovery tracking: expected/actual return date, rehab phases, daily pain/wellness logs (1-10), rehab exercise compliance
- **Restriction Engine:** Injury → flags conflicting exercises; suggests safe alternatives
- **RTP Protocol:** Configurable stepwise per injury type; coach checks criteria; blocks full clearance until passed
- Medical team collaboration (invited physio/doctor): view injury, add notes, update RTP, upload reports
- Dashboard: active injuries, days missed, RTP milestones, trends by event/body part
- Integrations: Attendance (auto excused), Recommendation Engine (feature input)
- Privacy: encrypted at rest, access audit log, athlete consent, retention policy

#### Module 8: Permission Letter Generation System
- **Event-driven:** Coach creates event → selects athletes → bulk generates all required letters
- **8+ Letter Types:** HOD Permission, Faculty Permission (per subject), Hostel Permission, Competition Participation, Travel Permission, Attendance Adjustment, Medical Leave, Training Camp Permission
- **Auto-population:** Pulls athlete profile (name, roll, branch, year, hostel block/room, emergency contact, guardian)
- **Bulk Generation:** 20 athletes → 60+ letters in seconds
- **Multi-Level Workflow:** Draft → Submitted → Coach → Sports Director → HOD → Hostel Warden → Completed (configurable per type)
- **Role-Based Approvers:** HOD (academic), Sports Director (official), Warden (hostel), Faculty (subject)
- **Digital Signatures:** v1 print+sign with QR verification; v2 e-signatures
- **QR Verification:** Unique QR per letter → scan shows letterId, athlete, status, event
- **Attendance Integration:** Approved letters → auto-mark "Official Sports Leave"
- **Notifications:** Real-time alerts to athlete, coach, approvers
- **Analytics:** Monthly permissions, competitions, approval turnaround, active athletes
- **AI Enhancements (v1.5+):** Smart Letter Assistant (coach types event → AI creates + selects templates); Letter Recommendation (detects "outstation" → auto-adds hostel/travel/attendance)
- **Export:** PDF, Excel, Word
- **Multi-Tenant:** Templates, approvers, workflows per club

#### Module 9: Announcements & Notifications
- Types: Club-wide, coach→athletes, coach→event-group, athlete→coach, system
- Scopes: Public, Club-only, Coach-only, Athlete-only, Event-group, Role-based
- Rich content: markdown, attachments, links, action buttons (RSVP, "View Workout", "Sign Letter")
- Scheduling: now, later, recurring, expiry
- Channels: In-app (primary), Push (FCM), Email (opt-in), SMS (v2)
- Notification Center: unified inbox, filters, unread badge, archive
- Real-time: FCM + Firebase Realtime DB
- Preferences: per-user, per-type, channel, quiet hours, digest frequency
- Templates: "New Workout", "Competition Reminder", "Letter Ready", "Attendance Alert", "Injury Update"
- Analytics: open rates, click-through, delivery status
- Auto-generated from other modules

#### Module 10: Analytics Dashboard
- **Views by Role:**
  - Athlete: Attendance %, compliance, PB progression, goal progress, injury history, acute:chronic workload, recommended focus
  - Coach: Squad attendance heatmap, compliance by athlete, injury board, performance trends, upcoming comps, permission letter status
  - Club Admin: Membership growth, participation rates, coach workload, facility usage, competition summary
  - System Admin: Platform health: active clubs, users, API latency, errors, model performance, storage costs
- **Visualizations:** Line charts, heatmaps, bar charts, radar charts, scatter plots, sankey diagrams
- **Date Ranges:** Week, month, season, custom; compare mode
- **Export:** PDF reports, Excel raw data, PNG charts
- **Custom Reports:** Drag-drop builder, scheduled email delivery
- **Performance:** Pre-aggregated daily rollups, lazy-load heavy charts

#### Module 11: System Admin & Settings
- Club lifecycle: create, suspend, archive, delete (GDPR), transfer ownership
- Global config: attendance rules, verification thresholds, notification defaults, WA scoring tables, injury taxonomy
- Per-club overrides: templates, workflows, RTP protocols, branding, feature flags
- User management (system admin): view all, impersonate (audited), force reset, deactivate, assign system roles
- Feature flags per club (recommendations, letters, QR, analytics depth)
- Audit log: immutable, all write operations
- Data export/import (GDPR, backup, migration)
- Storage management: Cloudinary usage, quotas, orphan cleanup
- API keys & integrations (Firebase, MongoDB, Cloudinary, SendGrid, push)
- Monitoring: Sentry, uptime, slow queries, queue backlog, model drift
- Release management: version deploy, rollback, maintenance windows
- Compliance: retention policies, right-to-be-forgotten, consent records

### Cross-Cutting Concerns
| Area | Implementation |
|------|----------------|
| **Frontend** | React Query, Dexie (IndexedDB), Workbox SW, Design System (Storybook), WCAG AA |
| **Backend** | Zod validation, Helmet, rate limiting, Socket.io for attendance |
| **Security** | JWT validation, clubId middleware, immutable audit logs, encrypted injury data |
| **CI/CD** | GH Actions → Vercel (FE) + Render (BE/ML), Mongock migrations |
| **Observability** | Sentry, LogRocket, Prometheus/Grafana |

### Development Sprint Plan (8 Sprints × 2 Weeks)
| Sprint | Focus | Key Deliverables |
|--------|-------|------------------|
| **1** | Auth & User Management | Firebase setup, RBAC middleware, club membership, profile UI |
| **2** | Athlete Profiles & Club Management | Profile CRUD, club settings, invitations, bulk import, club switching |
| **3** | Attendance | Sessions, QR (Firebase Realtime), manual/bulk, auto-capture on workout open, reports, alerts |
| **4** | Workout Management | Exercise library, workout builder, assignment, athlete view, completion logging, offline-first |
| **5** | Performance Tracking | Competition results, PB detection, fitness tests, trends, rankings, goals, export |
| **6** | Recommendation Engine | Feature pipeline, training job, inference workers, coach review UI, athlete Smart Plan, explainability |
| **7** | Injury + Permission Letters | Injury recording, RTP protocols, restriction engine, letter generation, workflows, QR verification |
| **8** | Analytics + Polish | Dashboards per role, custom reports, notifications, PWA install, load testing, docs, deploy |

### v2 Items Deferred
- Subscription/billing
- Injury prediction/prevention ML
- E-signatures for permission letters
- SMS notifications

**Changes / additions:**
- Created comprehensive design specification covering all 11 modules + cross-cutting concerns
- Documented multi-tenant isolation as core architectural principle
- Specified offline-first architecture (automatic, no user action) for workout access
- Detailed permission letter generation system with approval workflows per Aditya University requirements
- Defined recommendation engine architecture using Python workers + queue (Option B)
- Clarified Firebase Realtime DB for live attendance updates
- Specified shared workout library with club isolation

**Open questions / next steps:**
- MongoDB compound index strategy per module access patterns
- Firebase Realtime DB structure for live attendance sessions
- Redis Streams vs RabbitMQ for ML inference queue
- Model retraining frequency (nightly/weekly/event-triggered)
- Letter template editor: markdown vs visual builder for club admins
- PWA install prompt strategy (iOS limitations)
- Backup/restore procedure: Atlas point-in-time vs manual exports
- Sprint 1 planning: break Module 1 into tickets with acceptance criteria
- Infrastructure provisioning: Firebase project, MongoDB Atlas cluster, Render services, Cloudinary, Vercel
- Design system setup: Storybook repo, component library, theme tokens
- API contract finalization: OpenAPI 3.0 spec for all modules
- Database migration baseline: initial schema with Mongock

## Session 7 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Sprint 1 authentication, user and club API wiring, page action audit, and UI improvements.

**Decisions made:**

- **Changes / additions:** Firebase email/password and ID-token exchange flows now back auth; protected profile, club switching, and invitation acceptance are connected to backend endpoints. User roster and profile actions persist through APIs. Unsupported later-sprint modules show clear planned states instead of sample data. Navigation, feedback, and visual hierarchy were improved. Sprint 1 remains in progress.
- **Skill(s) used (if any):** planning-and-task-breakdown, backend-development, frontend-design, vercel-react-best-practices.
- **Open questions / next steps:** Confirm the deployed Firebase, MongoDB, and Redis configuration against the local app; set `FRONTEND_URL` for deployed invitation links if needed. Complete remaining Sprint 1 acceptance criteria before marking the sprint done.
## Session 8 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Resolve Firebase Google sign-in configuration failure on localhost.

**Decisions made:**

- **Changes / additions:** Found that the root workspace starts `apps/frontend`, which had no local Firebase environment file; the configured Vite/Firebase client settings existed only under `stms-frontend`. Created the ignored `apps/frontend/.env` using those existing client settings. Confirmed the project ID and auth domain match `smart-trainer-ms`. No OAuth secrets were added to source control.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart the root workspace dev server and retry Google sign-in; if the error persists, confirm Google is enabled for `smart-trainer-ms` and inspect the OAuth web client settings.
## Session 9 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix local Google sign-in JWT handoff and prevent indefinite API loading.

**Decisions made:**

- **Changes / additions:** The `stms-frontend` Vite proxy pointed to port 3000 while the configured `stms-backend` runs on port 5000. Made the proxy target configurable with a port-5000 default, aligned the backend env example, and added 15-second timeouts to API and refresh requests so auth loading resolves on network failures.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart both local servers and retry Google sign-in. If Firebase still returns `auth/invalid-continue-url`, confirm the frontend `VITE_FIREBASE_API_KEY` is copied from the same `smart-trainer-ms` web app config and that `localhost` is authorized in that project. The frontend production build passes; hosted authentication was not exercised.
## Session 10 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Resolve the browser's unsupported service worker MIME type after successful sign-in.

**Decisions made:**

- **Changes / additions:** Removed the manual `/sw.js` registration from `stms-frontend/src/main.tsx`. `vite-plugin-pwa` already injects and manages registration; the duplicate manual path could receive Vite's HTML fallback in development, which the browser rejects as `text/html`. Frontend production build passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart the Vite server. If the old message remains, unregister the service worker and clear site data for `localhost` once, then reload.
## Session 11 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Clarify Sprint 1 sign-in architecture and remove the misleading mock login path.

**Decisions made:**

- **Changes / additions:** Confirmed email/password and Google login first authenticate with Firebase, then exchange the Firebase ID token for an STMS JWT. Removed the `Demo Login (No Backend)` button and its fake-token session bypass; legacy `demo-token` sessions are now cleared. This prevents a mock session from being mistaken for a real Sprint 1 authentication success. Frontend production build passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Firebase `auth/invalid-continue-url` still needs diagnosis in the live Firebase project/config; verify Firebase project key, `localhost` authorization, and inspect whether Firebase rejects the credential request before `/api/v1/auth/firebase` is called.
## Session 12 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Diagnose local backend Redis connection timeouts.

**Decisions made:**

- **Changes / additions:** Inspected the rate-limit and refresh-token Redis clients. A sanitized connectivity check showed DNS resolution succeeds but the local machine cannot reach the configured Redis TCP port, indicating an external network/access issue rather than an application-level authentication failure. No backend code changes were made because the connection is blocked before Redis can respond.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** Enable external access and allowlist the developer machine's public IP in Render Key Value Networking, or use the Render internal URL when the backend runs in the same Render region. Rotate the exposed Redis credential and update the backend environment value.
## Session 13 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Review frontend and backend environment examples for local API/Firebase setup.

**Decisions made:**

- **Changes / additions:** Confirmed `VITE_API_URL=/api/v1` is correct for local Vite development because the dev server proxies `/api` to `http://localhost:5000`. Documented production API URL/rewrite requirements. Replaced hard-coded credentials/key material in the backend example with placeholders and corrected its Firebase project ID to match the frontend.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Configure the deployed frontend's API URL or hosting rewrite. Rotate any credentials from the previous backend example if they were real or used.
## Session 14 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix invalid JWT authorization and restore visible sign-out controls.

**Decisions made:**

- **Changes / additions:** The attached log showed registration succeeded, but protected `/auth/me` calls returned `TOKEN_INVALID` even after `/auth/refresh` returned 200. A safe local check confirmed the configured RS256 private/public keys did not match. Generated a matching pair in the ignored backend `.env` and verified the pair through dotenv parsing without printing key material. Confirmed Firebase client/Admin project IDs match. Replaced the nested empty-trigger user dropdown with visible Profile, Settings, and Sign out menu buttons; Firebase sign-out now runs even if backend logout fails. Backend and frontend builds pass.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** Restart the backend so it loads the new local JWT keys, then sign in again and retry a profile change. The pasted backend log does not contain the browser-side `auth/invalid-continue-url` event; inspect the Firebase network request separately if that error persists.
## Session 15 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Add system administrator account management with coordinated Firebase and MongoDB deletion.

**Decisions made:**

- **Changes / additions:** Added a global system-admin-only account directory at `/admin/users`, with search and role/status filters. Added a permanent-delete API that removes the Firebase Authentication identity, MongoDB user record, club memberships, pending invitations and indexed Redis refresh sessions; retained audit events. Protected authenticated API requests with an active MongoDB account check so deleted/deactivated accounts cannot keep using existing STMS JWTs. Added a one-time backend CLI command to promote an existing active account to `system_admin`; the app cannot self-assign this role. The existing club roster deactivation remains a separate action.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Promote the designated first administrator from the backend terminal, sign out and back in, then open Platform Users. Firebase/MongoDB/Redis deletion was not exercised against the user's hosted services. Backend and frontend production builds pass.

## Session 16 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Diagnose local STMS backend startup failure while connecting to MongoDB Atlas.

**Decisions made:**

- **Changes / additions:** Checked the backend connection configuration without exposing credentials. MongoDB SRV and node DNS lookups succeeded, while a TCP connection to the resolved Atlas node on port 27017 failed from the development machine. This indicates network access or firewall filtering before MongoDB authentication; no application code change can restore this external network path.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Add the development machine's current public IP to the Atlas project's Network Access IP Access List, restart the backend, and retry. If it still times out, check VPN/firewall outbound TCP access to port 27017 and the cluster status. Do not use `0.0.0.0/0` as a workaround.

## Session 17 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Remove the active-club requirement from global platform account administration.

**Decisions made:**

- **Changes / additions:** Updated user-route middleware dispatch so `/users/platform` and `/users/platform/:id` bypass only active-club injection. Authentication remains required, the platform routes still require `system_admin`, and all other user routes continue to require a selected club. Backend production build passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart the backend and reload Platform Users. MongoDB Atlas must still be reachable and the signed-in account must have the `system_admin` role.

## Session 18 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix platform user listing when older MongoDB records lack club membership metadata.

**Decisions made:**

- **Changes / additions:** Made the global system-admin user directory tolerate accounts with no `clubIds` array by returning an empty club list, and added safe defaults for role/name/status and dates so legacy data does not crash the response serializer. Backend production build passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart the backend and refresh Platform Users. If another error appears, capture the GET `/api/v1/users/platform` response message and status.

## Session 19 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Fix Redis abort errors emitted while stopping or restarting the backend.

**Decisions made:**

- **Changes / additions:** Centralized process shutdown in `server.ts`, removed duplicate SIGINT/SIGTERM handlers from the MongoDB module, and added cleanup for both Redis clients on normal shutdown and startup failure. Pending Redis connection errors are handled without logging shutdown-induced abort stacks. Backend production build passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart the backend with the updated code and stop it with Ctrl+C to confirm the abort stack no longer appears. Redis must still be reachable for rate limiting and refresh-session features during normal operation.

## Session 20 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Expose existing clubs to the system administrator and support user roster management within them.

**Decisions made:**

- **Changes / additions:** Added system-admin-only `GET /clubs/platform` to list clubs in the connected MongoDB database and report membership access. Added `POST /clubs/platform/:id/access` to create or reactivate the current administrator's `head_coach` membership, then wired Platform Users to add access, switch into that club, and open its roster. Clubs do not currently have a separate active/inactive field; this action activates the administrator's membership. Frontend and backend production builds pass.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** Restart backend and frontend, open Platform Users, and add access for the club to manage. If no clubs are listed, the connected MongoDB database does not contain club documents; the active `stms-backend` has no club seed script.

## Session 21 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Close Sprint 1 after owner review and begin Sprint 2 athlete profiles and club management.

**Decisions made:**

- **Changes / additions:** The project owner confirmed Sprint 1 checks passed. Added a club-scoped athlete collection and indexes, list/search/detail/create/update/archive APIs, bounded CSV import with per-row results, API-backed roster and profile UI, and system-admin club creation. Existing invitation acceptance now links a same-club athlete record by email. Club switching rebuilds its club list from active membership records; auth and roster responses tolerate legacy users without `clubIds`. Documented the athlete API contract and Sprint 2 plan/checklist.
- **Skill(s) used (if any):** planning-and-task-breakdown, backend-development, frontend-design.
- **Open questions / next steps:** Sprint 2 remains in progress until the owner exercises athlete CRUD/import, invitation-to-account linking, club creation/settings/switching, and cross-club isolation with configured Firebase, MongoDB, and Redis services. MongoDB athlete indexes are created idempotently when the backend connects.

## Session 22 — 2026-09-29

**Contributor(s):**
Codex

**Focus:**
Finish Sprint 2 implementation review and repair the dashboard's dead sprint progress action.

**Decisions made:**

- **Changes / additions:** Added a protected Sprint 2 progress page and connected the dashboard action to it. The page links only to workflows available to the signed-in user's role and permissions. Updated dashboard copy to reflect Sprint 2, added client-side CSV size and row-count checks to match server limits, and recorded the remaining live-service review steps.
- **Skill(s) used (if any):** backend-development, frontend-design.
- **Open questions / next steps:** Frontend and backend production builds pass. Sprint 2 remains open until the owner manually verifies athlete CRUD/archive/import, invitations and account linking, club creation/settings/switching, and cross-club isolation against configured services.

## Session 23 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Implement Sprint 2–8 module foundations and connect the screens to persistent APIs before owner review.

**Decisions made:**

- **Changes / additions:** Added attendance sessions, manual/bulk records, expiring check-in links and reports; workout/exercise authoring, assignment/completion and attendance-on-open; competition results, PB/SB, fitness tests and goals; persisted explainable cold-start training recommendations with coach review; injury/wellness/rehab/RTP and permission letter workflows; role-scoped analytics/CSV export; club announcements/read state; and an IndexedDB offline workout cache/completion queue. Added indexes, role-filtered screens, Vercel SPA fallback, corrected CI workflow paths to the real npm project directories, and documented app setup. Frontend/backend production builds pass.
- **Skill(s) used (if any):** planning-and-task-breakdown, backend-development, frontend-design.
- **Open questions / next steps:** Sprints remain open for owner review. Remaining gaps or external dependencies include multi-week program planning, actual QR image rendering and Firebase realtime sync, advanced rankings/trends, trained ML model/data/worker, PDF/media attachments, hosted push/email delivery, monitoring, and deployment secrets. Verify privacy/club isolation and operational behavior against configured Firebase, MongoDB, and Redis before acceptance.

## Session 24 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Fix the TypeScript parse error in the STMS club membership route.

**Decisions made:**

- **Changes / additions:** Corrected the `/mine` route response closure in `stms-backend/src/routes/club.routes.ts`; `npm --prefix stms-backend run typecheck` passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** None for this syntax fix.

## Session 25 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Enable platform administrators to select clubs from the header switcher.

**Decisions made:**

- **Changes / additions:** Updated the club switcher to load the platform club directory for system admins, while keeping other users limited to their active memberships. The frontend TypeScript check passes.
- **Skill(s) used (if any):** None.
- **Open questions / next steps:** None.

## Session 26 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Allow athletes without a club to request enrollment and let club staff review requests.

**Decisions made:**

- **Changes / additions:** Added a public club directory for authenticated athletes without memberships, pending enrollment requests with optional athlete notes, a staff inbox in club user management, and approve/decline actions. Approval creates an active athlete membership; coaches continue to create or link the detailed athlete profile. Added duplicate-request protection and indexes. Frontend production build and backend/frontend typechecks pass.
- **Skill(s) used (if any):** backend-development, frontend-design.
- **Open questions / next steps:** Outbound email/push delivery is not configured; club staff see requests in the in-app roster management inbox. Owner should verify the workflow against configured Firebase and MongoDB services.

## Session 27 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Fix HTTP 500 responses when switching clubs.

**Decisions made:**

- **Changes / additions:** Corrected `apps/backend` to resolve the Firebase UID to a MongoDB user before membership lookup. Club switching now synchronizes membership-derived role/permissions and Firebase claims, issues fresh access/refresh tokens, and grants system administrators membership when selecting a club. Added focused switch-service tests; all three pass.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** The full auth-service test file still has one unrelated failing refresh-token test. Restart the running backend if its dev watcher does not reload the updated service.

## Session 28 — 2026-09-30

**Contributor(s):**
Codex

**Focus:**
Fix manual athlete creation failures from the roster form.

**Decisions made:**

- **Changes / additions:** Aligned the active `apps/backend` create/update schemas with the frontend contract: the backend supplies the club ID, optional profile fields may be null, and birth dates may be date-only strings. Athlete response formatting now handles stored date strings and Date values. Added payload and invalid-date regression tests.
- **Skill(s) used (if any):** backend-development.
- **Open questions / next steps:** Rebuild or restart the active backend process if its watcher does not reload these changes. Verify creation with the configured MongoDB and Firebase account.
