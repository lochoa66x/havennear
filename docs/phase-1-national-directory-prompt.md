# HavenNear Phase 1 Prompt — National Directory Foundation

## Role

Act as the lead product engineer and data-safety architect for HavenNear, a free, community-oriented Canadian shelter directory.

Build Phase 1 of the national directory foundation on top of the existing HavenNear Montréal pilot. Preserve the current public design, privacy boundary, participant-neutral ranking, shelter enrolment form, administration preview and dedication “For Razan.”

## Objective

Replace the static shelter list with a durable Canada-ready directory and a private review workflow.

At the end of Phase 1:

- The existing Montréal shelters are served from the database.
- New directory records can be imported into a private staging area.
- A reviewer can inspect, correct, merge, approve, reject or archive a record.
- Only approved records can appear in public search.
- Every public field has source provenance and a verification date.
- The public experience continues to calculate proximity locally without storing the seeker’s location.

Do not import or publish the full national federal dataset during Phase 1. Phase 1 must make that future import safe and repeatable.

## Non-negotiable principles

1. HavenNear remains free for people and participating shelters.
2. Do not add advertising, paid placement, sponsored ranking or data sales.
3. Do not create shelter-seeker accounts.
4. Do not store a shelter seeker’s name, location, searches or device identifiers.
5. Calculate distance in the browser. Do not transmit seeker coordinates to the server.
6. Participation must never improve a shelter’s ranking.
7. Filter for suitability first, then rank all suitable shelters by proximity.
8. Never treat permanent bed capacity, historical occupancy or program capacity as current availability.
9. Only verified shelter staff may create a live availability report.
10. Every availability report must expire automatically and return to “Call first / unknown.”
11. Never geocode, infer, expose or return coordinates for a confidential shelter address.
12. Do not collect guest names, health information, case notes or intake records.
13. Imported records remain private until reviewed and approved.

## Existing product behaviour to preserve

- Public Montréal shelter search
- Women, men, youth, family, Indigenous, meal and shower filters
- Local device geolocation and straight-line distance sorting
- Call and directions actions
- Directory listing versus participating shelter explanation
- Official source link and source-check date
- Canada-wide shelter enrolment form
- Shelter administration preview
- Privacy statements and confidential-address protection
- “For Razan” dedication

## Phase 1 data model

Create durable structured tables for the following.

### Shelters

Required or supported fields:

- Stable internal ID
- Public slug
- Legal organization name
- Public shelter/program name
- Alternate names
- Shelter type: emergency, overnight, transitional, seasonal, warming/cooling, domestic-violence, youth or other
- Public address fields
- City
- Province or territory code
- Postal code
- Country code, defaulting to `CA`
- Latitude and longitude for public locations only
- Confidential-address boolean
- Public telephone
- Public email, when explicitly published by the organization
- Official website
- Intake guidance
- Public hours
- Eligibility groups
- Services
- Accessibility information
- Languages
- Total program beds, when sourced
- Participation state: directory, requested, verified-participant, suspended
- Publication state: staging, approved, published, rejected, archived
- Current availability: available, limited, full, call/unknown
- Optional spaces reported
- Availability update time
- Availability expiration time
- Record creation and modification times

Store multi-value operational fields in a consistent format that can later be normalized without breaking the public API.

### Source records

Track provenance separately from the shelter record:

- Source ID
- Shelter ID or staging-record ID
- Source organization
- Source title
- Source URL
- Source type: official shelter, municipal, provincial, federal, 211 partner or verified staff
- Applicable licence or reuse note
- Source publication date, when known
- Date retrieved
- Date manually verified
- Fields supported by that source
- Source status: active, superseded or unavailable

### Import batches

Track:

- Import batch ID
- Dataset name
- Dataset publisher
- Dataset version or year
- Source URL
- Licence
- File name and checksum
- Import time
- Total rows
- Accepted rows
- Rejected rows
- Duplicate candidates
- Import status

### Staging records

Keep imported records private with:

- Original source row
- Parsed candidate fields
- Validation warnings
- Duplicate candidates
- Reviewer notes
- Review state
- Link to the approved shelter record, when accepted or merged

### Review activity

Record operational directory changes:

- Record or staging-record ID
- Action
- Acting shelter administrator or reviewer identity
- Time
- Changed public fields
- Reason or reviewer note

Never place shelter guest information in review activity.

## Availability rules

