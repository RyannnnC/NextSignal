# Native PostgreSQL verification follow-up

Date: 2026-10-28 (Australia/Sydney). This follows the earlier engine-blocked record; it does not rewrite that historical result.

## Observed environment

- docker info: Linux engine 29.9.2, responding normally after the owner's virtualization change and reboot.
- Docker Compose: v5.6.1.
- Official postgres:17 image reports PostgreSQL 17.11 (Debian 17.11-1.pgdg13+2).
- Inspected image digest: postgres@sha256:31ba9c94a03ada9988f2bb493a22a75eef3a185884533e5cdbcd498ea835b08f.
- Test container exposes only loopback port 54329 and uses disposable tmpfs. The running application's .local/db was not migrated or reset.

## Findings and fix

The first seven native cases passed. Additional controlled cancellation/deletion races each failed with actual PostgreSQL SQLSTATE 40P01. The worker held job then requested run, while competing mutations could hold run/project locks and wait for job. A project FOR UPDATE lock could also block worker foreign-key KEY SHARE writes.

packages/application/src/projects.ts now uses compatible project locks (FOR NO KEY UPDATE), job-before-run cancellation, and stable job locking before project cascade deletion. tests/native/postgres.native.ts now contains deterministic server-lock-observed regressions for both races, requires every one of the four worker processes to perform work, and exercises the application and tenant boundary again after migration rollback/reapplication. See ADR 0006.

## Actual final results

| Command/check | Actual result |
| --- | --- |
| npm run test:postgres | 9 native PostgreSQL cases passed after fixes |
| Native rerun after stronger post-rollback assertions | 9 passed |
| npm run check:all | Passed: base checks, native database suite and browser suite |
| npm test (within aggregate check) | 30 passed |
| npm run test:e2e (within aggregate check) | 4 Chromium scenarios passed |
| lint / strict typecheck / production build | Passed within aggregate check |
| Repository secret heuristic scan | Passed within aggregate check |
| docker image inspect and postgres --version | Confirmed the environment recorded above |
| docker ps after test cleanup | No remaining PostgreSQL test containers |

The native cases cover migrations; non-superuser/non-BYPASSRLS permissions; tenant RLS and foreign keys; immutable reports and denied queue access; concurrent idempotency and pooled identity isolation; SKIP LOCKED while another connection holds a row; both project mutation races; stale-lease fencing; four independent OS worker processes processing eight runs with exactly eight reports/eight provider-call records; reverse rollback and reapplication followed by a working private pipeline. All research is synthetic fixture work with no paid/provider API calls.

## Files changed in this follow-up

- packages/application/src/projects.ts
- tests/native/postgres.native.ts
- docs/adr/0006-project-worker-lock-order.md
- docs/adr/0005-native-verification-and-bilingual-ui.md (current status and historical failure context)
- docs/operations/NATIVE_POSTGRES.md
- docs/operations/M1.md
- docs/operations/2026-10-28-VERIFICATION.md (link to this follow-up)
- docs/operations/2026-10-28-NATIVE-VERIFICATION.md
- docs/PROJECT_HANDOFF.md
- docs/security/THREAT_MODEL.md

## Limits and remaining gates

This is successful local native PostgreSQL verification, not production/Supabase Auth approval. auth.users/auth.uid are a test shim; real JWT trust, production worker credentials, storage, backups, provider rights, real-provider billing reconciliation and public-launch legal review remain open. No real API or public deployment was enabled. GitHub-hosted CI/gitleaks were not executed remotely by this task.

The browser dev server emitted non-fatal Windows Watchpack lstat warnings for system paging/hibernation files during startup; all four browser assertions passed. This task did not change the UI or widen the scope to development-watcher configuration.
