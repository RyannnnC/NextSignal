---
name: nextsignal-release-audit
description: Audit NextSignal release readiness, dependency and font licenses, known vulnerabilities, privacy obligations, and production approval gates.
---

# NextSignal Release Audit

1. Read the engineering rules and [launch checklist](../../../docs/LAUNCH_LEGAL_MARKETING.md). Use the [threat model](../../../docs/security/THREAT_MODEL.md) and [provider license register](../../../docs/providers/LICENSE_REGISTER.md) for affected integrations.
2. Trace dependencies, fonts and assets to their notices or upstream terms. Check commercial use, redistribution and attribution where applicable. Use the [previous dependency review](../../../docs/security/2026-11-10-DEPENDENCY_REVIEW.md) as history and collect current scan results.
3. Run the applicable lint, typecheck, tests, build, vulnerability and secret scans. Verify privacy notices, permissions, report claims and provider rights as applicable. Record actual results, unverified items, and tool or access blockers.
4. Identify approval or legal review still needed. Running an audit does not authorize paid purchases, publishing client data, public launch or production changes.
