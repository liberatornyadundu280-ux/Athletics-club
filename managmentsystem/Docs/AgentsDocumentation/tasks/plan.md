# Plan: Sprint 1 API Wiring and Page Action Audit

## Goal

Connect implemented Sprint 1 actions to the real backend/Firebase contracts, fix authentication and club identity defects that block those APIs, and make later-sprint pages clearly unavailable until their APIs exist.

## Audit Findings

- Access tokens use `sub` for the Firebase UID while backend middleware expected `uid`.
- `/auth/me` and `/auth/switch-club` consume user context but were mounted without authentication.
- Password login was a backend stub; password reset was a simulated multi-step flow.
- User/profile/club UI used sample data, toast-only saves, dead actions, or links to missing routes.
- Sprint 1 APIs cover registration, Firebase token exchange, user list/invite/role/deactivation, profile name, club settings, and club switching. Later module APIs are absent.
- Some backend paths treated Firebase UIDs as Mongo ObjectIds, and self-account checks compared different identifier types.

## Planned Work

1. Normalize JWT subject identity and protect authenticated auth routes.
2. Use Firebase Client SDK email/password and reset-email flows; exchange Firebase ID tokens for STMS sessions.
3. Keep club membership server-controlled: reject arbitrary club IDs during registration/token exchange, align Firebase/Mongo identity lookups, enforce active membership, and refresh role claims when roles or active clubs change.
4. Make invitations expiring, email-bound, shareable, and accept them through a protected route.
5. Build API-backed profile, active-club settings, and club roster experiences using existing endpoints; add only the profile endpoint needed by the approved design.
6. Audit all routes/actions. Route modules without APIs to clear planned-sprint states rather than presenting mock records or nonfunctional save controls.
7. Improve hierarchy, responsive behavior, and useful empty/loading/error feedback using the established STMS track/cyan/amber visual system.
8. Build frontend/backend, update this checklist, append the session summary, and keep Sprint 1 marked in progress until its remaining acceptance criteria are complete.

## Acceptance Criteria

- Firebase authentication produces a backend JWT whose subject is accepted consistently by protected APIs.
- Profile name, club membership/switching/settings, and roster actions persist through the matching backend API.
- Invitations can only be accepted by a signed-in account with the invited email, before expiry.
- All visible navigation points to existing routes; later-sprint modules explain their status without implying mock data is real.
- Frontend and backend production builds succeed. Hosted Firebase/MongoDB/Redis behavior remains dependent on the project owner's configured services.
