# Implementation Plan: STMS Sprints 2–8

## Overview

Continue from the current club-scoped STMS API and React frontend. Implement each planned sprint as a real MongoDB-backed API and connected UI, preserve club isolation and permission checks, and build the backend/frontend at each dependency checkpoint. Hosted-service acceptance and owner review happen after implementation.

## Architecture decisions

- Use the existing Express, MongoDB, Firebase Auth, Redis, and React projects; do not build against the separate `apps/frontend` prototype.
- Keep every club-owned record scoped by `clubId`, validate requests with Zod, and enforce permissions in both API and UI.
- Use deterministic, explainable cold-start recommendation rules until a trained model and worker runtime exist. Do not present synthetic data as live records.
- Keep deployment artifacts aligned to the existing Vercel/Render/MongoDB/Firebase plan; actual secrets and hosted service setup remain owner-configured.

## Ordered implementation tasks

1. **Sprint 2 completion surface:** route the dashboard progress action and accurately explain owner review state. Build both projects.
2. **Sprint 3 attendance:** sessions, club-scoped attendance records, manual/bulk marking, expiring QR check-in, reports, and attendance UI.
3. **Sprint 4 workouts:** exercise catalog, workout creation/editing, assignment workflows, athlete workout view and completion logging; attendance integration on workout open. Multi-week programs remain a review gap.
4. **Sprint 5 performance:** competition results, fitness tests, goals, PB/SB detection, and exportable reports. Advanced trends/rankings remain a review gap.
5. **Sprint 6 recommendations:** persisted recommendations, explainable rule-based cold-start generation, coach review actions, athlete plan view, and triggers from performance/workout updates.
6. **Sprint 7 injury and permissions:** injury/wellness/RTP APIs and screens; permission request generation, approval workflow, and verifiable status.
7. **Sprint 8 analytics and polish:** role-scoped live aggregates, club announcements/read state, offline workout queue, accessible empty/error states, hosting configuration, CI build paths, and operational docs.
8. **Final checkpoint:** production-build backend and frontend, inspect the aggregate diff, and document service-dependent acceptance checks. Do not run owner review or mark the sprints accepted.

## Verification

- After each sprint slice, run `npm.cmd run build` in `stms-backend` and `stms-frontend`.
- Do not claim hosted behavior is verified by local builds. Owner later checks Firebase, MongoDB, Redis, realtime messaging, email delivery, Cloudinary, and deployment credentials.

## Risks

| Risk | Mitigation |
|---|---|
| The blueprint includes external integrations not configured in the workspace | Build provider-independent persistence and interfaces; document each required credential/service for owner review. |
| Broad sprint scope can make screens appear complete while relying on sample data | Remove or gate mock datasets; connect visible actions to persisted APIs before calling a slice implemented. |
| Cross-club access errors can leak sensitive health and performance data | Apply active club filters in every query and authorize record ownership/role before writes. |
