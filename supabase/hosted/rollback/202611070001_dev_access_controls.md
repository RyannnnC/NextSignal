# Recovery for hosted M1 access controls

Apply the baseline and this hardening in one transaction on a reviewed clean development target. Abort the transaction if any privilege, ownership or migration ledger check fails.

After commit, keep the browser-role revocations in place. If a scoped grant is missing, add it in a reviewed forward migration for the specific role and object. Rehearse recovery on an isolated target. Never restore browser default grants to recover the backend or worker. This revision has no data changes.
