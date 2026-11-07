# Provider and processing register

No paid API account, subscription, licence clearance or live API test is asserted.

| Provider | M1 capability | Decision | Required before enablement |
| --- | --- | --- | --- |
| fixture | Local synthetic templates and missing/contradictory/failure cases | APPROVED_LOCAL | Never present as market data |
| ABS Data API | None | BLOCKED | Specific SDMX datasets/dimensions, period/geo semantics, attribution, caching/export/derivative rights and review record |
| DataForSEO | None | BLOCKED | AU endpoint/location/language, plan, metering, display/cache/export rights, budget and contract tests |
| AnswerThePublic | None | BLOCKED | Actual account API entitlement, allowed endpoints, commercial display/cache/export rights, quota and contract tests |
| LLM provider | None | NOT SELECTED | Model/config, data retention/training terms, subprocessors, cross-border disclosure and budget |
| Loot Drop / other sites | No collection | NOT APPROVED | Discovery/corroboration only after applicable rights review; no bulk scraping |

For every real provider record the legal entity, product/endpoints, terms version/date, territories/user class, allowed display/summary/export/cache/derivative uses, retention, attribution, quotas, termination, approval owner and evidence link. Permission to call an endpoint does not prove resale permission.

The application currently sends no idea or derived query to any research provider. Dependency installation is development tooling traffic; it is not a research integration. Public launch legal review remains open in LAUNCH_LEGAL_MARKETING.md.
