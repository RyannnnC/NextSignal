# ADR 0002: Confirmed profiles and typed research claims

- Date: 2026-10-27
- Status: Accepted extension of owner-approved M1 plan
- Owner: Project owner

## Context and alternatives

The conceptual pipeline creates a run before founder verification. Holding a worker lease while waiting for a founder is wasteful. Its evidence example also conflates source method with claim authorship and omits founder statements. Options were a new waiting research status, or a separate profile preparation phase. Choose the latter.

## Decision

Create an immutable awaiting_confirmation profile, then create a new confirmed profile version after the founder edits it. Only a current confirmed version may start research. A database trigger also rejects unconfirmed research. Correction preserves existing reports and requires a new run to regenerate recommendations; it never mutates historical output.

Claims distinguish observed_fact, third_party_estimate, founder_statement and ai_hypothesis. Evidence separately records measured/estimated/reported/inferred method, time, geography, units, uncertainty and limitations. M1 normalised findings carry claim type; profile fields are explicitly displayed as founder statements. Synthetic fixture origin is mandatory and not a real provider identity. Numeric assertions require typed metric evidence; narrative digits are rejected conservatively in generated findings. This is an intentionally restrictive template validator, not a claim that arbitrary LLM semantics can be mechanically verified.

Reports validate scoped evidence references, supporting/counter-evidence links, numeric source/value/unit/time/geography matches, action references and unique priorities. Missing data stays null, not zero. Contradictory and stale evidence remain visible. The default fixture report is partial because no real research has occurred.

## Security, cost and rollback

Tenant IDs remain in every record and composite foreign key. No provider work happens before confirmation. Immutable snapshots permit correction without rewriting history; authorized deletion can remove snapshots. Revert contracts and migration together only before persisted use; later changes require a new schema version and migration.
