# Provider and processing register

No paid provider is enabled. Public launch and commercial API use remain subject to licensing review.

| Provider | M1 capability | Decision | Required before enablement |
| --- | --- | --- | --- |
| fixture | Local synthetic templates and missing/contradictory/failure cases | APPROVED_LOCAL | Never present as market data |
| ABS Data API | Optional local-only 2021 Census comparisons for three Sydney statistical localities, using the allowlisted G01, G02 and G04 flows | Development opt-in, off by default | Confirm production availability, display, cache and export terms before release |
| DataForSEO | None | BLOCKED | AU endpoint/location/language, plan, metering, display/cache/export rights, budget and contract tests |
| AnswerThePublic | None | BLOCKED | Actual account API entitlement, allowed endpoints, commercial display/cache/export rights, quota and contract tests |
| LLM provider | None | NOT SELECTED | Model/config, data retention/training terms, subprocessors, cross-border disclosure and budget |
| Loot Drop / other sites | No collection | NOT APPROVED | Discovery/corroboration only after applicable rights review; no bulk scraping |

For every real provider record the legal entity, product/endpoints, terms version/date, territories/user class, allowed display/summary/export/cache/derivative uses, retention, attribution, quotas, termination, approval owner and evidence link. Permission to call an endpoint does not prove resale permission.

Default local reports use deterministic preview content. The optional ABS development worker sends fixed dataset coordinates, periods and locality codes. Submitted idea text, budgets, account identifiers and project IDs stay inside the local stack. The unauthenticated example displays one attributed public Census count and authored fictional content. [ABS coverage and limits](../ABS_DATA_INTEGRATION_PLAN.md) · [ABS copyright and attribution](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer)
