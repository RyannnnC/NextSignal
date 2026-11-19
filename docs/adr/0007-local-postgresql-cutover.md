# ADR 0007: Persistent local PostgreSQL cutover

- Date: 2026-10-28
- Status: Owner authorized; implemented and verified locally
- Owner: Project owner

## Scope and decision

Replace the local runtime's PGlite persistence with Docker PostgreSQL, preserve existing test data, retain private evidence/report semantics, and verify the complete M1 flow. No real provider, production Supabase authentication or public deployment is authorized. Fast PGlite tests and the legacy-reader dependency remain explicitly scoped to tests/migration, never a runtime fallback.

Use Docker Compose project next-signal-local, database next_signal_local, a persistent named pgdata volume and loopback-only port 54328. Pin PostgreSQL 17 to the inspected official image digest. Native disposable tests remain isolated on port 54329. The web/worker startup fails when Docker or migration readiness is missing.

## Credentials and permissions

Generate local-only credentials under ignored .local/postgres. Keep admin credentials/docker.env, runtime credentials and inspection credentials in separate files. The worker opens application, queue and identity pools only; bootstrap/import CLI tools open the management pool. Business transactions SET LOCAL ROLE nextsignal_app and bind the trusted fixture session's user identity. The queue role can claim jobs; identity has access only to private session records. Session tokens are random, hashed in PostgreSQL and expire; old PGlite sessions are not imported. The read-only inspector can view schema metadata but has no customer-row RLS policy. It cannot change data.

These are still local passwordless fixture identities behind the loopback-only BFF, not Supabase JWT validation. Local credentials and database files depend on the owner's OS access control; do not use this mode for confidential real customer data.

## Data migration

Require web/worker ports to be stopped and hold an exclusive local migration lock. Copy the untouched PGlite directory into an ignored backup, verify the raw file-tree digest, and read only a separate working copy. Export all 17 business tables, preserving UUIDs, periods, profile/report versions, JSON payloads, consent and audit rows. Do not print contents or migrate sessions. Apply version/checksum-checked repository migrations to the native target.

Only import into an empty target. Import rows and the cutover marker in a single transaction, and compare every table's row count plus canonical JSON SHA-256 before commit. Recheck the original source tree before commit. A matching source replay is a no-op; a different source or a nonempty unmarked target is rejected. Never truncate or silently merge a populated target.

## Verification and rollback

The actual source had no live projects/reports; accounts, workspaces, audits, deletion receipts and provider policies were preserved. An independent nonempty fixture with two report versions verifies report preservation, rollback after injected failure, idempotency and RLS. Browser tests now require a postgresql health signal. A controlled stop/start of the persistent container preserves an immutable test report and its tenant boundary. See operations/2026-10-28-LOCAL-CUTOVER.md.

No source PGlite directory is deleted. Backups and migration receipts are retained locally. Stop the app before recovery; retain the native volume, credentials and any post-cutover work. Do not switch blindly to the old snapshot after PostgreSQL has received new writes: it lacks those writes. Restore a reviewed backup into a separate clean target and reconcile subsequent changes before any rollback. No automatic fallback or destructive reset command is supplied. For a failed import before commit, transaction rollback leaves the target data unimported and the original source untouched.

## Cost and remaining gates

The new costs are local disk/RAM for Docker's persistent volume and source backups. No paid API or cloud service is enabled. Backup expiry, encrypted production storage, remote JWT trust, production operator access, provider rights and public-launch legal review remain separate gates.
