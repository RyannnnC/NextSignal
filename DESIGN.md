# NextSignal — Design System v1.0

> Implementation update — 2026-10-28: the owner approved applying this visual specification to M1 and adding English / Simplified Chinese switching. DM Sans and IBM Plex Mono are self-hosted from Fontsource packages with OFL notices retained in `apps/web/public/licenses/`. Chinese glyphs use local system fallbacks (`Microsoft YaHei`, `PingFang SC`); no external translation or font request is made. The display name is **NextSignal**. Component-library selection remains deferred.

> **Status:** Approved starting baseline for implementation (subject to visual review).  
> **Product:** Australia-first AI market intelligence platform.  
> **Flows:** **Validate My Idea** (text → business hypotheses → market evidence → validation plan) and **Grow My Business** (URL → business profile → SEO/growth gaps → action plan).  
> **Source inspiration:** [MongoDB DESIGN.md](https://github.com/voltagent/awesome-design-md/blob/main/design-md/mongodb/DESIGN.md). Adapt its design *grammar*, not its protected visual identity, copy, illustrations, or proprietary fonts.  
> **Priority:** This file controls UI styling; `AGENTS.md`, `docs/ARCHITECTURE.md` and `docs/ENGINEERING_RULES.md` control product, security and data integrity. Security and accessibility requirements always take precedence.

## 1. Brand & UX principles

**Position:** Evidence before confidence. **Voice:** calm, precise, approachable, skeptical of exaggerated claims.  
**Working headline:** *Know your market. Find your next signal.*  
**Working supporting copy:** *Validate ideas and uncover growth opportunities with evidence grounded in Australian market data.*

1. A user should understand both entry paths in **five seconds**.
2. Start with a business question, not a complex dashboard.
3. Make *observations*, *third-party estimates*, *hypotheses*, and *unknowns* visibly distinct.
4. Evidence cards must show the source, region, observed/data period, and whether figures are estimates.
5. Explain why each recommended action matters and how it can be tested.
6. Free versus paid capabilities must be visible **before** prompting for payment.
7. Marketing pages can be expressive; research/report pages optimize for legibility and trust.
8. Prioritize responsive design, keyboard access, reduced motion and clear error states.

## 2. Visual identity

### 2.1 Palette — original NextSignal variant of MongoDB-inspired deep-teal / green

Do not use MongoDB's exact flagship brand-green `#00ED64` or its signature wordmark/leaf imagery. NextSignal's identity is *forest / teal / mineral-green*, slightly less fluorescent and better suited to research documents.

| Token | HEX | Usage |
|---|---|---|
| `brand.ink` | `#092E2A` | Dark hero, navbar on dark, dark footer |
| `brand.inkRaised` | `#124239` | Elevated dark panels |
| `brand.primary` | `#087F5B` | Primary **light-theme** actions, links, selected accents |
| `brand.primaryHover` | `#066A4D` | Hover primary |
| `brand.primaryPressed` | `#04543D` | Pressed primary |
| `brand.bright` | `#53E3A6` | Bright CTA on dark hero, small brand highlights |
| `brand.brightHover` | `#77ECBA` | Dark-hero CTA hover |
| `brand.mint` | `#DFF7E9` | Gentle highlighted research panels |
| `brand.mintSoft` | `#F0FBF5` | Supportive background |
| `surface.canvas` | `#FFFFFF` | Document and primary page |
| `surface.base` | `#F7FAF8` | App outer background |
| `surface.muted` | `#F0F5F2` | Secondary panel / input surroundings |
| `surface.border` | `#DDE7E1` | Neutral panel borders |
| `surface.borderStrong` | `#B7C9C0` | Focused-but-not-active structural dividers |
| `text.primary` | `#152922` | Main copy on light backgrounds |
| `text.secondary` | `#52675C` | Secondary copy |
| `text.muted` | `#667A70` | Captions / metadata; verify minimum contrast in context |
| `text.inverse` | `#FFFFFF` | Dark hero main text |
| `text.inverseMuted` | `#D1E9DD` | Dark hero explanatory text |
| `semantic.info` | `#235D9B` | Information / estimated data |
| `semantic.infoBg` | `#E8F1FA` | Information panels |
| `semantic.warning` | `#8A5608` | Hypotheses needing testing / caution |
| `semantic.warningBg` | `#FFF4DC` | Hypothesis panels |
| `semantic.danger` | `#AD3541` | Errors / user-impacting risk |
| `semantic.dangerBg` | `#FDECEF` | Error panels |
| `semantic.success` | `#0B7653` | Verified steps / success |
| `semantic.successBg` | `#E6F6ED` | Success panels |

**Hard rules:**
- On **light backgrounds**, primary buttons use `brand.primary` with white text. Do not use `brand.bright` with white text (insufficient contrast).
- On **dark hero**, primary CTA uses `brand.bright` with `brand.ink` text.
- Reserve saturated green for actions and small accents; avoid green body copy and oversized green surfaces.
- Charts use a distinct multi-hue *data* palette; green alone must not encode positive/negative meaning.
- No gradient across charts or text backgrounds. A restrained forest-to-teal gradient is allowed **only** for hero/CTA backgrounds.

### 2.2 Typography

**Primary:** `DM Sans` (Google Fonts, variable, regular 400 / medium 500 / semibold 600 / bold 700); geometric and warm, a licensed alternative to MongoDB's proprietary Euclid Circular A.  
**Data/code:** `IBM Plex Mono` (numbers, API identifiers, chart labels where suitable). **Never use monospace for body paragraphs.**

Fallback: `DM Sans, Arial, Helvetica, sans-serif`. Fonts must be deployed in a licensing-compliant fashion; self-host only permitted font assets. Do not copy MongoDB's Euclid font files.

| Token | Desktop | Mobile | Line height / weight |
|---|---|---|---|
| `type.hero` | 64px | 38px | 1.08 / 600; -0.035em tracking |
| `type.h1` | 44px | 34px | 1.14 / 600; -0.025em |
| `type.h2` | 34px | 28px | 1.22 / 600 |
| `type.h3` | 24px | 22px | 1.30 / 600 |
| `type.h4` | 19px | 18px | 1.38 / 600 |
| `type.lead` | 19px | 17px | 1.55 / 400 |
| `type.body` | 16px | 16px | 1.62 / 400 |
| `type.bodySm` | 14px | 14px | 1.55 / 400 |
| `type.caption` | 12px | 12px | 1.45 / 500 |
| `type.metric` | 30px | 26px | 1.15 / 600, tabular numerals |
| `type.mono` | 13px | 12px | 1.5 / 400, IBM Plex Mono |

Paragraph max reading width: **70ch**. Use sentence case for labels/buttons; all caps only for short editorial eyebrows. Body text smaller than 14px is not permitted for important content.

### 2.3 Shape, spacing and elevation

These geometry decisions are drawn from the **MongoDB reference** as requested.

| Token | Value | Usage |
|---|---:|---|
| `radius.xs` | 4px | Tiny tags |
| `radius.sm` | 6px | Technical code chips |
| `radius.input` | 8px | All text fields, dropdowns, code blocks |
| `radius.card` | **12px** | **Default cards**, research panels, pricing |
| `radius.cardLarge` | 16px | Large feature cards, report highlights |
| `radius.showcase` | 24px | A limited number of hero demos |
| `radius.pill` | 9999px | CTA buttons, filter pills, small status chips |

- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px`.
- The shared page shell and homepage content use a **1400px** maximum width. Home background bands span the viewport. Report main content is **960px**, with a **720px** reading column.
- Desktop page gutters: 32px; tablet 24px; mobile 16px.
- Base card padding 24px; dense table/card 16px; feature card 32px; mobile cards 16–20px.
- Standard sections 80px vertical; mobile 48px. Dark hero 96–112px top/bottom; mobile 64px.
- Default cards are **flat** with 1px border. Subtle hover shadow optional; no heavy shadows. Dialogs may have distinct elevation.
- Do **not** randomly introduce 20px corner radii or use pill-shaped cards. MongoDB-like 12px cards should feel consistent.

### 2.4 Motion

- Feedback durations: 120–180ms; panel transitions 180–240ms; easing ease-out.
- Animate state transitions only; never animate data values to imply research accuracy.
- Respect `prefers-reduced-motion`; no looping hero animations or decorative parallax.

## 3. Components — implementation contracts

### 3.1 Buttons

- **Primary, light:** `#087F5B` background / white label, `radius.pill`, min height 44px, horizontal padding 20–24px.
- **Primary, dark:** `#53E3A6` background / `#092E2A` label, same geometry.
- **Secondary:** transparent or white with 1px `surface.borderStrong`, readable label.
- **Tertiary:** text link with visible hover and focus affordance.
- One primary CTA per local decision area; disabled controls must explain why if needed.
- Loading buttons preserve width, announce progress and prevent accidental double submission.

### 3.2 Input controls

- Input height **48px** desktop/mobile, URL field optionally 56px in hero.
- Textarea for ideas: minimum **160px** tall, expand as needed; label above, example prompt below.
- `radius.input=8px`; 1px neutral border, visible 2px dark-green focus ring with offset.
- Inline validation near field; never rely on red color alone.
- Australia preselected as market; offer state/city only where source data supports that geography.
- Analysis may be unauthenticated with rate limits; account/paywall only when necessary to save or purchase.

### 3.3 Cards

- Default `ResearchCard`: white, 1px `surface.border`, **12px radius**, 24px padding.
- Large choice card: **16px radius**, generous internal whitespace, icon + title + short explanation + affordance.
- Two product-entry cards should have equal prominence on home: *Validate My Idea* and *Grow My Business*.
- Avoid overly colorful cards. State semantics are communicated through smaller chips or edge markers.

### 3.4 Evidence / provenance card — flagship component

Every important measurable claim must support:

1. **Claim/metric** with clear unit (e.g. average monthly search volume, indexed pages).
2. **Source** (ABS / DataForSEO / AnswerThePublic / verified public page).
3. **Geography** (Australia / NSW / Sydney only if data actually supports it).
4. **Reference period** and **retrieved date** (not interchangeable).
5. **Method / limitation** in expandable details.
6. **Evidence state:** Observed, Estimate, Hypothesis, or Unknown.
7. **Link to source** where permitted by licensing.

No generic accuracy score, fabricated forecast, or unverifiable competitive claim. Do not present Google Ads competition as SEO ranking difficulty or Google Trends relative index as absolute volume.

**Evidence states:** use explicit text labels + icons: `Observed`, `Third-party estimate`, `Hypothesis`, `Not enough data`. No decorative rainbow of badges. Review and correction controls belong near the claim.

### 3.5 Research steps / progress

Stages: `Understand → Plan research → Collect data → Check evidence → Generate actions`.
Only show completed when the server confirms it. API unavailable/insufficient data is a visible partial-result state, not silent fabrication. Do not display fictional percentages.

### 3.6 Charts, tables and comparisons

- Prefer **bar charts** for category/keyword comparisons and **line charts** for historical change; never use donuts merely for decoration.
- Data series palette (not global brand colors): `#087F5B` (series A), `#336CB3` (B), `#9A62A8` (C), `#C37A2B` (D), `#596B7A` (other). Adjacent lines/marks must also vary via stroke/marker where necessary.
- Use direct labels or accessible legend; tooltip must have keyboard-accessible equivalent; all charts require accompanying data table or textual summary.
- Show empty/insufficient data state instead of invented values or continuous lines across missing data.
- Counts use separators, meaningful units and measurement periods; percentages no more precision than inputs support.
- Table header stays readable; horizontal scrolling on small screens with visible cue; keep the first column identifiable.
- Charts and tables must disclose sample, geography, time and source at point of use.
- `IBM Plex Mono` for compact numerical displays only when useful; use tabular digits throughout metrics.

### 3.7 Risk / Red Team modules

- `Reality Check` is a neutral analytic section, **not an alarmist failure score**.
- Use small amber/neutral caution markers, not large red panels for unverified hypotheses.
- Each risk includes: hypothesis → evidence or missing evidence → next experiment → what observation would falsify it.
- Cite historical failures carefully; not all failures generalize to modern Australia.

### 3.8 Navigation and system surfaces

- Marketing nav: Logo | Validate an Idea | Grow a Business | Research | Pricing | Sign in.
- Logged-in app: Projects | Reports | Saved Research | Settings.
- Admin UI visually separate and access-controlled; never share customer/project reports publicly by default.
- Cookie/privacy notification must accurately reflect actual data flows and consent implementation; no deceptive dark patterns.
- Terms/privacy/disclaimer corrections accessible via footer and report view.

## 4. Page templates and flow

### 4.1 Home `/`

1. Full-width deep-teal hero with a plain-language value statement, a bright primary action, and a short example.
2. Validate My Idea and Grow My Business entry points in a light grey band, with accurate availability.
3. Three steps in a white band.
4. A sample report in a pale green band. Public editorial case studies require human review before publication.
5. Pricing and service availability in four rounded cards within the final white band before the footer.

Avoid stacked enormous gradients or an 8-feature dashboard preview above the fold.

### 4.2 Validate My Idea `/validate`

- Short prompt + optional market and customer fields; example idea input.
- AI displays inferred business model/target customer and **asks user to correct it** before paid API research where possible.
- Snapshot: idea structure, 3–5 keyword seeds, limited evidence preview, first red-team question, next validation experiment.
- Paid: deeper queries, verified Australia-relevant competitors, risk/contradictory evidence, full validation roadmap.

### 4.3 Grow My Business `/grow`

- URL input + market + goal; explain public-page-only crawl and data use.
- Confirm inferred product, audience and business claims.
- Report: technical SEO observations → search intent gaps → competitor evidence → ranked actions → measure plan.
- Distinguish observed page defects from hypothesized traffic/marketing impact; no ranking guarantees.

### 4.4 Reports `/reports/[id]`

- Report is private and access-controlled. `noindex` does not substitute authentication.
- Heading: subject, type, date, geography, methods, coverage limitations.
- Sticky table of contents on large screens: Summary / Evidence / Competitors / Risk or SEO Gaps / Actions / Methodology.
- Details use `EvidenceCard`, `ResearchTable`, `RiskPanel`, `ActionItem`.
- Locked sections must explain what a paid report contains before checkout; avoid deceptive blurred mock data.
- Include *Report a problem / Request correction*.

### 4.5 Public research `/research`

- Editorial case grid; 12px article cards and ample whitespace.
- Case pages state independent research, source dates and non-affiliation; only approved reviewed cases may publish.
- Don't silently turn a user's private report into public SEO content.

### 4.6 Pricing `/pricing`

- Initially emphasize `Free Snapshot` and `One-off Evidence Report` (price to be validated; current experiment **A$49**).
- Optional human service separate; no invented testimonials, savings claims or guarantees.
- Clarify deliverables, research limits, API data gaps and refund/consumer rights wording.

## 5. Responsive and accessibility

| Range | Intended treatment |
|---|---|
| < 640px | Single-column, 16px gutters, full-width forms/buttons, stacked chart legend and cards |
| 640–1023px | Two-column where useful, 24px gutters, compact nav |
| ≥ 1024px | Up to 1400px of page content, two-column hero, report TOC + content |

- WCAG 2.2 AA target. Text ≥4.5:1 contrast; large text ≥3:1; non-text essential controls ≥3:1. Validate actual rendered combinations, not tokens alone.
- Interactive targets ideally ≥44×44px. Keyboard focus visible and never hidden by sticky headers.
- Each input has a persistent label; errors tied programmatically to controls; progress accessible via polite announcements.
- Semantic headings, `main` landmark, skip link, logical tab order.
- Do not use green/red alone to communicate evidence quality or gains/losses.
- Charts must be accompanied by accessible alternatives; tooltips cannot be the sole carrier of information.
- No keyboard trap in payment, dialog, or report filters.

## 6. Implementation tokens and enforcement

Map tokens to CSS variables / Tailwind theme once, and reuse in components. Do **not** scatter hex literals throughout feature JSX.

```css
:root {
  --ns-page-max-width: 1400px;
  --ns-brand-ink: #092e2a;
  --ns-brand-ink-raised: #124239;
  --ns-primary: #087f5b;
  --ns-primary-hover: #066a4d;
  --ns-primary-pressed: #04543d;
  --ns-brand-bright: #53e3a6;
  --ns-brand-mint: #dff7e9;
  --ns-canvas: #ffffff;
  --ns-surface: #f7faf8;
  --ns-surface-muted: #f0f5f2;
  --ns-border: #dde7e1;
  --ns-text: #152922;
  --ns-text-muted: #52675c;
  --ns-radius-card: 12px;
  --ns-radius-input: 8px;
  --ns-radius-pill: 9999px;
  --ns-font-sans: "DM Sans", Arial, Helvetica, sans-serif;
  --ns-font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

**Component library:** the implementation can use a headless/accessibility-first library and theme it to these tokens. Any future user-supplied UI component library must obey these visual and accessibility contracts. Do not copy trademarked MongoDB graphics, typography assets or site copy.

- **Icons.** Use Ant Design Icons (`@ant-design/icons`) for new UI icons. Import the individual icons used by each feature. Hide decorative icons from assistive technology and provide accessible names for icon-only controls.
- **Charts.** Use Recharts (`recharts`) for data visualisations. Apply NextSignal design tokens and provide readable values, units, source information and an accessible text or table alternative.

**Mandatory UI PR checks**:
- [ ] Correct semantic token, no arbitrary palette/radius values.
- [ ] Cards use 12px (or documented large variants), inputs 8px, CTA pill.
- [ ] Keyboard and focus states tested; contrast checked.
- [ ] Mobile 375px and desktop 1440px screenshots reviewed.
- [ ] Form loading, empty, partial-data, error and success states designed.
- [ ] Every market claim displays available provenance and limits.
- [ ] No fabricated market metrics, customer logos, testimonials or research screenshots.
- [ ] Payment, private reports and correction/contact paths remain understandable.

## 7. Source attribution and design ownership

- Inspiration: [VoltAgent's MongoDB DESIGN.md](https://github.com/voltagent/awesome-design-md/blob/main/design-md/mongodb/DESIGN.md) for visual rhythm: deep-teal hero, bright green contrast, **12px card corners**, pill buttons, 8px controls, white research surfaces.
- This is an **original NextSignal specification**, not MongoDB's design system and not an endorsement or affiliation.
- The name **NextSignal** is a working selection, pending full Australian trade mark clearance and final asset checks.
- Amend this file when visual decisions change; record major changes in `docs/adr/` and update `AGENTS.md` to require the root `DESIGN.md`.
