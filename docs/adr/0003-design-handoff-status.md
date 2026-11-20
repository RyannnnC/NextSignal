# ADR 0003: Received design assets, deferred brand and UI library selection

- Date: 2026-10-27
- Status: Historical handoff. Naming is recorded in ADR 0004 and full UI framework adoption remains deferred.
- Owner: Project owner

## Context

The owner added root DESIGN.md, AGENTS.md UI instructions and assets/Logo.png, BigLogo.png, BigLogoWhite.png. DESIGN.md and supplied wordmarks use NextSignal, while naming was still under review. The latest owner instruction explicitly defers selection of a UI design system.

## Decision

Preserve all supplied assets and DESIGN.md without edits. The naming decision in ADR 0004 supersedes the interim title. Do not publish or embed conflicting wordmarks. The M1 functional form uses native semantic controls and a small subset of existing DESIGN.md tokens for readable layouts, 12px cards, 8px fields, pill buttons and focus states. This is not a new UI framework or brand decision. No component library or font files are installed. The declared font stack falls back to system Arial when DM Sans is absent; no remote font request is made.

Root DESIGN.md is the received design reference; the older docs/design.md placeholder is not the actual path. Broad marketing pages, chart components, logo processing and a full design system are deferred.

## Missing handoff items

- Final product name and whether NextSignal is the intended public brand.
- Exact existing UI library/package/source and permitted commercial licence.
- Original vector/transparent logo exports and usage/licensing confirmation; current PNGs are preserved as supplied and have not been cleared for public use.
- Licensed font assets if the supplied typography is to be reproduced exactly.
- Owner visual review of the future branded UI. The M1 fixture form is a functional test surface.

## Cost, security and rollback

No design purchases or external font requests. Privacy and evidence rules override presentation. Remove the small token stylesheet to revert presentation without changing application contracts or the supplied design source.
