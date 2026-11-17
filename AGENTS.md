# Codex Instructions — NextSignal

NextSignal is an Australia-first business research platform. Validate My Idea and Grow My Business share an evidence engine and project lifecycle. Use `@nextsignal` for workspace packages.

## Read by task

Before proposing or changing code, read [Engineering Rules](docs/ENGINEERING_RULES.md). Read the applicable documents before working in their scope.

| Task | Required reading |
| --- | --- |
| Domain boundaries, interfaces or architecture decisions | [Architecture](docs/ARCHITECTURE.md) and affected ADRs |
| Product scope or priorities | [Project handoff](docs/PROJECT_HANDOFF.md) |
| UI, copy, components or accessibility | [Design](DESIGN.md) and applicable directory instructions |
| Provider integration or market evidence | [Architecture](docs/ARCHITECTURE.md), [provider license register](docs/providers/LICENSE_REGISTER.md) and relevant provider docs |
| Local database, migrations or recovery | [Local development](docs/operations/LOCAL_DEVELOPMENT.md) and [cutover ADR](docs/adr/0007-local-postgresql-cutover.md) |
| Sydney Supabase development | [Supabase development plan](docs/operations/SUPABASE_DEVELOPMENT_CONNECTION_PLAN.md) |
| Privacy, marketing publication or public launch | [Launch checklist](docs/LAUNCH_LEGAL_MARKETING.md) and [threat model](docs/security/THREAT_MODEL.md) where relevant |

## Boundaries and delivery

- Apply the engineering precedence and flag unresolved conflicts for an ADR. Preserve private-by-default data, tenant isolation, evidence integrity and approved provider usage.
- Get explicit owner approval for paid purchases, launching public services, publishing client data or changing production infrastructure.
- Before implementation, report scope, intended files, applicable security and licensing constraints, and acceptance tests. Implement one small vertical slice at a time. Use provider adapters and feature flags.
- After implementation, report actual file changes, checks run and results, unresolved issues and approvals still needed. Identify unavailable required tools and incomplete checks.
- Apply the approved design tokens, bilingual support, semantic controls, Ant Design Icons and Recharts. Obtain owner approval before adopting a full UI framework.

## Project skills

Use `$nextsignal-database-ops` for database operations and native verification, `$nextsignal-evidence-provider` for evidence provider work, and `$nextsignal-release-audit` for dependency, privacy and release checks.