- `available`, `limited` and `full` require a verified participating shelter update.
- Every participating update requires an expiration time.
- Expired updates must be treated publicly as `call`.
- Directory records without a current verified report always return `call`.
- Historical or aggregate occupancy information may be displayed as contextual source information only. It must never be transformed into “spaces available.”
- Numeric spaces are optional and must never imply a reservation.

## Public directory API

Create a read-only public shelter API.

It must:

- Return only published shelter records.
- Support province, city, eligibility and service filters.
- Support pagination.
- Return participation and availability freshness separately.
- Replace stale availability with `call`.
- Exclude staff contacts, enrolment requests, reviewer notes and audit information.
- Exclude private source notes.
- Exclude the address, coordinates and directions URL of confidential shelters.
- Include a safe public contact method for confidential shelters.
- Include source label, source URL and verification date.
- Use stable versioned response fields.

Do not accept seeker coordinates through this API.

## Public application migration

- Seed the existing Montréal directory records into the database through a repeatable migration or seed process.
- Stop using the static TypeScript array as the authoritative public source.
- Read approved Montréal shelters from the database.
- Preserve current filters, cards, calling, directions and participant labels.
- Continue calculating distance locally after records reach the browser.
- Preserve a safe fallback if the directory service is temporarily unavailable.

## Private review interface

Create a private directory-review section within shelter administration.

It must provide:

- Dashboard counts for staging, duplicate candidates, approved, published, rejected and archived records
- Import-batch history
- CSV upload or server-side import preparation
- A staging table with search and filters
- Side-by-side original and normalized values
- Validation warnings
- Duplicate suggestions based on normalized name, telephone, website, address and city
- Actions to approve as new, merge with an existing record, reject, archive or return for correction
- A public-listing preview
- Source and licence review
- Confirmation before publishing

Imported data must never bypass review.

## Duplicate detection

Generate duplicate candidates without automatically merging.

Use combinations of:

- Normalized shelter or organization name
- Telephone number
- Official domain
- Normalized street address
- City and province
- Geographic proximity for non-confidential locations

The reviewer makes the final merge decision.

## Confidential locations

- Do not require a street address.
- Do not run geocoding.
- Do not store inferred coordinates.
- Do not return a map or directions link.
- Store only the public service area and safe contact method.
- Preserve confidentiality during imports, review, exports, logs and error messages.

## Security and access

- Keep all write operations server-side.
- Require verified authorization for directory review and shelter updates.
- A shelter administrator may modify only locations assigned to their organization.
- A directory reviewer may review and publish records but may not access shelter guest information because HavenNear does not store it.
- Validate and limit every imported or submitted field.
- Protect enrolment and import endpoints against automated abuse.
- Do not expose database errors or internal identifiers unnecessarily.

## Accessibility and usability

- Preserve WCAG AA contrast.
- Do not communicate status using colour alone.
- Maintain keyboard navigation and visible focus states.
- Keep normal explanatory text at least 12–14 pixels.
- Keep public search list-first and mobile-first.
- Keep review tooling clear and functional rather than visually elaborate.

## Migration and compatibility

- Create and inspect database migrations.
- Do not destroy existing enrolment requests.
- Preserve existing URLs: `/`, `/admin`, `/join` and `/api/enrolments`.
- Add new routes without changing the public HavenNear URL.
- Keep the deployment compatible with the existing Sites and D1 environment.

## Validation requirements

Verify all of the following:

1. The production build succeeds.
2. Database migrations are present and valid.
3. Existing Montréal listings are returned from the database.
4. Pending staging records never appear publicly.
5. Rejected and archived records never appear publicly.
6. Confidential records contain no public coordinates or directions.
7. Stale availability returns `call`.
8. Participant state does not alter distance ranking.
9. Public API responses contain no staff or enrolment contact information.
10. The shelter enrolment form continues to store requests.
11. The public directory remains usable when location permission is refused.
12. The current mobile layout remains functional.

## Phase 1 exclusions

Do not include:

- Full National Service Provider List import
- Automatic public publishing
- Paid geocoding or routing services
- Shelter reservations
- Seeker accounts
- Guest intake or case management
- Staff access for unverified organizations
- Public availability inferred from government occupancy datasets
- Commercial placement or monetization

## Completion criteria

Phase 1 is complete only when:

- The directory source of truth is durable database storage.
- The current Montréal records have been safely migrated.
- A private staging and review workflow exists.
- Public records are provenance-aware and publication-controlled.
- Confidential-address and stale-availability protections are enforced in server responses.
- The current public search and shelter enrolment workflow still operate.
- The work is validated, committed and deployed as a private pilot version.

