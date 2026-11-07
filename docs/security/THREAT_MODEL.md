# M1 local fixture threat model

## Scope and trust boundaries

Browser -> same-origin Next BFF -> loopback capability-protected application host -> Docker PostgreSQL RLS. Bootstrap/import CLI tools own database management credentials; the worker opens only backend, queue and identity pools. Tenant operations reduce privilege using SET LOCAL ROLE. Queue claiming has a dedicated role with execute permission only. Identity has access only to private hashed sessions. A separate read-only inspector sees schema metadata without a tenant row policy. PGlite is test/export-only. Test accounts are development identities, not proof of production identity security.

| Threat | M1 control | Remaining release gate |
| --- | --- | --- |
| Cross-tenant IDOR / forged workspace | Server-resolved actor, RLS, composite FK, authenticated project reads | Supabase Auth/JWT and native PostgreSQL tests |
| Anonymous or cross-origin mutations | Session required; BFF exact-origin check; SameSite HttpOnly cookie; local-host capability | Production CSRF, secure cookies, bot controls |
| Unbounded inputs / free abuse | Strict schemas, 16KiB streamed body cap, idea length, project/session/day/call caps | Distributed IP/user rate limiting and challenge |
| Duplicate/replayed jobs | Transactional enqueue, idempotency hash/key, claim lease token, capped calls/retries, unique run report | Native concurrency, crash recovery and operator replay |
| Stale in-flight work | Recheck job lease and run status before commit; deletion cascade | Real provider abort/reconciliation |
| Secret/idea leakage | No idea-bearing logs; runtime/session key hashes outside public schemas; .local ignored | Production secret store, staff MFA and access audit |
| SSRF / DNS rebinding | No URL-fetch path exists; strict input rejects website fields | Egress-isolated fetcher and dedicated attack tests before G4 |
| Prompt injection | No model/tool execution; user content rendered as React text | Real-model isolation and fixed adversarial evaluation |
| Unsupported evidence | Fixture labels, typed numeric provenance, scoped citations, null/unknown propagation | Human QA against real reports; licence review |
| Shared machine compromise | Loopback-only, explicit test identities | Not defended: use test ideas only; do not tunnel |

No claim is made that local fixture security is production-ready. No public report links, paid unlock, email, website crawler or analytics are enabled. CSP allows Next development scripts; a nonce-based production CSP is deferred with production deployment.

Native verification update (2026-10-28): separate Docker/PostgreSQL tests now exercise non-superuser RLS, tenant constraints, pooled identity isolation and four independent worker processes. Controlled cancellation/deletion races reproduced 40P01 before the ADR 0006 fix and pass afterward. These close the local native-test evidence gap in the table, but not the Supabase/JWT or production operations gates. See `../operations/2026-10-28-NATIVE-VERIFICATION.md`.
