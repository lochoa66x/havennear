# HavenNear Phase 4B — Urgent-First Public Results

## Objective

Make HavenNear easier to use during a stressful moment by bringing shelter
results forward, prioritizing the information needed to decide whether to call
or travel, and explaining freshness without adding a complicated interface.

## Product requirements

### Search and movement

- Keep location processing on the visitor's device.
- After a submitted search, accepted location, or quick-help choice, move the
  visitor directly to the results section.
- Provide a clear way to return to the search without losing the directory.
- Continue ranking eligible listings by device-calculated distance when
  coordinates are available.

### Results before explanation

- Place filters and shelter cards before detailed network explanations.
- Replace the large participation/capacity explanation with a short call-first
  safety strip and an expandable explanation.
- Keep the rule that participation never affects ranking.

### Shelter-card hierarchy

- Present, in order: availability/contact status, shelter name, distance or
  location, who is accepted, intake instructions, operating hours, telephone,
  call and directions actions, services, source, and staff claim link.
- Label eligibility, intake, and hours in plain language.
- Make the call action visually primary and easy to tap.
- Never show directions for confidential locations.

### Freshness

- For participating shelters, show when availability was updated and when it
  expires.
- For directory listings, show the last verified source date.
- State clearly that a permanent bed count or directory listing is not a live
  space guarantee.

### Accessibility and resilience

- Keep the list usable without a map, account, precise-location sharing, or
  JavaScript geolocation permission.
- Maintain large touch targets, strong contrast, keyboard access, screen-reader
  labels, and responsive behavior.
- Include a simple 211 fallback when no matching shelter is shown.

## Acceptance criteria

- Search and quick-help actions focus the results section.
- Filters appear before expandable directory explanations.
- Each result exposes who is accepted, intake, hours, calling, and directions
  in a clear reading order.
- Live and directory freshness use different language.
- Confidential-location and public-data boundaries remain protected.
- Existing directory safety tests continue to pass.

