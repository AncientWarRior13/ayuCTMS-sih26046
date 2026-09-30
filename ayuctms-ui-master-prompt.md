# MASTER PROMPT — AyuCTMS Frontend: Complete UI/UX Redesign

> Paste this whole file into your coding agent (Claude Code / Cursor / etc.) at the root of the repo, with `docs/` and the frontend spec (`08-frontend-spec.md`) available. Everything below is written to the agent.

---

## 0. ROLE & MISSION

You are a principal product designer + senior creative frontend engineer with award-level craft (Awwards / FWA / Godly caliber) who also understands regulated, safety-critical software.

Redesign and rebuild the **entire frontend** of **AyuCTMS — AIIA Clinical Trials Dashboard** (SIH 2026, PS 26046, Ministry of Ayush) from scratch. You have **full creative freedom** over look, feel, layout, motion, and interaction. The result must make a judge say "this can't be a hackathon project" in the first 5 seconds, and make a pharmacovigilance officer say "I could use this for 8 hours a day" in the first 5 minutes.

**The one sentence design brief:** *An instrument-grade clinical-trial command center that feels like a living Ayurvedic ledger — calm, precise, trustworthy in the workspace; cinematic and unforgettable at the doors.*

---

## 1. CONTEXT & NON-NEGOTIABLES

**Read first, before designing anything:**
1. `08-frontend-spec.md` — the page-by-page functional spec. **It is the source of truth for functionality.** Every screen, role rule, form, table, state, and API call in it must still exist after the redesign.
2. `frontend/src/**` — the current implementation (`Layout.tsx`, `ui.tsx`, `widgets.tsx`, `routes/*`, `api/client.ts`, `auth/*`). Reuse the data layer (API client, TanStack Query hooks, auth/permission logic, WebSocket handling). **Rebuild the presentation layer.**
3. `docs/` (esp. `01-requirements-srs.md`, `02-architecture-design.md`, `04-api-spec.yaml`) — for domain context.

**Do not touch:** the backend, API contracts (`/api/v1`), permission semantics, or the data flow (TanStack Query keys/mutations).

**Hard functional rules carried over from the spec (design must express these, not fight them):**
- **Hide, don't disable** anything a role can't do. Permission-driven from `/auth/me`. **REGULATOR sees zero write controls.**
- 7 roles: PI, COORDINATOR, MONITOR, IEC, PV, ADMIN, REGULATOR. Role-specific dashboards from one shared Home component.
- **Synthetic data disclaimer** must be visible in the main layout footer at all times.
- **Badge tone → meaning mapping is global and consistent:** red = blocked/serious/expired/overdue, amber = needs attention, green = good/complete, teal/blue/purple/gray = neutral categories.
- **SAE clock chip** is live (1 Hz), with progress color change at 50/80/100%, compact mode for tables, and static "submitted / submitted late" once complete.
- Consent-quiz correct answers are never rendered outside IEC/Admin builder UIs.
- PII reveal requires a typed purpose (audited). Exports trigger real downloads and are never pre-fetched.
- Loading = inline skeletons (never a full-page spinner that hides the shell). Empty = dashed-border panel with one plain sentence. Errors = server message inline, 403 = friendly "your role does not have access" panel.
- Audit trail displays **UTC explicitly**. Tabular figures for all stacked numbers.

---

## 2. CREATIVE DIRECTION — "THE LIVING LEDGER"

### Concept
Clinical trials are a **chain of custody for truth**: consent → visit → event → report → audit hash. Ayurveda is a **living, botanical, tri-elemental system** (Vata / Pitta / Kapha). The product sits where those meet: **a precise ledger that grows like a plant.**

