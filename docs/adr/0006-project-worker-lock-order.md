# ADR 0006: Consistent project/job/run locking

- Date: 2026-10-28
- Status: Implemented and verified for the owner-authorized native concurrency fix
- Owner: Project owner

## Evidence and problem

The initial seven native PostgreSQL scenarios passed. Review then identified opposite lock ordering between project cancellation and worker finalisation. Two additional controlled native scenarios reproduced PostgreSQL SQLSTATE 40P01 for both cancellation and project deletion. These were real PostgreSQL connection-level deadlocks, not fixture-provider failure simulation. Serialised PGlite transactions did not expose them.

The regression holds the worker's job lease row, starts a competing mutation, observes the competing backend's server-side Lock wait through pg_stat_activity, then releases the worker. It records SQL errors even if the worker catches them internally.

## Decision

Project mutations use FOR NO KEY UPDATE to serialize changes without blocking the foreign-key KEY SHARE locks needed for worker writes. Cancellation locks its job before its run, matching worker finalisation. Deletion first locks the owned project with the compatible lock mode, then all project jobs in stable ID order, and only then deletes the project and its cascading children. New project mutations cannot enqueue conflicting work during this sequence.

Do not hide the ordering defect with blind deadlock retries. Both regression cases must complete without SQL errors. Cancellation remains best effort: if a report transaction finishes first, cancellation is a no-op on the terminal run. Deletion still removes the project and report payloads after in-flight writers drain, and stale callbacks cannot recreate them.

## Security, privacy and cost

RLS, owner checks, private-by-default reports, atomic deletion and evidence validation remain in place. No isolation level is weakened, no privilege is elevated, no provider is called, and no customer database migration is performed. Native lock/statement timeouts still bound waits. Test containers and credentials are disposable and independent of .local/db.

## Verification and rollback

The new cancellation/deletion cases failed before the change with 40P01 and passed after the change. The complete native suite has nine passing cases, including four separate worker processes and rollback/reapplication. Base tests and browser flows also passed. See operations/2026-10-28-NATIVE-VERIFICATION.md.

No schema migration is required: this change affects application transaction locking only. Reverting the application statements restores the demonstrated concurrency defect; require the native regressions before accepting any alternative implementation.
