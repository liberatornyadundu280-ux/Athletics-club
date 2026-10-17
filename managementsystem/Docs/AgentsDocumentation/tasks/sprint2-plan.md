# Sprint 2 Plan: Athlete Profiles & Club Management

## Overview

Deliver club-scoped athlete records in the root `stms-backend` and `stms-frontend` projects. Keep account identity in Firebase/MongoDB users, athlete-specific training and contact details in a separate MongoDB `athletes` collection, and link records to accounts by an optional Mongo user ID. Continue using the existing membership, invitation, club settings, and club-switching APIs where they already satisfy the design.

## Existing foundations

- Club settings, member invitations, membership roster, club switching, and platform club administration are present from Sprint 1.
- Frontend `Athlete` types and `/athletes` routes exist, but the route currently displays a Sprint 2 planned state.
- Backend currently has no athlete routes or athlete collection initialization.

## Tasks

### Phase 1: Athlete record API

- [x] Add a validated athlete document and create indexes safely at backend initialization.
- [x] Implement club-scoped list/search, detail, create, update, and archive endpoints with athlete permissions and optional account linking.
- [x] Implement bounded bulk import with row-level validation and per-row success/error results; reject duplicate emails within the active club.

**Acceptance:** Every query and mutation is scoped by the active club; invalid inputs and cross-club IDs cannot read or mutate another club's records; records can exist before the athlete creates an account.

### Phase 2: Athlete roster experience

- [x] Replace the `/athletes` planned state with an API-backed, searchable roster and clear empty/loading/error states.
- [x] Add create/edit and detail flows for athlete records and archive confirmation.
- [x] Add CSV import with a downloadable/example header, preview, and per-row result summary.

**Acceptance:** Coaches/admins can create, find, view, edit, import, and archive athlete records through the UI; no fake records or success-only actions are presented.

### Phase 3: Club workflow review and completion

- [x] Confirm existing club settings, invitation, membership, and club switcher routes remain reachable and API-backed; harden legacy missing-clubIds handling and link athlete profiles when invitations are accepted.
- [x] Build the root STMS frontend and backend and inspect the final diff; do not exercise hosted services as part of local build checks.
- [x] Record Sprint 2 implementation status and remaining owner-side hosted-service acceptance checks.

## Risks and constraints

- Atlas/Redis/Firebase availability is owner-configured and cannot be proven by local compilation.
- Club membership storage and older account records have legacy shapes; API responses must safely handle absent optional fields.
- Bulk import must cap row count and return row-level errors rather than partially hiding failures.

## Verification

- Build `stms-backend` and `stms-frontend` after implementation.
- Sprint owner manually verifies the live club, role permissions, invitations, club switching, and cross-club isolation against their configured services.
