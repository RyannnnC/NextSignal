# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Australian founders and solo builders evaluating a business idea before launch. They need to identify what could invalidate the idea and decide what to test first.
- Operating Australian small businesses, including small SaaS businesses. Owners need to identify growth opportunities, choose actions they can carry out, and know how to measure the results.

Both audiences have equal product priority. Their workflows are at different stages of delivery.

## Product Purpose

NextSignal helps people decide what to validate or improve with evidence relevant to their business and location. A useful result identifies the decision at hand, what the available evidence supports, what remains uncertain, and a practical next step.

## Positioning

NextSignal starts with Australian markets, asks users to confirm or correct their business profile, and makes the grounds for each recommendation visible. The planned shared project lifecycle connects idea validation to growth after launch so owners can build on earlier hypotheses, experiments, and report versions. See the [project handoff](docs/PROJECT_HANDOFF.md).

## Operating Context

- Validate My Idea takes a business idea and target geography, lets the user review the inferred profile, and generates a report with hypotheses and suggested validation tests.
- Grow My Business is planned around a public website, an owner-confirmed business profile, and prioritized growth actions with measurement steps.
- The local preview uses email authentication and verification. Projects and account report history are private by default. Each historical report keeps the profile version it was generated from. The public example is a separate read-only route.

## Capabilities and Constraints

- Validate My Idea is available in the local preview. Research output is simulated by default. When enabled and applicable, ABS data adds contextual statistics with explicit coverage limits.
- Grow My Business, paid reports, and checkout are planned. Pricing and public launch timing are open. See the [project handoff](docs/PROJECT_HANDOFF.md) and [local development guide](README.md).
- Maintain project ownership, account isolation, and report version history. User-submitted ideas and reports are private workspace data.
- Represent sources at the geography and level of detail they support. Data collection and reuse must follow provider terms. See the [provider license register](docs/providers/LICENSE_REGISTER.md).

## Brand Commitments

- Use the name **NextSignal** and the workflow names **Validate My Idea** and **Grow My Business**.
- Use plain, measured language that states the evidence, material limitations, and available next steps. Preserve the established identity documented in [DESIGN.md](DESIGN.md).

## Evidence on Hand

- The [read-only example report](apps/web/app/components/example-report.tsx) covers a fictional Sydney laptop repair business. It labels public ABS Census data, the illustrative founder statement, simulated output, and an untested hypothesis separately. It explains why the local population count alone cannot establish demand.
- Use approved, attributable evidence in public materials. Keep invented scenarios and simulated outputs explicitly labeled.

## Product Principles

1. Give both priority audiences a clear path and describe each workflow at its current state of availability.
2. Give owners control over their business profile and preserve the inputs that generated each report.
3. Show which conclusions come from published evidence, user statements, simulation, or hypotheses.
4. End research with an action or test that the user can realistically carry out and evaluate.

## Accessibility & Inclusion

Support English and Simplified Chinese across the core journeys. Aim for WCAG 2.2 AA and design for keyboard use and narrow mobile screens. See the [design specification](DESIGN.md).
