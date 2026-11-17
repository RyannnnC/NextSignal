---
name: nextsignal-database-ops
description: Run NextSignal Docker PostgreSQL operations, legacy PGlite import or recovery, Sydney Supabase development migrations, and native RLS or multi-worker verification.
---

# NextSignal Database Operations

Read the repository engineering rules and select the procedure for the intended database.

- Local Docker, inspecting data, import or recovery: read [Local development](../../../docs/operations/LOCAL_DEVELOPMENT.md) and the [cutover ADR](../../../docs/adr/0007-local-postgresql-cutover.md). Verify Docker Engine health before Docker-dependent steps. Keep the legacy source stopped and preserve the private backup at `.local/backups/pglite-…/` through verification and recovery.
- Sydney development: read the [Supabase development plan](../../../docs/operations/SUPABASE_DEVELOPMENT_CONNECTION_PLAN.md). Verify the development target and migration ledger before applying a reviewed migration. Preserve applied checksums and keep credentials and exports private.
- Verification: run the documented native PostgreSQL, import, hosted and persistence checks that apply. Report each result separately and identify missing tooling. PGlite tests do not satisfy native or hosted checks.

Use the documented recovery procedure for import or migration failures. A verification request does not authorize destructive recovery or production changes.
