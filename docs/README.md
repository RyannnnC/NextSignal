# Know Your Business — Project Governance Pack

This starter pack defines the non-visual architecture and enforceable engineering conventions for an Australia-first business research/SEO platform.

Files:
- `ARCHITECTURE.md` — modules, data contracts, information flow, schema, security, milestones and design handoff.
- `ENGINEERING_RULES.md` — mandatory conventions for developers and AI coding assistants.
- `LAUNCH_LEGAL_MARKETING.md` — Australian launch checklist, licensing review worksheet and distribution plan.

Recommended repository destination:
```
docs/ARCHITECTURE.md
docs/ENGINEERING_RULES.md
docs/LAUNCH_LEGAL_MARKETING.md
```

Root `DESIGN.md` and `assets/` were supplied on 2026-10-27. Final name, component library and exact font/asset handoff remain open. See `adr/0003-design-handoff-status.md`.

M1 decisions: `adr/0001-m1-local-fixture.md`, `adr/0002-evidence-and-confirmation.md`.
Local operation and deferred release gates: `operations/M1.md`.
Provider rights and security: `providers/LICENSE_REGISTER.md`, `security/THREAT_MODEL.md`.

This is a versioned project baseline, not a completed legal opinion, live software, or proof of API licensing approval.

Current local implementation: Next Signal, supplied DESIGN.md styling and English/Simplified Chinese UI are owner approved. The runtime now uses persistent Docker PostgreSQL; PGlite remains test/export-only. See [local run and Docker/VS Code inspection](operations/LOCAL_DEVELOPMENT.md), [actual cutover results](operations/2026-10-28-LOCAL-CUTOVER.md), [database fields](database/SCHEMA.md) and [ADR 0007](adr/0007-local-postgresql-cutover.md). Earlier pending-name/design or PGlite statements describe historical stages.
