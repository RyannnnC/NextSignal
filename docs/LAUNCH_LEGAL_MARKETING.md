# Know Your Business — Australia Launch: Legal and Marketing Readiness

> Planning checklist only, not legal/tax/migration advice. Updated 2026-10-26. Check current rules and obtain suitably qualified advice before accepting public payments.

## 1. Legal and operations register

| Area | Pre-launch action | Owner / status |
|---|---|---|
| Operating eligibility | If not citizen/PR, verify actual visa conditions permit the proposed business and work; consult registered migration agent if uncertain | OPEN |
| Identity and registration | Decide sole trader vs company, apply for ABN if eligible, check ASIC business name and IP Australia trade mark before branding | OPEN |
| Tax | Check GST registration threshold (generally A$75,000 turnover) and cross-border sales; maintain records | OPEN |
| Consumer law | Transparent prices in AUD, what paid report includes, service timing, corrections/refunds, no exclusion of consumer guarantees | OPEN |
| Claims | Substantiate ads and report descriptions; no guaranteed ranking, funding, revenue or success score | OPEN |
| Privacy | Determine Privacy Act coverage (A$3m small-business exemption may have exceptions); design APP-aligned handling regardless | OPEN |
| Secret ideas | Private by default, data retention/deletion, restricted staff access, separate data use permission; do not re-use customer concepts in marketing/training | OPEN |
| Overseas providers | Map where LLM, providers, cloud and support can access personal data, assess cross-border rules and disclosures | OPEN |
| Security | SSRF controls, multi-tenant permissions, encryption, MFA, logs, back-up and incident plan | OPEN |
| Marketing | Opt-in consent for promotional emails/SMS; sender identification; working unsubscribe; proof of consent | OPEN |
| Data licensing | Written review of ABS, DataForSEO, AnswerThePublic rights to display, cache, export and commercialize results; Loot Drop references separately | OPEN |
| IP/content | Respect copyright and attribution; only use authorised logos/testimonials; original reports instead of republishing competitors' research | OPEN |
| Payments | Stripe contracts, tax receipts/invoices, chargebacks, duplicate webhook protection, refund workflow | OPEN |
| Terms | Plain-English Terms of Service, acceptable use, third-party data limitations, confidentiality, fair liability terms | OPEN |
| Analytics | Publish cookie/tracking disclosures and obtain consent where required; default to minimal analytics | OPEN |

## 2. Suggested public-facing documents

- `/privacy` — what ideas, URLs, identifiers, cookies and reports are collected, why; processors, overseas disclosures, retention, access/deletion contacts.
- `/terms` — permitted use, research limitations, report access, user-owned ideas, user responsibilities, confidentiality, suspension and dispute handling.
- `/refunds` — delivery, partial failure, correction/refund pathways consistent with ACL.
- `/methodology` — evidence classes, age of datasets, estimate vs fact, geographic matching, reproducibility and clear scope.
- `/contact` — genuine support and business identity.
- `/pricing` — all-in pricing, inclusions, number of research calls, limits, applicable GST, renewal/cancellation where relevant.
- At input: concise **confidentiality + AI processing notice**, separate optional marketing checkbox (unchecked).
- At reporting: source links, collection date and confidence/limitations; no probabilistic success score.

## 3. Data-provider license review worksheet

For each provider, fill:

```
Provider:
Specific product/endpoint:
Account plan / API eligibility:
Legal entity on contract:
Commercial use allowed?:
Customer-facing report/derived-work allowed?:
Raw data re-display and export permitted?:
Caching duration / retention:
Attribution / link obligations:
Territories and permitted user class:
Per-request / per-month quotas:
Support / termination terms:
Date of terms review:
Approval evidence link:
Decision: APPROVED / RESTRICTED / BLOCKED
```

Do not launch a provider's feature publicly until its permitted uses are resolved. Commercial report output may be allowed under conditions even where building a competing raw data service is forbidden; assess the actual contract.

