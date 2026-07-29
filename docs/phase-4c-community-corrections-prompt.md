# HavenNear Phase 4C — Community Corrections and Shelter Claims

## Objective

Let community members report inaccurate public shelter information and let
authorized shelter staff claim the correct listing with less effort, while
preserving HavenNear's privacy boundary and human review requirements.

## Public correction workflow

- Add a “Suggest a correction” link to every published shelter card.
- Open a simple form with the shelter already selected.
- Allow correction categories for telephone, hours, intake, eligibility,
  services, location/confidentiality, closure/renaming, and other public facts.
- Require a concise correction explanation.
- Accept an optional authoritative source URL.
- Do not request the submitter's name, email, location, or account.
- Require confirmation that no guest, seeker, health, case, or intake
  information is included.
- Use a honeypot for basic automated-submission protection.
- Store suggestions privately with a durable reference number.
- Never change a public listing automatically.

## Operator review workflow

- Add a protected correction-review queue for HavenNear operators.
- Show the current shelter record, suggested change, source link, submission
  date, and private reference.
- Allow an operator to mark a suggestion resolved or dismissed with a required
  private review note.
- Keep reviewed suggestions available in recent history.
- Attribute decisions to the authenticated operator.

## Improved shelter claims

- Link “claim or update this listing” to the enrollment form with the shelter
  identifier included.
- Preselect the matching public shelter and prefill organization, city, and
  province when possible.
- Let staff change the selection or indicate that the shelter is not listed.
- Preserve independent organization/contact verification before access is
  granted.
- Keep participation free and separate from public ranking.

## Safety requirements

- No seeker, guest, intake-record, health, case-management, or precise visitor
  location data may be collected.
- Correction suggestions and enrollment requests remain private.
- Public corrections never auto-publish.
- Confidential shelters never expose hidden addresses or coordinates.
- All operator routes and actions require server-side authorization.

## Acceptance criteria

- Every shelter card links to a preselected correction and claim workflow.
- A correction can be submitted without an account or personal identity.
- Operators can review, resolve, and dismiss suggestions.
- Decisions are recorded with operator attribution and timestamps.
- Shelter claim forms prefill the selected listing.
- Existing directory, confidentiality, publication, and staff-access tests
  continue to pass.

