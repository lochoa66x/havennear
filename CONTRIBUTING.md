# Contributing to HavenNear

Thank you for helping people reach shelter information safely and respectfully.

## Before contributing

Read the [Project Charter](PROJECT_CHARTER.md), [Privacy Policy](PRIVACY.md),
[Security Policy](SECURITY.md), and [Code of Conduct](CODE_OF_CONDUCT.md).
Contributions must comply with the project's non-commercial licence and
privacy boundaries.

## Never submit real personal or confidential data

Do not place any of the following in code, fixtures, migrations, issues, pull
requests, screenshots, recordings, or logs:

- names or contact details of people seeking shelter;
- dates of birth, government identifiers, health details, or case notes;
- real intake records or shelter stays;
- credentials, authentication headers, tokens, or production secrets; or
- confidential shelter addresses.

Use obviously synthetic data. Public shelter information must include an
authoritative source and must still go through review before publication.

## Good contributions

- accessibility and low-bandwidth improvements;
- clearer multilingual or plain-language guidance;
- privacy and security tests;
- verified public shelter data corrections;
- tools that help reviewers validate public sources;
- expiry and freshness safeguards; and
- documentation for charities and shelter teams.

## Changes requiring explicit maintainer approval

- collecting new personal information;
- storing precise seeker location on a server;
- seeker registration or case-management features;
- advertising, analytics profiling, payment, or monetization;
- changes to ranking or placement priority;
- publishing confidential locations;
- automatic publication from community submissions;
- licence, charter, or Razan-attribution changes; and
- authentication or authorization changes.

## Development workflow

1. Create a focused branch.
2. Make the smallest safe change.
3. Add or update tests.
4. Run:

   ```bash
   pnpm run lint
   pnpm test
   ```

5. Open a pull request using the repository template.

Keep pull requests focused. Explain the user impact, privacy impact, data
sources, tests, and rollback considerations.

## Data-source requirements

For directory data, document:

- source organization and URL;
- access or publication date;
- licence or reuse terms;
- fields imported;
- whether an address may be confidential; and
- why the record is safe to publish.

An import must stage records privately. Importing is not permission to publish.

## Licence of contributions

By contributing, you agree that your contribution is licensed under the
[PolyForm Noncommercial License 1.0.0](LICENSE.md) used by this repository and
that required notices will be preserved.