## 4. Positioning and launch marketing

**Primary promise:** `Know your business. Know your market. Know your next move.`  
**Secondary differentiator:** `Australian market evidence, not generic AI optimism.`

**Target initial cohorts:** (a) Australia-based pre-launch founders seeking competitor and demand validation, (b) operating Australian small-business owners with a public website and identifiable commercial search demand. Track the two cohorts separately.

**Funnel:**

`Australian case study / local founder community / practical article` → `free snapshot` → `user confirms assumptions` → `limited, source-grounded findings` → `A$49 evidence report or opt-in expert implementation request` → `follow-up feedback`.

**Channels:**
- Founder communities and startup events where self-promotion is explicitly allowed; genuine demos and practical research.
- SEO content with Australian-specific methodology, legitimate examples, clear page titles; plan for organic discovery to take time.
- LinkedIn professional posts with screenshots of methodology and independently verified public-data case studies.
- Optional relevant bilingual founder content only if there is a clear target segment; don't broaden paid product positioning accidentally.
- Partnerships with coworking communities, incubators and web studios by permission; transparent referral relationship disclosure.
- Short, permission-based direct founder outreach with one verifiable insight; no harvested/spam email campaigns.

**Initial content experiments:**
1. `Can Google search demand validate your Australian startup idea? What it cannot prove`.
2. `What ABS data can and cannot tell a founder about local demand`.
3. `A real Australian business niche: search intent vs actual willingness to pay`.
4. `Why founder failure stories are hypotheses to test, not forecasts`.
5. `Technical SEO fixes vs business positioning gaps: a worked example`.

**Conversion event taxonomy:** page view, input started, snapshot completed, source detail expanded, business correction submitted, checkout started, payment settled, report delivered, voluntary expert-contact opt-in, refund and repeat visit. Obtain privacy-compliant consent as applicable; avoid tracking raw idea text in analytics.

**30-day test decision gates (hypotheses, not market benchmarks):** 20–30 relevant completed snapshots total across both cohorts, ≥5 users give substantive feedback, ≥2 paid evidence reports OR ≥1 paid implementation engagement, >80% reviewed factual assertions have adequate source metadata, total spend stays inside budget. Report results separately per cohort.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI hallucinations | Evidence IDs, typed data, report QA, explicit unknowns |
| Data licensing/redistribution | Contract register and feature flags; no bulk mirrored competitor content |
| Visitors input other people's URLs | No inferred ownership or automatic marketing; open-site audit limited and lawful |
| Founder fear of idea theft | Confidentiality notices, short retention, private reports, deletion and limited employee access |
| Expensive anonymous free analysis | Rate limits, anti-bot, inexpensive tier, caching, daily budget kill switch |
| SEO takes longer than MVP launch | Direct demo distribution and case studies; don't promise immediate organic traffic |
| Consumer dissatisfaction | Clear inclusions, human support, remediation and fair refunds |
| Cyber incident | Isolated crawler, least privilege, incident response plan and restoration tests |

## 6. Official sources to monitor

- Australian government foreign-founder guidance: https://business.gov.au/planning/new-businesses/start-a-business-in-australia-as-a-foreigner
- Business name registration: https://business.gov.au/registrations/register-your-business-name
- GST obligations: https://business.gov.au/registrations/register-for-taxes/register-for-goods-and-services-tax-gst
- OAIC small business coverage: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business
- OAIC AI privacy: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products
- ACMA spam guidance: https://www.acma.gov.au/avoid-sending-spam
- ACCC misleading claims: https://www.accc.gov.au/business/advertising-and-promotions/false-or-misleading-claims
- ACCC consumer guarantees: https://www.accc.gov.au/business/selling-products-and-services/consumer-rights-and-guarantees
- ACCC standard contracts: https://www.accc.gov.au/consumers/buying-products-and-services/contracts
