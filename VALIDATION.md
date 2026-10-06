# Validation

First public release uses the existing ReceiptCal connector runtime and synthetic tests. Run `npm ci && npm run validate` with Node 22. Standalone checks cover TypeScript, account/action isolation, schemas, capability mappings, confirmation behavior and manifest alignment. The private product pipeline separately verifies backend route parity and the remote Worker.

Portable manifest schema checks and source/package inspection are performed before publication. Live user sign-in, authenticated account actions, and installation in every host are not certified by these checks. No real account data is needed for the test suite.

## Release checks — October 6, 2026

- Public standalone validation: 16 tests passed, TypeScript/build and manifest alignment passed.
- Portable plugin and MCP manifests passed the published Agent Plugins 1.0.0 JSON schemas.
- Private product cross-check: 14 integration tests and 13 remote Worker tests passed, including route parity and Worker dry run. No deployment performed.
- npm audit: zero reported vulnerabilities after compatible transitive dependency updates.
- Allowlisted export and package-file review: no private history, credentials, recordings or backend/app source included. Runtime TypeScript matches the existing integration package.
- Anonymous curl checks: OAuth discovery/resource metadata returned HTTP 200 and unauthenticated MCP returned HTTP 401. PKCE S256 is advertised. This is not a completed sign-in or authenticated host journey.