Recurring motifs (use with restraint, they're seasoning, not the meal):
- **The Chain** — linked nodes / hairline connectors (audit hash-chain, lifecycle stepper, timelines).
- **The Vine** — organic path-draw animations for progress/lifecycle (SVG stroke drawing).
- **The Ring** — radial clocks, gauges, and dials (SAE clocks, risk scores, enrolment).
- **The Tri-tone** — Vata / Pitta / Kapha color trio used only for Prakriti data and a few brand moments.
- **Fine botanical linework** — custom monochrome SVG herb illustrations for the herb–drug interaction card, empty states, and login art. No stock clip-art; draw them as simple, consistent 1.25px-stroke line drawings.

### Two-register strategy (this is the key decision)
| Register | Where | Feel | Tech |
|---|---|---|---|
| **Cinematic** | Login, splash/loader, role-switch transition, empty-state heroes, Compliance page header, "Chain intact" verification moment | Awwards-grade, WebGL, big type, scroll/scrub motion | R3F, GSAP, Lenis, shaders |
| **Instrument** | Everything a user works in for hours: tables, forms, safety inbox, drawers | Calm, dense, keyboard-first, zero jank, information-first | Tailwind, Radix, TanStack Table, Motion micro-interactions |

**Never let cinematic effects leak into dense work surfaces.** Motion in the workspace is functional (state change, focus, confirmation), not decorative.

### Mood & references (adapt the *principles*, never copy layouts)
- **Workspace density & craft:** Linear, Vercel dashboard, Raycast, Attio, PostHog, Stripe Dashboard, Height, Arc.
- **Data-as-hero storytelling:** Bloomberg Terminal reimagined, Palantir Foundry, Datadog, Observable/Vizzu, NYT/Pudding-style scrollytelling for the Compliance/Signals intros.
- **Cinematic front door:** browse Awwards (filter: Site of the Day → tags Science / Healthcare / Data Viz / WebGL / 3D), Godly.website (categories: Dark, Minimal, 3D, Editorial), Dribbble (search: "clinical dashboard dark", "pharma UI", "data-dense admin", "botanical UI"), Pinterest (boards/search: "scientific botanical illustration", "pharmacopoeia typography", "editorial dashboard layout", "brass instrument dials"). Pull a mood palette + 3 motion references per major screen and note them in `docs/ui/moodboard.md`.
- **Anti-references (avoid):** generic purple-gradient SaaS, glassmorphism everywhere, neon cyberpunk medical, stock "doctor with stethoscope" imagery, default shadcn look with no customization.

---

## 3. DESIGN SYSTEM (build this first, as tokens)

Implement as CSS variables + Tailwind v4 `@theme`. Ship **dark ("Ink", default) and light ("Parchment")** themes, respecting `prefers-color-scheme` with a manual toggle in the account menu.

### Color
| Token | Ink (dark) | Parchment (light) |
|---|---|---|
| `--bg` | `#0A0F0D` | `#F6F2E9` |
| `--surface-1` | `#101815` | `#FFFDF7` |
| `--surface-2` | `#16201C` | `#F0EBDD` |
| `--border` | `#22302A` | `#E4DCCB` |
| `--text` | `#E8EFE9` | `#14201A` |
| `--text-muted` | `#8FA398` | `#5E6B62` |
| `--brand` (Neem teal) | `#2FB39A` | `#0E6B5C` |
| `--accent-brass` (decor only: hairlines, illustrations, never status) | `#C8A45C` | `#9C7B2E` |

Semantic (same meaning in both themes, tuned for contrast): `ok #2FBF71`, `warn #F2A93B`, `danger #E5484D` ("sindoor"), `info #4C8DFF`, `purple #8B6CF0`, `teal #22B8B0`, `gray`.
**Never use the brand teal to mean "good"** — green is the only "good".

**Prakriti tri-tone** (Signals → Outcomes by Prakriti only): Vata `#7A8FB8` (air/slate-blue), Pitta `#E0713A` (ember), Kapha `#6FA36B` (moss).

Add subtle **grain/noise overlay** (2–3% opacity) and **soft radial ambient glows** behind hero surfaces. Depth via layered surfaces + 1px inner highlight borders, not heavy drop shadows.

### Typography (self-host via Fontsource; no external font CSS)
- **Display / editorial:** *Fraunces* (variable, soft/wonk axes) or *Instrument Serif* — big numbers, page titles, login hero.
- **UI:** *Geist Sans* (or Inter Tight).
- **Mono (IDs, hashes, subject codes, clocks):** *Geist Mono* / *JetBrains Mono*, with `font-variant-numeric: tabular-nums slashed-zero`.
- **Devanagari** (consent docs in Hindi, optional UI labels): *Noto Sans Devanagari* / *Tiro Devanagari Hindi*, tested in the consent-document preview.
- Type scale: fluid `clamp()`, 1.2 ratio; KPI numerals large and confident (display face, tabular).

### Space, shape, elevation
4-pt grid. Radius scale 6 / 10 / 16 / 24. Cards 10–16 radius with 1px border + inner top highlight. Density toggle (**Comfortable / Compact**) in settings, driving row height + padding tokens.

### Motion tokens
Durations: `instant 90ms · fast 160ms · base 240ms · slow 420ms · cinematic 900ms+`.
Easings: `--ease-out-expo cubic-bezier(.16,1,.3,1)`, `--ease-in-out cubic-bezier(.65,0,.35,1)`, `--spring` (Motion: stiffness 260, damping 28).
Rule: **entrances ease-out, exits faster than entrances, never animate layout-thrashing properties (animate transform/opacity/clip-path/filter only).**
**`prefers-reduced-motion`:** disable all parallax, WebGL animation, smooth-scroll, and long tweens; keep only opacity fades ≤120ms. Provide a static SVG fallback for every WebGL scene.

---

## 4. TECH STACK

**Keep:** React 19, TypeScript, Vite, react-router-dom v7, TanStack Query, Tailwind v4, lucide-react.

**Add (only what earns its weight):**
- **Primitives:** shadcn/ui + Radix (Dialog, Popover, Tabs, Tooltip, DropdownMenu, Accordion, Select) — *heavily restyled to the tokens above*. `vaul` for drawers, `sonner` for toasts, `cmdk` for the command palette.
- **Motion:** `motion` (Framer Motion) for component micro-interactions & layout animation; **GSAP** (+ `ScrollTrigger`, `Flip`, `SplitText`/manual split) for timelines, the vine/chain drawing, and cinematic sequences; **Lenis** for smooth scroll **only** on Login, Compliance header, and any long editorial section — never inside dense tables/drawers/modals.
- **3D/WebGL:** `three` + `@react-three/fiber` + `@react-three/drei` (+ minimal `@react-three/postprocessing`, bloom only). Custom GLSL shaders for the login field and risk topography.
- **Data viz:** keep **Recharts** for standard charts but fully re-skinned; write **custom SVG/d3** (`d3-scale`, `d3-shape`, `d3-hierarchy` as needed) for signature visuals (clock ring, heatmap, chain, vine, forest/PRR plot). Use `visx` if it reduces custom code.
- **Tables:** `@tanstack/react-table` + `@tanstack/react-virtual` for anything > 100 rows (Audit records, Signals).
- **Forms:** `react-hook-form` + `zod`. **Dates:** `date-fns`. **Class utils:** `clsx` + `tailwind-merge` + `cva`.
- **i18n-ready:** `react-i18next` scaffold with EN + HI for shell chrome (stretch goal; do the plumbing regardless).

**Performance rules:**
- `three`/R3F/GSAP-cinematic code is **lazy-loaded** and only on routes that use it. Workspace routes must not pay for WebGL.
- Initial JS for the authenticated shell ≤ **250 KB gz**; login page WebGL chunk loads after first paint (show static hero instantly, upgrade progressively).
- 60 fps target; cap DPR at 1.75; use instancing, no per-frame allocations; pause the render loop when the tab is hidden or the canvas is offscreen.
- WebGL capability + `prefers-reduced-motion` + low-power detection → automatic fallback to static/CSS art.

### Component sourcing (encouraged — this is where speed + polish come from)
Pull, then **restyle to our tokens** (never leave a library's default look showing). Record each in `docs/ui/component-credits.md` with source + license.
- **Magic UI:** Number Ticker (KPIs), Border Beam (focus/hero cards), Animated Beam (chain/flow visuals), Dot/Grid Pattern (backgrounds), Marquee (compliance standards strip), Shimmer/Sparkles buttons (sparingly).
- **React Bits:** Aurora / Threads / Silk-style backgrounds (login), Magnet & Click-Spark (CTA), Count Up, Text Reveal / Blur Text / Scramble Text (headlines, hash "decrypt" effect), Stepper, Tilt Card (login role cards).
- **Kokonut UI:** refined inputs, buttons, cards, toolbars, AI/loader components.
- **Also fair game:** Aceternity UI, Origin UI, 21st.dev community components, Cult UI, Motion Primitives. Check licenses; prefer MIT.

---

## 5. SIGNATURE COMPONENTS (the "wow" that also works)

Build these as polished, documented, reusable components. Each must have loading, empty, error, reduced-motion, and RBAC-safe states.

1. **`<ClockRing />` — SAE Regulatory Clock.** Radial dial with tick marks, an elapsed arc, and a mono countdown ("2d 04h" / "04h 12m 09s") in the center. Arc color shifts ok → warn (50%) → danger (80%) → pulsing overdue (100%+) with a slow breathing glow (respect reduced motion). Compact mode = inline pill with a mini bar (for tables). Completed = static "submitted" / "submitted late" badge. One shared 1 Hz ticker for all instances (no timer-per-chip).
2. **`<LifecycleVine />` — 8-state study stepper.** A horizontal path that **draws itself** (GSAP `DrawSVG`-style stroke-dashoffset) between nodes: completed = filled with a check, current = ringed + soft pulse, next = locked with a lock icon and a tooltip/amber banner listing the exact blocking reasons. Advancing plays a short "growth" animation, then a toast. Mobile: vertical.
3. **`<ChainViz />` — Audit hash chain.** Records rendered as linked blocks; `prev_hash → row_hash` prefixes in mono. **"Verify entire chain"** triggers a GSAP timeline that lights each link in sequence (fast, ~1.2s for the visible window, then summarizes) → green **"Chain intact — N records"** with a subtle bloom. Tamper case: the chain *breaks* at the record (red, shake ≤ 200ms, sparks optional) with "Tampering detected at record #N". Row click expands a before/after JSON diff (syntax-highlighted, added/removed lines).
4. **`<RiskHeatmap />` — Study × Site grid.** Cells are scored tiles (0–100) with a smooth green→amber→red ramp *and* a text band (LOW/MEDIUM/HIGH) so color is never the only signal. Magnetic hover, keyboard grid navigation (arrow keys), selection opens a side panel with weighted-component mini bars + raw counts. Optional **"Topography" toggle**: an R3F terrain where height = risk, sites on X, studies on Z (lazy-loaded, orbit-limited, has a 2D fallback and is clearly optional).
5. **`<SignalForest />` — PRR/ROR disproportionality.** Beyond the table: a forest-plot-style dot-and-whisker chart of ROR with 95% CI against the ROR=1 line, sortable, Evans-criteria "Signal" badge + a one-line explainer. Table remains the accessible source of truth.
6. **`<HerbDrugCard />` — Interaction warning.** Botanical line illustration per herb, severity badge (Minor/Moderate/Major), herb × drug-class pairing as a visual link (two nodes joined by a colored edge), mechanism + recommendation + source note, and the decision-support disclaimer footer. In the AE report modal it slides in *inline* the moment both fields are filled.
7. **`<ParticipantDrawer />`.** `vaul`-style right drawer with snap behavior on mobile. Sections as an accordion timeline; PII reveal uses a **"hold-to-reveal after typing purpose"** pattern with a blur→sharp transition and an auto re-blur countdown; per-visit CRF history shows a reason-for-change trail as a vertical diff timeline.
8. **`<CommandPalette />` (⌘/Ctrl+K).** Navigate to any page/study/participant/SAE by ID or text, run role-permitted actions ("Report SAE", "Log deviation"), switch theme/density. Only lists what the role can access.
9. **`<KpiTile />`.** Display-face numerals with Number Ticker on data change, delta chip, sparkline slot, warn/danger tone as a *left accent bar + icon* (not just color), optional Border Beam only when in danger state.
10. **`<PrakritiTriad />`.** A small tri-lobed (Vata/Pitta/Kapha) proportional glyph in the Prakriti outcomes table, with "small n" tagging when n < 5.

---

## 6. APP SHELL

- **Left rail:** collapsible (icon-only ↔ full), logo mark (custom: a stylized leaf-in-a-hash-chain-link glyph — design it in SVG), nav items filtered by permission, active item with a sliding indicator (Motion `layoutId`), keyboard shortcut hints, role chip at the bottom, permanent synthetic-data notice ("Synthetic demo data only · Ministry of Ayush / AIIA · SIH26046").
- **Top bar:** breadcrumb, global search / ⌘K trigger, **live alert bell** (red badge if any CRITICAL else amber; tiny live/reconnecting WebSocket dot; dropdown of ~20 latest with Ack), theme toggle, user menu (→ Account), sign-out.
- **Role identity:** a subtle per-role accent hairline + role label in the shell so it's always obvious whose lens you're in. Regulator gets a persistent "Read-only" ribbon.
- **Page transitions:** shared-element/`Flip` transitions for list → detail (e.g. study row → study header), 200–300 ms, interruptible. No full-page fades on every nav.
- **Toasts:** bottom-right stack via sonner, 3 tones; CRITICAL alerts get a persistent variant with a "View" action.
- **Live data feel:** when a WebSocket event lands, the affected row/tile does a single soft highlight flash (not a bounce) so users notice changes without distraction.

---

## 7. SCREEN-BY-SCREEN DIRECTION

Implement **every** screen and behavior in `08-frontend-spec.md`. Below is the *design intent* layered on top.

### Login `/login` — the Awwards moment
- Full-bleed **R3F scene**: a slow-rotating field of thousands of points that resolves into a **hash-chain / botanical mandala** (instanced nodes linked by hairlines, Kapha-green → Pitta-ember glints, bloom kept subtle). Cursor-reactive parallax (very gentle), scroll-free.
- Left: giant display-face headline + one-line pitch + the 4 differentiators as a staggered text reveal (GSAP SplitText-style). Ministry/AIIA attribution in small caps.
- Right: a frosted-but-crisp form card (Border Beam on focus), email/password, TOTP field that **slides in** only when required, inline errors, lockout state.
- **Demo-role picker:** 7 tilt cards (role name + demo email) that log in in one click; on hover the WebGL scene subtly shifts its accent to that role's hue. On success: a 700 ms "shutter" transition into the role's dashboard.
- Instant static hero (CSS/SVG) paints first; WebGL fades in after. Full fallback for reduced-motion / no-WebGL.

### Home / Dashboards (7 roles, one component)
- Greeting in display face + role chip (+ "Read-only" for Regulator).
- **KPI row** (6 tiles) with Number Ticker; bento-style grid below, cards arranged per role with a consistent 12-col rhythm. **Widgets stagger in once** (60 ms apart), never again on refetch.
- SAE clocks card = the star for PV: a list of `ClockRing` rows, sorted by urgency, with a live "next due" summary.
- Enrolment vs target: restyled grouped bars (Enrolled / Expected-by-today / Target) with a subtle "behind schedule" annotation.
- Lifecycle donut: thin ring, center total, legend as interactive filter to the Studies list.
- Audit integrity card (Admin): the mini `ChainViz` with a living status.
- Ethics approvals: status badges (Valid / Expires in Nd / Expired / Study closed) plus a timeline bar to expiry.

### Studies `/studies`
- Editorial page header, a filter bar with segmented lifecycle-state chips (counts on each), dense virtualized table with enrolment mini progress rings, SAE badges, and hover-row quick actions. "New study" modal → multi-step wizard feel (protocol → design → sites → dates) with a progress rail, still one modal.

### Study detail `/studies/:id`
- Sticky header (protocol no., state badge, CTRI badge, title) that compacts on scroll. Tabs with a sliding underline; tab content lazy-loaded; URL-synced (`?tab=`).
- **Overview:** `LifecycleVine` hero, KPI row, enrolment composed chart (bars + cumulative line + target line, brushable), details panel, sites, milestones (Gantt-lite bars with Done/Overdue/Planned), EC approvals, CTRI card (empty state explains why enrolment is blocked).
- **Participants:** table + Enrol modal (quiz rendered as calm, one-question-at-a-time cards with progress; guardian-consent field animates in when age < 18) + `ParticipantDrawer`.
- **Deviations / Queries:** severity-coded rows, age-in-days badges (red past threshold), inline answer input, sign-off modal with CAPA.
- **Safety:** compact table with live compact clock chips, deep-linking into the inbox.
- **Consent & amendments:** version timeline, SHA-256 shown as a mono "fingerprint" chip (with copy), comprehension-quiz builder with drag-reorder questions and an obvious "correct answer" radio; Hindi/English preview with Devanagari typography checked.
- **Exports:** three "artifact" cards (FHIR R4, SDTM DM, SDTM AE) with format glyphs and a real download button; no prefetching.

### Safety inbox `/safety` — the most important workspace
- Two-pane, resizable, URL-synced (`?ae=`). Left: serious-only toggle, list with SAE badge + compact clock or "All submitted". Right: header with report downloads, `HerbDrugCard`, big `ClockRing` panel with "Mark submitted" per clock, event details in a two-column definition grid, causality form with **Naranjo helper** as a guided 10-step modal with a live-updating score gauge.
- **Report modal:** wide, sectioned, with the live interaction check inline; ticking "Serious adverse event" reveals criteria chips (min 1 required) and morphs the submit button to a danger-styled **"Report SAE and start clocks"**. Keyboard-completable end to end.

### Signals `/signals`
- Study filter sticky at top. KPI tiles, PT table with "Review" badges, weekly area trend (all vs serious), SOC horizontal bars, arm/intervention tables, **PRR/ROR table + `SignalForest`** with the Evans thresholds note and the one-line "compared against the rest of the database" explainer, and the Prakriti table with `PrakritiTriad` + "small n" tags. Intro uses light scrollytelling (scroll-linked highlights, GSAP ScrollTrigger; native scroll, not Lenis).

### Risk `/risk`
- Tab 1: `RiskHeatmap` + side panel + legend. Tab 2: ranked participant risk table with score bars, band badges, and a side panel showing leading-indicator breakdown.

### Audit `/audit`
- `ChainViz` verification hero, Merkle checkpoints table (Check → match/mismatch badge; Anchor modal showing canonical text with copy + URL field; anchored = permanent, no re-anchor), paginated records (50/page) with expandable diff rows, explicit **UTC** everywhere on this page.

### Alerts, Compliance, Admin, Account
- **Alerts:** clean table with level badges, ack toggle, live row insertion.
- **Compliance:** the second cinematic page — a scroll-driven header, a status-badged matrix (Implemented / Partial-roadmap / Verify-citation), amber "VERIFY" badges, a standards marquee (CTRI, ICH-GCP, CDISC, FHIR R4, DPDP, ALCOA+), data-provenance table. Built for judges: obvious, scannable, screenshot-worthy.
- **Admin:** tabbed (Users & Sites, Regulatory rules, KPI thresholds, Data provenance); audited-reason fields marked clearly ("this is recorded in the audit trail").
- **Account:** profile card + 2FA setup as a 3-step flow (secret → confirm → enabled) with QR-ready layout + manual key with copy.

---

## 8. MOTION SYSTEM (summary)

| Layer | Tool | Examples |
|---|---|---|
| Micro-interactions | Motion | hover/press, tab indicator, toggle, badge change, toast |
| Layout | Motion `layoutId` / GSAP `Flip` | nav indicator, list→detail, accordion |
| Timelines | GSAP | vine draw, chain verify, login intro, KPI stagger |
| Scroll | GSAP ScrollTrigger (+ Lenis on Login/Compliance only) | Compliance header, Signals intro |
| Shader/3D | R3F + GLSL | login field, optional risk topography |

Motion principles: **purposeful, interruptible, consistent easing, one hero motion per screen max.** Anything that plays on every data refetch is a bug.

---

## 9. STATES, ACCESSIBILITY, RESPONSIVENESS

- **WCAG 2.2 AA** minimum in both themes (verify contrast of every semantic color on both surfaces). Full keyboard operability, visible 2px focus rings (brass or brand), correct ARIA for tabs/dialogs/grids/live regions (alerts announce via `aria-live`, CRITICAL = assertive). **Color is never the only signal** — always pair with text/icon/pattern.
- Skeletons match the final layout shape. Empty states use a custom botanical line illustration + one sentence + (if permitted) a primary action. Error panels show the server message, never a stack trace.
- **Responsive:** desktop-first for the workspace (≥1280 ideal), but every screen must work at 768 and be usable at 390 (tables → stacked cards or horizontal scroll with sticky first column; drawers → bottom sheets). Login and Home must look great on mobile.
- Print stylesheet for Compliance and SAE report views (clean, no chrome).

---

## 10. BUILD PLAN (follow this order; commit after each phase)

1. **Audit & plan:** read spec + repo, list every route/component/permission gate, write `docs/ui/redesign-plan.md` (IA, component inventory, what's reused vs rebuilt).
2. **Moodboard + tokens:** `docs/ui/moodboard.md`, then theme tokens, fonts, Tailwind theme, base primitives (Button, Input, Select, Badge, Card, Table, Modal, Drawer, Tabs, Tooltip, Toast, Skeleton, EmptyState, ErrorPanel, RoleGate).
3. **Shell:** layout, nav, top bar, alert bell + WebSocket status, command palette, theme/density toggles, footer notice.
4. **Signature components** (Section 5) in isolation, with a hidden `/__kit` route (dev-only) showing every component in every state and both themes.
5. **Login** cinematic scene + fallbacks.
6. **Screens** in this order: Home → Safety inbox → Studies + Study detail (all tabs) → Signals → Risk → Audit → Alerts → Compliance → Admin → Account → ParticipantDrawer polish.
7. **Motion pass** (GSAP timelines, page transitions, live-update flashes) → then **reduced-motion pass**.
8. **Quality pass:** a11y audit (axe), Lighthouse (Perf ≥ 90 on Login and Home; A11y ≥ 95), bundle analysis, cross-role walkthrough (all 7 demo logins), Regulator write-control sweep, mobile sweep.

## 11. DELIVERABLES

- Complete `frontend/` rebuild that boots with `npm run dev`, passes `npm run typecheck` and `npm run build`.
- `docs/ui/` → `redesign-plan.md`, `moodboard.md`, `design-tokens.md`, `component-credits.md`, `motion-spec.md`.
- `/__kit` living style guide (dev only).
- 7 role walkthrough notes ("what each role sees") + a 10-screenshot **demo path** list for the SIH presentation (Login → PV dashboard → SAE inbox with live clock → Naranjo helper → Signals forest → Risk heatmap → Audit chain verify → Compliance).

## 12. DEFINITION OF DONE — self-check before you say you're finished

- [ ] Every screen/behavior in `08-frontend-spec.md` exists and works for every role; nothing is merely disabled that should be hidden; **Regulator has zero write controls**.
- [ ] Synthetic-data notice is always visible. Badge tones are globally consistent.
- [ ] Both themes pass AA contrast; reduced-motion disables all WebGL/parallax/smooth-scroll.
- [ ] WebGL is lazy, has fallbacks, and doesn't ship in workspace routes.
- [ ] No component shows a default library look; everything reads as one system.
- [ ] Live clocks run off one shared ticker; nothing animates on every refetch.
- [ ] The Login, SAE inbox, Audit verify, and Risk heatmap are each individually screenshot-worthy.
- [ ] Nothing in the UI implies real patient data.

---

**Begin with Phase 1. Before writing UI code, reply with a 1-page summary of your design direction (name, palette, type, 3 signature moments) and any spec ambiguities you found — then proceed autonomously through all phases.**
