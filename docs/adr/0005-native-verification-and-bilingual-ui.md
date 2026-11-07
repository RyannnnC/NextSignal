# ADR 0005: Native PostgreSQL verification and bilingual design application

- Date: 2026-10-28
- Status: Implemented; local native verification passed after owner resolved the Docker prerequisite (see ADR 0006)
- Owner: Project owner

## Context and decision

The owner requested native PostgreSQL migrations, RLS and concurrent-worker verification, and approved styling the existing M1 surface using root DESIGN.md with English/Simplified Chinese switching. No real API, payment, production infrastructure or public deployment is authorized.

Keep the running application's existing PGlite data intact. Add a native Database adapter using node-postgres with separate application and queue pools. The test harness creates a randomly named Docker Compose project running official PostgreSQL 17, loopback-only port 54329 and tmpfs data. Generate disposable passwords per invocation; never commit or print them. Apply the same repository migrations. Bootstrap auth.users/auth.uid only as a test compatibility shim, explicitly not Supabase JWT validation.

Application transactions use a non-superuser, non-BYPASSRLS role. Queue transactions have only the claim function capability. Native scenarios verify SQL permissions, tenant foreign keys, immutable reports, independent-connection idempotency, SKIP LOCKED, stale-lease fencing, four separate OS worker processes, rollback and reapplication. These scenarios are not counted as passed until executed against a healthy engine. The runner fails closed, does not use PGlite, and only tears down its own generated Compose project.

## Observed prerequisite failure

Initially, Engine API checks timed out/returned HTTP 500. Desktop inspection using the computer-use skill showed **Virtualization is disabled in firmware** and **Engine stopped**. This was Docker's diagnostic, not an independent firmware inspection. The owner subsequently enabled virtualization and rebooted. The Linux engine now responds normally, and all nine local native cases pass after the cancellation/deletion lock-order fix in ADR 0006. No BIOS/UEFI, security settings or Windows features were changed by the agent. Remote CI remains separately unexecuted here.

## Design and language

Use existing design tokens, 12px cards, 16px choice cards, 8px fields, pill controls, accessible contrast and reduced motion. Do not select a component framework. Self-host the specified fonts via pinned Fontsource dependencies and retain OFL notices. Chinese uses installed system glyph fallbacks instead of downloading a large CJK font without a separate design decision.

Language buttons sit in the upper-right header with original inline Australian/Chinese flags, explicit English/中文 labels, accessible names and pressed states. Flags are visual cues, not definitions of a language's geography. Persist only the chosen locale in localStorage, support storage failure, update document language/title, and translate fixed UI/notice/status/report template strings. Stored inputs, provenance IDs, numeric metrics and historical reports are never rewritten or sent for translation. No marketing tracking is added.

## Cost, limitations and rollback

Docker image download and local disk/RAM consumption are the only new infrastructure costs; no cloud bill is created. The Docker test data is disposable and does not mount the application data. The native adapter does not make production auth ready. A passing accessibility audit is not a claim of complete WCAG conformance. Restore the previous stylesheet and remove presentation dictionaries to roll back UI; report data and contracts remain unchanged. Stop only the generated test Compose project to roll back its runtime.
