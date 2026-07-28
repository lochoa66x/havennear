# HavenNear Phase 2 — Verified Shelter Participation

Build the operational shelter-participation layer on top of the Phase 1 national directory.

## Goal

Verified shelter staff can securely maintain their own public operational information and publish short-lived availability updates. HavenNear remains free, participation never changes public ranking, and no information about a person seeking help is collected.

## Authorization

- Continue using platform-provided Sign in with ChatGPT identity.
- Keep authorization decisions on the server.
- Bootstrap the first operator only while the Sites deployment remains owner-only.
- Operators can review enrolment requests, grant or revoke shelter access, and curate the directory.
- Shelter staff can update only the shelter explicitly assigned to their verified email.
- Authentication alone must never grant directory-curation privileges.

## Enrolment workflow

- Show pending shelter enrolment requests in a private operator workspace.
- Allow an operator to match a request to an existing shelter.
- Approving a request grants application-level access to the official email in that request.
- Rejecting a request requires a reason.
- Keep grants revocable and auditable.
- Do not store guest, seeker, intake, case-management, or health information.

## Shelter staff workspace

- Replace the preview-only administration page with a signed-in workspace for authorized staff.
- Allow updates to:
  - availability status;
  - optional numeric spaces;
  - expiry window between 30 minutes and 4 hours;
  - public hours;
  - intake guidance;
  - public services;
  - public eligibility groups.
- Show a clear public-listing preview before saving.
- Keep a recent update history attributed to the authenticated staff email.
- Mark a shelter as participating only after its first verified update.

## Public safeguards

- Expired availability must automatically return to “Call first.”
- Confidential shelters must never expose an address, coordinates, or directions.
- Participation must never improve proximity ranking.
- The public API must expose no staff email, enrolment request, access grant, operator, or audit data.
- Do not accept seeker coordinates in any API.

## Delivery

- Add D1 schema and a migration.
- Add focused safety tests.
- Preserve the public search, directory review, enrolment form, privacy language, free public-benefit position, and “For Razan” dedication.
- Commit and deploy the completed release to the owner-only pilot.
