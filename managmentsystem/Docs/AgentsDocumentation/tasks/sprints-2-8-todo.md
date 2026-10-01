# STMS Sprint 2–8 Implementation Checklist

## Sprint 2 — Athlete profiles & club management
- [x] Club-scoped athlete CRUD, archive, search, CSV import and roster UI.
- [x] Manual athlete creation accepts the frontend form payload and preserves date-only birth dates.
- [x] Club settings, invitations, membership, switching and account linking available through existing APIs.
- [x] Athlete self-service club enrollment requests, staff review, and approval-driven membership activation.
- [x] Dashboard sprint progress destination; production builds pass. Owner acceptance is pending.

## Sprint 3 — Attendance
- [x] Session lifecycle and club-scoped session/attendance records.
- [x] Manual and bulk attendance marking with role and club checks.
- [x] Expiring authenticated check-in links, attendance summaries and connected UI.
- [x] Backend and frontend production builds.
- [ ] QR image rendering and live Firebase attendance sync.

## Sprint 4 — Workout management
- [x] Exercise catalogue and workout authoring APIs/UI.
- [x] Athlete assignments, workout player, completion logs and attendance-on-open integration.
- [x] Connected coach and athlete workflows; backend and frontend production builds.
- [ ] Multi-week program/mesocycle authoring and progressive schedules.

## Sprint 5 — Performance tracking
- [x] Competition results, fitness tests, goals, PB/SB detection, APIs/UI and CSV export.
- [x] Backend and frontend production builds.
- [ ] Historical trend visualizations, rankings, and formal federation conversion/export.

## Sprint 6 — Recommendation engine
- [x] Persisted, explainable cold-start recommendations based on attendance, workout, injury and performance data.
- [x] Coach review, athlete Smart Plan, and workout/performance triggers.
- [x] Backend and frontend production builds.
- [ ] Trained ML model, labeled dataset pipeline, and background worker; no training data/worker infrastructure is configured.

## Sprint 7 — Injury and permission workflows
- [x] Club-scoped injury, wellness, rehabilitation, return-to-play APIs and access controls.
- [x] Permission event/letter generation, review, and public status verification.
- [x] Connected UI and backend/frontend production builds.
- [ ] Cloud media attachments and downloadable PDF documents.

## Sprint 8 — Analytics, notifications and deployment
- [x] Role-scoped analytics aggregates, date filters, athlete overview and CSV export.
- [x] Persisted club announcements, audience targeting, read status and preference API.
- [x] IndexedDB offline workout cache/queue and reconnect synchronization.
- [x] SPA hosting configuration, project-aligned CI builds, operational docs, and final production builds.
- [ ] Configure/verify hosted email or push delivery, monitoring/alerts, and deployment secrets.

## Owner review (after implementation)
- [ ] Verify multi-club isolation, permissions, and real database workflows.
- [ ] Configure and verify Firebase, MongoDB, Redis, media/email services, and deployments as applicable.
- [ ] Review and sign off each sprint. Build success is not owner acceptance.
