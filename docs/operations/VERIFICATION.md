# Local verification and CI

Run the fixture and Auth browser suites one at a time on the same workstation. They use separate web ports and share the local worker port. CI uses independent runners. Browser credentials, callback codes, private reports and local backups stay on the local machine or the ephemeral CI runner.

| Scenario | Where it runs | Regression it prevents |
| --- | --- | --- |
| Fixture lifecycle, Sydney evidence, three-area comparison, bounded API and keyboard-safe user input | `npm run test:e2e`, fixture suite | Broken saved reports, missing provenance, unsafe rendering or acceptance of unsupported or unauthorized fixture requests |
| Brand and public navigation, example report and back button, planned Grow and pricing states, and private legacy deep links | `npm run test:e2e`, navigation suite | Dead links, misleading scope, a public report accidentally requiring sign-in, stale project summary or a private fixture report exposed to another tenant |
| Locale switch, self-hosted font, input preservation and report translation | `npm run test:e2e`, language suite | Requests to external resources, lost edits or a change to the underlying report when switching languages |
| Registration, unverified denial, reset, nonempty HttpOnly cookies, revoked-session replay, private report versions and account isolation | `npm run test:auth`, independent CI job | Local signup, recovery, session and ownership failures that the fixture login cannot detect |
| Opted-in draft, reload, expiry, discard, verification in another tab, and cleanup after project creation | `npm run test:auth`, merged from the old fixture layout flow and extended | Lost consent or input and a draft surviving after the user discards or submits it |
| Full-page layout and screenshots at 375 and 1440 px, plus keyboard menu checks at 1023 and 1024 px | `npm run test:design`, explicit review | Viewport overflow, menu focus regressions, incorrect Auth page titles, and content misplaced in the desktop grid. Replaces the old multi-viewport layout suite and automatic captures in navigation, language and fixture tests. |
| SQL migrations, privilege checks, cache, multiple workers, legacy import and restart persistence | `npm run test:postgres`, `npm run test:import`, `npm run test:local-persistence` | Incorrect schema, tenant access, lease handling or loss of application records across container restart |
| Versioned backup and isolated restore | `npm run db:backup` after stopping fixture writers. CI runs it after persistence verification. | A dump that succeeds but cannot recreate the tables, grants or row content |

`npm run check` runs lint, TypeScript, unit tests, secret scanning and the production build. Start the pinned local Supabase CLI with `npm run auth:up` before running `test:auth` or `test:design`. `test:design` writes ignored screenshots under `artifacts/remediation/design/` using synthetic accounts and project input. Native PostgreSQL checks require Docker Linux. See [the cutover runbook](DATABASE_NAMING_CUTOVER.md) for rehearsal of historical databases, including the separate local model of the hosted ledger.
