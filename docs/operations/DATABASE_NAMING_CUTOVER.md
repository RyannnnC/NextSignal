# Database naming cutover

The source revision is `nextsignal-naming-source` (`ca132d6847acc3f432b8c268f1d2c3238680fa20`). The tool and historical SQL are available at `nextsignal-naming-upgrade` (`82acef7`). The historical checksum manifest records the exact Git and Windows checkout bytes. The upgrade checks the SQL and the applied ledger before changing any names. The final revision ships a fresh baseline and checks each historical checksum against the cutover marker and the corresponding pinned baseline checksum.

1. Stop the web application, worker and any migration/import command. Close application database clients. Keep Docker volumes and private connection files.
2. Dump the database and its roles and verify a restore to an isolated local PostgreSQL server. Keep the dump and role credentials under the ignored `.local/backups/` directory. For the fixture database use `npm run db:backup`. For local Auth, include the `auth` schema and use the same Supabase PostgreSQL image for the restore.
3. Check out `82acef7` in a dedicated checkout. Set `NEXTSIGNAL_CUTOVER_DATABASE_URL` privately to the loopback administrator connection for the copy. Run `npx tsx scripts/upgrade-database-names.ts fixture --apply` or substitute `auth`. Compare project, owner and immutable report IDs and row digests before and after. Check application/worker role membership, RLS and ABS cache privileges. Repeat the command to verify that it reports the recorded cutover.
4. Repeat the applicable command on the original local target only after its backup and rehearsal pass. Check out the final revision and use `npm run dev:fixture` for the fixture or `npm run auth:up` followed by `npm run dev` for local Auth. Preserve the credentials and existing volumes. Keep old binaries stopped after the cutover.

The `hosted` option is a local rehearsal with a disposable instance and its own ledger. These commands do not use hosted credentials. Applying future changes to a remote database requires a separate operational decision.

Schema and role renames preserve PostgreSQL object OIDs, policies, memberships, privileges and contents. The tool checks procedure body text and search-path settings for references that would require a separate migration. The fixture upgrade holds both generations of advisory locks. Local Auth and hosted use their established keys. The local Compose project, database address/name and Supabase project identifier continue to locate the existing persistent volumes.

If any validation fails the entire upgrade rolls back. If recovery is needed after commit, restore the verified dump and roles to a separate empty target and use the source revision against that copy. Keep both sets of volumes for reconciliation.
