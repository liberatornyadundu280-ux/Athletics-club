# Smart Trainer Management System (STMS)

## What This Project Is

STMS is an athletics/training management platform that helps coaches and trainers run their programs and serve their athletes well — replacing paper-based record-keeping with digital attendance tracking, performance monitoring, workout management, injury tracking, club management, and an AI-driven training recommendation engine.

## Scope Boundaries

- **In scope:** STMS — the platform-wide, multi-club system.
- **Out of scope:** the existing Athletics Club Website. It's a separate, already-functional project. Don't read, reference, or modify it while working here.

## Documentation Location

All documentation about STMS — specs, diagrams, architecture notes, decisions, session summaries — lives inside `managementsystem/AgentsDocumentation`. Nothing about the system's design or progress gets created anywhere else in the repo; that's the one place every session's changes accumulate, so the next session only has to look in one folder.

## Before Starting Any Task

Read, in this order:

1. The **Development Process & Progress** checklist below — to see what's already done.
2. `managementsystem/ProjectSummary.md` — for the detailed history of decisions from past sessions.
3. The rest of the documentation in `managementsystem/` — for full requirements/design context.

This file governs _how we work_; `managementsystem/` governs _what we're building and what's already been decided_.

**Current phase:** Implementation for Sprints 2–8 is in place; owner review/acceptance remains pending. External service requirements and remaining implementation gaps are listed in `managmentsystem/Docs/AgentsDocumentation/tasks/sprints-2-8-todo.md`.

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
- [ ] 2. Athlete profiles & club management — implementation ready 2026-09-29, added club-scoped athlete CRUD/archive APIs, searchable roster and profile editor, bounded CSV import with row results and client-side limits, system-admin club creation, invitation/account linking, and a working Sprint 2 progress page; frontend/backend production builds pass, owner acceptance pending.
- [ ] 3. Attendance module — implementation ready 2026-09-30, club-scoped sessions/records, manual bulk marking, expiring check-in links, summaries, and API-backed screens; builds pass. QR image rendering/Firebase real-time sync and owner acceptance pending.
- [ ] 4. Workout module — implementation ready 2026-09-30, exercise/workout authoring, assignments, workout player/completion, and attendance-on-open; builds pass. Multi-week program/mesocycle design and owner acceptance pending.
- [ ] 5. Performance tracking — implementation ready 2026-09-30, results, PB/SB, fitness tests, goals, and CSV export; builds pass. Trend/ranking/report depth and owner acceptance pending.
- [ ] 6. Recommendation engine — implementation ready 2026-09-30, persisted explainable cold-start rules, coach review, athlete plans, and event triggers; builds pass. No trained model/dataset/worker is configured; owner acceptance pending.
- [ ] 7. Injury & permissions — implementation ready 2026-09-30, privacy-scoped injury/wellness/rehab/RTP and permission generation/review/status verification; builds pass. Attachments/PDF generation and owner acceptance pending.
- [ ] 8. Analytics & deployment — implementation ready 2026-09-30, live club reports/export, announcements/read-state APIs, IndexedDB offline workout sync, Vercel SPA routing, corrected CI paths and operational docs; builds pass. Hosted notification delivery, deployment credentials, monitoring, and owner acceptance pending.

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

Not applicable yet — the project is still in the design phase. Fill in once scaffolding exists:

- Install: `TBD`
- Run frontend / backend locally: `TBD`
- Test: `TBD`
- Lint / format: `TBD`

_Keep this file current as scope, stack, or process decisions change — it's the fastest way to bring a new session, or a new contributor, up to speed._
