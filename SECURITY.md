# HavenNear Security Policy

## Supported version

Security fixes are applied to the latest deployed version and the `main` branch.
Older commits and independent modified copies are not supported by the HavenNear
maintainers.

## Reporting a vulnerability

Do not disclose a vulnerability, authentication bypass, confidential shelter
location, credential, or personal information in a public issue, discussion,
pull request, screenshot, or community correction.

While the repository is private, contact the repository owner through the
existing private project channel. Include:

- the affected page, endpoint, or commit;
- a clear description of the impact;
- safe reproduction steps using synthetic data;
- whether confidential information may be exposed; and
- any suggested mitigation.

When the repository becomes public, maintainers should enable GitHub Private
Vulnerability Reporting and update this policy with the direct reporting link.

Maintainers should acknowledge credible reports as quickly as reasonably
possible, prioritize risks to people seeking shelter and confidential locations,
and coordinate disclosure only after a fix or mitigation is available.

## Security boundaries

The following are security requirements:

- Public endpoints must never expose shelter staff identities, participation
  requests, audit records, correction-review notes, or operator records.
- Confidential shelter addresses must never be returned by public APIs.
- Shelter staff may update only the shelter explicitly assigned to them.
- Only authorized operators may approve publication, participation, or community
  corrections.
- Availability must expire instead of appearing live indefinitely.
- Community submissions must never directly mutate public listings.
- Precise seeker location must remain on the person's device.
- Secrets and production credentials must never be committed.

## Safe testing

Use only synthetic shelter, operator, and seeker data. Do not test against a
real shelter in a way that disrupts telephone lines, intake, availability, or
services. Do not attempt to identify residents or confidential locations.

Automated security testing against production requires prior maintainer approval.

## Dependency and deployment hygiene

- Review dependency updates and lockfile changes.
- Run lint, production build, and privacy/safety tests before deployment.
- Keep production secrets in the hosting platform's secret store.
- Use least-privilege access and remove access when a staff role ends.
- Review logs for accidental request-body or location capture.
- Maintain recoverable database backups and a documented rollback path.
