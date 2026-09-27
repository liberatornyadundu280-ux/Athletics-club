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

**Current phase:** Requirements & System Design. Requirements gathering and analysis are done; system design is in progress; development, testing, and deployment haven't started yet. _(Update this line as the project moves through SDLC phases.)_

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

- [ ] 1. Authentication & user management
- [ ] 2. Athlete profiles & club management
- [ ] 3. Attendance module
- [ ] 4. Workout module
- [ ] 5. Performance tracking
- [ ] 6. Recommendation engine
- [ ] 7. Analytics dashboard
- [ ] 8. Deployment

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
