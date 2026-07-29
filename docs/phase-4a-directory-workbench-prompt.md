# HavenNear Phase 4A — Directory Enrichment Workbench

## Objective

Turn the private national-directory review page into a practical workbench that
can support the gradual verification of 1,114 federal shelter candidates.

The workbench must help a reviewer complete one shelter at a time without
displaying dozens of full editing forms. It must preserve HavenNear's existing
privacy boundary, source history, separate approval and publication steps, and
the rule that permanent capacity is never presented as live availability.

## Product requirements

### Compact review queue

- Display the current page of candidates as a compact selectable queue.
- Show shelter name, city/province, shelter type, missing-field count, review
  readiness, and duplicate warnings without expanding the full record.
- Keep exactly one candidate open in the editor at a time.
- Preserve the selected candidate after private saves when possible.
- Move naturally to another candidate after approval, merge, or rejection.
- Show the selected candidate's position within the filtered queue.

### Focused editor

- Retain all existing editable shelter fields and reviewer notes.
- Organize the editor into clear identity, public contact, operations,
  eligibility/services, safety, and reviewer sections.
- Show a public-readiness checklist for phone, public or confidential location,
  hours, and intake guidance.
- Provide direct links to the imported source and a pre-filled official-source
  web search for research assistance.
- Keep federal provider ID, organization, clientele, gender served, and
  permanent bed count visible as source context.
- Clearly state that permanent bed counts are not live availability.

### Filtering and progress

- Continue supporting search by federal ID, shelter, organization, or city.
- Continue supporting province and territory filtering.
- Add server-backed filters for emergency or transitional records.
- Add server-backed focus filters for possible duplicates, missing phone,
  missing location, missing hours, missing intake, and records whose core
  public fields are complete.
- Show the number of matching records and the current page.
- Keep pagination at 25 records per page.

### Safety and accessibility

- Never expose seeker, guest, intake, health, case-management, or staff-contact
  data.
- Never auto-publish an imported or approved record.
- Preserve explicit confirmation before approval, merge, publish, archive, or
  rejection.
- Confidential records must not require or expose an address.
- Keep controls keyboard accessible, responsive, and usable on narrow screens.
- Use plain language and the existing HavenNear visual system.

## Acceptance criteria

- Only one complete staging editor appears at a time.
- Changing filters reloads a correctly scoped server result.
- A reviewer can save, approve, merge, or reject the selected record.
- A reviewer can move between records without losing private draft edits.
- The readiness checklist accurately reflects the selected draft.
- Existing authentication, audit, publication, confidentiality, and public API
  safety tests continue to pass.
- New tests cover the workbench and its server-backed filters.

