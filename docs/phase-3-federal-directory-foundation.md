# HavenNear Phase 3 — Federal Directory Foundation

## Source

National Service Provider List (NSPL), 2024 edition, published by Housing,
Infrastructure and Communities Canada through the Government of Canada Open
Government Portal.

- Dataset: https://open.canada.ca/data/en/dataset/7e0189e3-8595-4e62-a4e9-4fed6f265e10
- Resource: `nspl2024_opengov_list_jun12.xlsx`
- Licence: Open Government Licence – Canada 2.0
- Snapshot checksum:
  `sha256:6f73b3febcb04ddeb91a9a7368f12d826058b8c4aa0e68ee102aade2f0e190f3`

## Snapshot

- 1,114 unique federal service-provider records
- 587 emergency shelters
- 527 transitional-housing providers
- All 13 provinces and territories
- 267 communities

## Import policy

- Import every record into the private directory staging workflow.
- Preserve the federal service-provider ID, raw bilingual source fields,
  source version, permanent-bed count, organization, clientele, and gender
  served.
- Treat the federal bed count as permanent capacity, never live availability.
- Mark every federal candidate as missing a verified public address, phone,
  current hours, and intake guidance.
- Require a reviewer to determine whether an address is confidential.
- Do not auto-publish federal candidates.
- On approval or merge, preserve the federal identifier as a durable external
  cross-reference.
- Continue exposing only published, contact-verified records through the public
  API.

## Review workflow

- Search by federal ID, shelter name, umbrella organization, or city.
- Filter by province or territory.
- Review 25 candidates at a time.
- Show permanent-bed count and federal classifications separately from live
  availability.
- Suggest exact name/city or phone duplicates against the existing directory.
- Preserve source and licence links in the public site footer.
