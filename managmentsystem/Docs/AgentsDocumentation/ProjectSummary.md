# Project Summary

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