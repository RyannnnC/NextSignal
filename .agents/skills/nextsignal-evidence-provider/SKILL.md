---
name: nextsignal-evidence-provider
description: Evaluate or integrate a NextSignal research provider, verify geographic and statistical coverage, and test caching, provenance and report evidence.
---

# NextSignal Evidence Provider

1. Read the engineering rules, [architecture](../../../docs/ARCHITECTURE.md), and [provider license register](../../../docs/providers/LICENSE_REGISTER.md). Verify usage, attribution, display, caching and export rights before enabling access. Use public documentation or approved fixtures while rights or billing approval are pending.
2. Verify official schemas, actual coverage, time periods, geographic boundaries and units. For ABS use the [ABS integration plan](../../../docs/ABS_DATA_INTEGRATION_PLAN.md) and [comparison verification](../../../docs/LOCAL_COMPARISON_V2_VERIFICATION.md). Use comparable statistical areas and distinguish resident context from demand or purchase intent.
3. Extend the existing adapter and evidence contract with bounded requests and response validation. Retain evidence provenance, unknowns and per-source failure states. Keep shared public caches separate from private founder data. Treat case-study discovery sources as leads for source verification.
4. Verify contract failures, cache reuse and expiry, report readback, attribution and tenant isolation as applicable. Label fixtures, recorded observations and live results separately. Report remaining licensing and coverage gaps.
