# HavenNear

HavenNear is a free, privacy-first Canadian shelter directory. It helps people
find nearby shelter services and lets participating shelters share time-sensitive
availability without collecting information about the people seeking help.

> **For Razan — the original author of the idea.**

## Project promise

- Access for people seeking help is free.
- Human suffering is never a revenue source.
- Shelter employees and contractors may be fairly paid for their labour.
- Public directory facts are kept separate from shelter intake and case records.
- A person's precise location stays on their device when distance is calculated.
- Community corrections are private, reviewed by a human, and never auto-published.
- Shelter availability is time-sensitive and must never be treated as a guaranteed bed.

Read the complete [Project Charter](PROJECT_CHARTER.md) and
[Privacy Policy](PRIVACY.md).

## What HavenNear includes

- A mobile-first search experience for nearby published shelters
- Clear telephone, hours, eligibility, intake, service, and accessibility details
- Shelter-reported availability with freshness and expiry safeguards
- Anonymous community correction suggestions
- Protected shelter participation and directory-review workspaces
- A staged Canadian directory foundation based on public government data

HavenNear is a connection and directory tool. It does not register shelter
guests, reserve beds, make intake decisions, or store case-management records.

## Current status

HavenNear is under active development. Directory information must be verified
before publication, and users should call a shelter or 211 when information is
uncertain or urgent.

## Local development

Requirements:

- Node.js `>=22.13.0`
- npm

```bash
pnpm install
pnpm run dev
```

Quality checks:

```bash
pnpm run lint
pnpm test
```

The application currently targets a Cloudflare Worker-compatible runtime and
uses a D1 database binding named `DB`.

## Contributing

Please read:

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Privacy Policy](PRIVACY.md)

Never submit real guest, seeker, health, case, intake, or confidential shelter
location information in source code, issues, pull requests, screenshots, tests,
or sample data.

## Licence

HavenNear is source-available under the
[PolyForm Noncommercial License 1.0.0](LICENSE.md). Charitable organizations,
educational institutions, public research organizations, public-safety and
public-health organizations, environmental organizations, and government
institutions are permitted users under that licence.

The non-commercial restriction means this project is not described as
OSI-approved open-source software. No separate commercial licence is offered by
this repository.

## Attribution

The original HavenNear idea is Razan's. The software implementation is the work
of its contributors. Keep the Razan dedication and all required licence notices
with copies and modified versions.
