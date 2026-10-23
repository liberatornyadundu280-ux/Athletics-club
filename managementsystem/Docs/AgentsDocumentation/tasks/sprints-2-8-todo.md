# STMS Sprint 2-8 Implementation Checklist

## Acceptance run - 2026-10-22

- [x] Ran the technical/API/database pass against two controlled clubs: Riverside (seeded history) and a disposable second club.
- [x] Created disposable Firebase/Mongo accounts for club admin, coach, athlete, invitation-mismatch and self-enrollment cases; signed in with real Firebase ID tokens.
- [x] 63 API/database checks passed on the acceptance build: auth/session rotation and logout, role enforcement, guest denial, cross-club reads/writes, athlete CRUD/import/invitations/self-enrollment, attendance and QR check-in, exercise library and workout assignment/completion, readiness calibration, performance PB/SB, recommendations, injury privacy/wellness/rehab/RTP, permission letters and public verification, analytics and announcements.
- [x] Removed every fixture afterwards. `stms_dev` is back to one club, 26 athletes, 24 sessions, 20 workouts, 208 results, 3 injuries and 27 recommendations; no `acceptance.*` users, athletes or clubs remain.
- [x] Backend typecheck and production build, frontend production build, and landing production build pass.
- [x] Fixed the blockers the pass exposed: `switch-club` used MongoDB `distinct`, which Atlas rejects with `apiStrict: true`; existing accounts kept stale cached permissions after a role-matrix change; coaches were denied the attendance-report and analytics-read permissions the sidebar already advertised.
- [ ] Owner/coach UI walkthrough and sprint sign-off. This is the remaining acceptance gate; the API/build pass is not owner acceptance.
- [ ] Start Redis and the Python inference worker before signing off Sprint 6's live ML path. During this pass Redis was not running, so generation correctly used `rules-cold-start-v1`; the model path was not exercised.

## Sprint 2 - Athlete profiles & club management

- [x] Club-scoped athlete CRUD, archive, search, CSV import and roster UI.
- [x] Manual athlete creation accepts the frontend form payload and preserves date-only birth dates.
- [x] Club settings, invitations, membership, switching and account linking available through existing APIs.
- [x] Athlete self-service club enrollment requests, staff review, and approval-driven membership activation.
- [x] Dashboard sprint progress destination; production builds pass.
- [x] Technical acceptance 2026-10-22: linked athlete/user resolution, search/pagination, profile updates, archive removal, CSV created/failed row counts, duplicate email rejection, invitation email binding, club settings/members, self-enrollment, and cross-club athlete denial.
- [ ] Owner UI sign-off.

## Sprint 3 - Attendance

- [x] Session lifecycle and club-scoped session/attendance records.
- [x] Manual and bulk attendance marking with role and club checks.
- [x] Expiring authenticated check-in links, attendance summaries and connected UI.
- [x] Backend and frontend production builds.
- [x] Technical acceptance 2026-10-22: manual bulk marking, QR token check-in, expired-token rejection, summary counts, completion-generated absences, athlete report denial, and cross-club session denial.
- [ ] QR image rendering and live Firebase attendance sync.
- [ ] Owner UI sign-off.

## Sprint 4 - Workout management

- [x] Exercise catalogue and workout authoring APIs/UI.
- [x] Searchable, image-enabled exercise library (free-exercise-db + authored track layer) with filters, provenance, club-private custom exercises, and editable starter workouts.
- [x] Four-week, twelve-session 400m starter block grounded in World Athletics, UK Athletics, NSCA, Haugen et al. and Australian Athletics guidance; safe `--refresh-starters` / `--prune-starters` reseeding preserves coach-edited workouts.
- [x] Athlete assignments, workout player, completion logs and attendance-on-open integration.
- [x] Connected coach and athlete workflows; backend and frontend production builds.
- [x] Technical acceptance 2026-10-22: 220-entry library, authored placeholders vs base images, club-private exercise isolation, duplicate-name rejection, dose-preserving workout edit, assignment/ownership denial, readiness-driven volume reduction, single completion, and starter `coachEdited` protection.
- [ ] Multi-week program/mesocycle authoring and progressive schedules.
- [ ] Owner UI sign-off.

## Sprint 5 - Performance tracking

- [x] Competition results, fitness tests, goals, PB/SB detection, APIs/UI and CSV export.
- [x] Backend and frontend production builds.
- [x] Technical acceptance 2026-10-22: first/second/third result PB and SB flags, athlete personal-best projection, fitness test and goal persistence/completion, athlete result scoping, and cross-club result denial.
- [ ] Historical trend visualizations, rankings, and formal federation conversion/export.
- [ ] Owner UI sign-off.

## Sprint 6 - Recommendation engine

- [x] Persisted, explainable cold-start recommendations based on attendance, workout, injury and performance data.
- [x] Coach review, athlete Smart Plan, and workout/performance triggers.
- [x] Backend and frontend production builds.
- [x] Technical acceptance 2026-10-22: coach generation, athlete-only visibility, cross-club review denial, coach acceptance creating an assignment, and athlete review denial.
- [x] Trained XGBoost model, feature pipeline and Redis Streams inference worker exist in `feature_engineering/`; the earlier "no trained model/worker" note was stale.
- [ ] Run the live ML path against a running Redis instance and worker; verify model version and athlete-specific output before Sprint 6 sign-off.
- [ ] Owner UI sign-off.

## Sprint 7 - Injury and permission workflows

- [x] Club-scoped injury, wellness, rehabilitation, return-to-play APIs and access controls.
- [x] Permission event/letter generation, review, and public status verification.
- [x] Connected UI and backend/frontend production builds.
- [x] Technical acceptance 2026-10-22: athlete diagnosis/mechanism/notes stripping, coach visibility, athlete/club privacy denial, wellness persistence, rehab task, RTP update, letter submission/approval, public verification and invalid-token rejection.
- [ ] Cloud media attachments and downloadable PDF documents.
- [ ] Owner UI sign-off.

## Sprint 8 - Analytics, notifications and deployment

- [x] Role-scoped analytics aggregates, date filters, athlete overview and CSV export.
- [x] Persisted club announcements, audience targeting, read status and preference API.
- [x] IndexedDB offline workout cache/queue and reconnect synchronization.
- [x] SPA hosting configuration, project-aligned CI builds, operational docs, and final production builds.
- [x] Technical acceptance 2026-10-22: club/role-scoped summaries, invalid date-range rejection, analytics-report permission split, announcement audience/club scoping, read state, preferences, refresh rotation/reuse rejection, and logout invalidation.
- [x] Coach analytics and attendance-report permissions aligned with the sidebar navigation.
- [ ] Configure/verify hosted email or push delivery, monitoring/alerts, and deployment secrets.
- [ ] Set `VITE_API_URL` to the Render API URL in Vercel (the local value is `/api/v1`, which relies on the dev proxy).
- [ ] Owner UI sign-off.

## Owner review

- [x] Technical verification of multi-club isolation, permissions, session handling and real MongoDB/Firebase workflows - 2026-10-22.
- [ ] Manual coach/owner UI walkthrough for every sprint.
- [ ] Confirm the coach permission alignment (attendance reports and read-only analytics) is the intended policy.
- [ ] Configure and verify Firebase, MongoDB, Redis, media/email services, and deployments as applicable.
- [ ] Review and sign off each sprint. A green build is not owner acceptance.
