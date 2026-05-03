# LOOM Frontend Design Guide

Document status: Active design contract  
Created: 2026-05-04  
Regenerated: 2026-05-04  
Purpose: complete Phase 4 guide for the LOOM Next.js public, landing, and admin web frontend  
Sources: `.agent/PRD.md`, `.agent/implementationPhases.md`, `.agent/phaseBacklog.md`, `.agent/sessionHandoff-2026-05-04.md`, `packages/contracts`, `docs/adr/0004-google-maps-provider.md`, `docs/adr/0005-public-lookup-privacy-model.md`, `docs/adr/0006-active-workspaces-and-placeholders.md`

## 1. Design Position

LOOM is a disaster communication product. The web UI has two personalities that must feel like one system:

- The landing page is polished, cinematic, and confidence-building. It explains why LOOM exists, how LoRa mesh reports reach the cloud, and where public users or admins should go next.
- The public and admin apps are professional operational tools. They prioritize map visibility, privacy-safe history lookup, admin node registration, message investigation, and fast scanning under pressure.

This guide intentionally changes the earlier map-first route model:

- `/` is now a landing page with several sections.
- `/public` is the public operational heatmap and lookup page that previously lived at `/`.
- `/public/history` is the focused public privacy-gated history lookup page.
- `/admin/login` is the admin sign-in route.
- `/admin` and nested admin routes are protected operational pages.

The PRD requirement still holds: public users can access heatmaps without login, and admins can authenticate, register nodes, inspect markers, and review message history. The only design change is that the root route becomes a landing page that routes users into those experiences.

## 2. Pre-Flight Design Plan

```text
seed = len("regenerate design guide from scratch with landing page and all LOOM flows") % 97 = 84
hero = "Artistic Asymmetry"; typography = "Geist + Geist Mono"; component set = ["Inline Typography Images", "Horizontal Accordions", "Infinite Marquee"]
motion = ["Scroll Pinning", "Card Stacking"]; page system = "landing aesthetic plus professional operations console"
```

AIDA mapping:

- Attention: cinematic landing hero with the LOOM product name, disaster-mesh positioning, and clear public/admin CTAs.
- Interest: gapless bento and interactive public/admin capability previews.
- Desire: pinned mesh-flow story showing offline node, LoRa hop, gateway phone, backend ingest, heatmap visibility.
- Action: final split CTA for public heatmap, public history lookup, and admin login.

Hero math:

- Landing H1 uses `max-w-6xl` and `clamp(3rem, 6vw, 6rem)` so the headline stays at 2-3 lines on desktop.
- No fake stamps, spam tags, decorative badges, arbitrary stats, or text-filled pills in the hero.
- Primary CTA uses command blue with white text; secondary CTA uses white/mist with dark text and visible border.

Bento density:

- Landing preview grid: 12 columns, two rows.
- Row one: `span 7 + span 5 = 12`.
- Row two: `span 4 + span 4 + span 4 = 12`.
- Total cells filled: `24 / 24`; use `grid-flow-dense`.
- Admin overview grid: row one `span 8 + span 4 = 12`; row two `span 3 + span 3 + span 6 = 12`; total `24 / 24`.

Label and contrast sweep:

- Banned cheap labels: "SECTION 01", "QUESTION 05", "ABOUT US".
- No emoji in UI copy, code, comments, or alt text.
- No purple-blue gradients, neon glows, pure black, one-note blue surfaces, or nested cards.

## 3. Product and Flow Analysis

### 3.1 Users

Public users:

- View public heatmaps without login.
- Switch safe public map modes.
- Use marker-only mode.
- Search message history by full name and birth date.
- See message history only after a valid full-name and birth-date match.
- Never mutate data.
- Never receive specific lookup failure reasons.

Admins:

- Log in and maintain a backend session.
- Register nodes with node ID, owner full name, and owner birth date.
- View all registered nodes.
- Search node ID and owner name.
- View admin heatmaps, markers, node details, and message history.
- Inspect message metadata: sender node, seqId, message value, timestamp, source, sender range, last forwarder range, received backend time, and location.

Mobile node owners and ESP32 nodes are not web users, but the web UI must explain and reflect their behavior:

- Mobile app sends safe status and compressed canonical messages through BLE.
- ESP32 nodes forward LoRa DATA only down the range-to-gateway gradient.
- Mobile apps burst backlog directly to the backend when internet returns.
- Backend deduplicates by `senderNodeId + ":" + seqId`.

### 3.2 Web Jobs

The web frontend must:

- Present LOOM credibly on the landing page.
- Route public users to live heatmap and privacy lookup.
- Route admins to login and protected operations.
- Render Google Maps heatmap, marker, map type, and marker-only controls.
- Preserve public lookup privacy.
- Provide reusable app components for buttons, forms, tables, drawers, dialogs, tabs, segmented controls, map toolbars, skeletons, empty states, and errors.
- Consume backend APIs and shared contracts only; never read MongoDB directly.

## 4. Visual System

### 4.1 Palette

The palette is light, professional, and more dimensional than white plus blue. Blue is the command/action color. Teal describes mesh and gateway health. Green describes safe/success. Amber describes stale or partial state. Coral describes danger and failure. Sand and mist make the landing page warmer without sacrificing operational clarity.

| Token               | Value      | Use                                                 |
| ------------------- | ---------- | --------------------------------------------------- |
| `--background`      | `#f6f8f4`  | App background, slightly natural instead of sterile |
| `--surface`         | `#ffffff`  | Panels, drawers, forms, tables                      |
| `--surface-mist`    | `#edf5f7`  | Filters, lookup panels, quiet operational sidebars  |
| `--surface-sand`    | `#f4efe7`  | Landing story bands and human explanation sections  |
| `--surface-ink`     | `#14212b`  | Dark landing/footer panels                          |
| `--border`          | `#d4dedf`  | Hairline dividers and panel borders                 |
| `--border-strong`   | `#8fb7bf`  | Focus rings, selected controls                      |
| `--text`            | `#14212b`  | Primary text                                        |
| `--text-muted`      | `#60717c`  | Secondary text and helper copy                      |
| `--text-inverse`    | `#f7fbf8`  | Text on dark surfaces                               |
| `--command`         | `#256fae`  | Primary CTAs, selected navigation, admin actions    |
| `--command-soft`    | `#dceeff`  | Selected blue backgrounds and map overlays          |
| `--mesh`            | `#16868c`  | Gateway, route, and mesh-health indicators          |
| `--mesh-soft`       | `#d9f0ef`  | Low-emphasis mesh surfaces                          |
| `--safe`            | `#2f855a`  | Safe status and successful lookup                   |
| `--safe-soft`       | `#dff1e7`  | Low-emphasis safe surfaces                          |
| `--attention`       | `#b7791f`  | Stale data, partial sync, warnings                  |
| `--attention-soft`  | `#f5ead2`  | Low-emphasis warning surfaces                       |
| `--critical`        | `#b84a3a`  | Critical categories, errors, failed actions         |
| `--critical-soft`   | `#f7ded8`  | Low-emphasis critical surfaces                      |
| `--unknown`         | `#71717a`  | Unknown or unavailable state                        |
| `--map-land`        | `#d9e2cc`  | Optional map-adjacent terrain tint                  |
| `--map-water`       | `#b9d8e8`  | Optional map-adjacent water tint                    |
| `--shadow-tint-rgb` | `20 33 43` | Subtle slate elevation tint                         |

Rules:

- Keep the dominant read light, calm, and professional.
- Do not let blue dominate every panel. Use it sparingly for choices and commands.
- Do not mix warm and cool grays randomly; use slate for text and borders, sand only for landing storytelling.
- Heatmap severity may use Google Maps-compatible gradients, but surrounding chrome must remain consistent with this palette.
- Red/coral must mean critical or error; never use it decoratively.

### 4.2 Typography

Recommended:

- Display and UI: Geist or Satoshi.
- Numeric and technical metadata: Geist Mono or JetBrains Mono.
- Do not use Inter.
- Do not use serif fonts in admin or public operations surfaces.

Scale:

- Landing hero H1: `clamp(3rem, 6vw, 6rem)`, line-height `0.92-1.02`, `max-w-6xl`.
- Landing section headings: `clamp(2.25rem, 4.5vw, 4.75rem)`, line-height `0.98-1.08`.
- App page headings: `2rem-2.5rem`, line-height `1.1`.
- Panel titles: `1.125rem-1.375rem`.
- Body: `0.9375rem-1rem`, line-height `1.55`.
- Tables/metadata: `0.8125rem-0.875rem`, mono for numbers and IDs.

Copy rules:

- Use direct language: "Open public map", "View history", "Register node", "Inspect route".
- Avoid "Elevate", "Unleash", "Next-gen", and vague SaaS language.
- Public lookup failure copy must remain generic.

### 4.3 Shape and Material

- Default radius: `8px`.
- Form controls: `6px-8px`.
- Large landing media blocks may use `12px` only when they are not part of the core app component system.
- Use 1px borders and subtle inner highlights before shadows.
- Floating map controls and drawers may use `0 18px 40px -28px rgb(var(--shadow-tint-rgb) / 0.35)`.
- No cards inside cards.
- No decorative gradient orbs or bokeh backgrounds.
- Landing sections may use real/generated bitmap imagery or map-like media, not SVG filler illustrations.

### 4.4 Motion

Landing motion:

- Use GSAP only in isolated client sections if chosen during implementation.
- Preferred landing motion: pinned mesh-flow story, card stacking for capability cards, subtle image scale/fade, kinetic marquee for system capabilities.
- All motion must animate `transform` and `opacity`, not layout properties.
- Respect `prefers-reduced-motion`.

App motion:

- Keep admin and public operations mostly functional: hover, active, drawer open/close, tab transitions, skeleton shimmer.
- Map marker selection can animate drawer entrance and selected marker emphasis.
- Avoid scroll hijacking in admin and public operations pages.

## 5. Information Architecture

| Route                   | Access     | Purpose                                                      |
| ----------------------- | ---------- | ------------------------------------------------------------ |
| `/`                     | Public     | Landing page with product story and navigation               |
| `/public`               | Public     | Public heatmap, filters, marker-only mode, lookup entry      |
| `/public/history`       | Public     | Dedicated privacy-gated history lookup and results           |
| `/admin/login`          | Public     | Admin authentication                                         |
| `/admin`                | Admin only | Overview dashboard with map preview, status, recent messages |
| `/admin/map`            | Admin only | Full admin map, heatmap, markers, selected node drawer       |
| `/admin/nodes`          | Admin only | Registered nodes table, search, registration                 |
| `/admin/nodes/[nodeId]` | Admin only | Node detail, owner identity, location/range, message history |
| `/admin/messages`       | Admin only | Cross-node message investigation with filters and pagination |
| `/admin/settings`       | Admin only | Minimal account/session/runtime diagnostics if needed in MVP |
| `404`                   | Public     | Polished not-found page with links to landing/public/admin   |

Route rules:

- `/public` and `/public/history` require no login.
- Admin routes fetch session before rendering protected data.
- If session is missing or expired, redirect to `/admin/login`.
- Public routes never render owner birth dates, full registered-node lists, admin-only identity fields, or lookup-specific failure reasons.
- Admin pages may render owner full name, but never render owner birth date.

## 6. Navigation

### 6.1 Landing Navigation

Desktop:

- Premium floating or split nav.
- Left: LOOM wordmark.
- Middle: anchor links to `How it works`, `Public map`, `Operations`, `Privacy`.
- Right: `Open public map`, `Admin login`.

Mobile:

- Wordmark, menu icon, and full-screen or sheet menu.
- Primary actions stay visible: public map and admin login.

### 6.2 Public App Navigation

- Compact top bar with LOOM wordmark linking to `/`.
- Links: public map, history lookup, admin login.
- Map controls remain inside the map/page toolbar, not the global nav.

### 6.3 Admin Navigation

Desktop:

- Left sidebar: overview, map, nodes, messages, settings/logout.
- Top bar: page title, global search affordance, session display, logout.

Mobile/tablet:

- Sidebar collapses into a command drawer.
- Bottom sheets replace right drawers when space is narrow.

## 7. Landing Page Design

The landing page should be high-end and memorable, but it must stay concrete. It is not a generic relief-tech marketing page. It should show the actual product concept: field nodes, mesh hops, mobile gateway, backend ingest, map visibility, and privacy-gated history.

### 7.1 Landing Structure

1. Floating navigation.
2. Hero: "LOOM" as the primary first-viewport signal.
3. Live product preview bento.
4. Mesh flow story.
5. Public and admin surface split.
6. Message lifecycle / disaster workflow.
7. Privacy and trust section.
8. Operational readiness section.
9. Final CTA.
10. Footer.

### 7.2 Hero

Purpose:

- Explain LOOM in one clear sentence.
- Immediately route users to the public map or admin login.
- Establish premium visual direction.

Layout:

- Artistic asymmetry.
- Left: giant H1 with LOOM and a concrete line such as "Disaster messages that can move before the internet returns."
- H1 max width `max-w-6xl`; never more than 2-3 desktop lines.
- Right/bottom: cinematic product composite showing a map surface, route-gradient traces, node markers, and a mobile gateway state.
- Use real/generated bitmap or CSS/Canvas product media; do not use an abstract SVG hero illustration.

Actions:

- Primary: `Open public map` -> `/public`.
- Secondary: `Admin login` -> `/admin/login`.
- Tertiary text link: `View privacy lookup` -> `/public/history`.

States:

- If API health is checked on landing, show only coarse status: "Web reachable" or "Status unavailable." Do not expose readiness internals.

### 7.3 Live Product Preview Bento

Purpose:

- Preview what public users and admins will actually do.
- Use a mathematically filled grid.

Cards:

- Large map preview tile: heatmap, marker-only toggle, category filter.
- Gateway path tile: `rangeToGateway = 0` concept, shown as a visual route not raw implementation docs.
- Privacy lookup tile: full name + birth date pair, generic failure behavior.
- Admin registration tile: node ID, owner full name, birth date storage note.
- Message stream tile: canonical message values and dedup by sender node + seqId.

Design:

- 12-column grid, no empty cells.
- Cards are not nested.
- Hover physics: image/media inside tiles can scale slightly within overflow-hidden containers.

### 7.4 Mesh Flow Story

Purpose:

- Explain how LOOM works across offline field nodes and an eventual internet gateway.

Preferred interaction:

- Pinned left title, right-side vertical stack of steps.
- Steps:
  1. Mobile owner validates node ID over BLE.
  2. Safe status or compressed message is sent to ESP32.
  3. LoRa DATA broadcasts through nodes.
  4. Nodes forward only when closer to gateway.
  5. Connected phone with internet advertises `rangeToGateway = 0`.
  6. Mobile app bursts backlog to backend.
  7. Public/admin maps update.

Implementation:

- GSAP ScrollTrigger may pin this section in an isolated client component with cleanup.
- Reduced-motion fallback renders a static vertical timeline.

### 7.5 Public and Admin Surface Split

Purpose:

- Route the two main audiences without confusion.

Layout:

- Two asymmetric panels, not equal generic cards.
- Public side: heatmap, marker-only mode, privacy lookup.
- Admin side: login, node registry, full marker details, message history.

Actions:

- Public: `Explore public map` -> `/public`.
- Public history: `Lookup history` -> `/public/history`.
- Admin: `Sign in as admin` -> `/admin/login`.
- Authenticated admins may be routed from login/session to `/admin`.

### 7.6 Message Lifecycle Section

Purpose:

- Show the lifecycle from emergency message to visible heatmap.

Content:

- Mobile compose/safe status.
- BLE handoff.
- LoRa packet and route gradient.
- Direct HTTPS burst.
- Backend deduplication.
- Heatmap and history visibility.

Visual:

- Horizontal accordion or stacked cards.
- Each panel shows one stage with concrete UI/media, not generic icons alone.

### 7.7 Privacy and Trust Section

Purpose:

- Clarify public lookup boundaries and reassure users.

Must state:

- Public heatmaps do not require login.
- History lookup requires full name and birth date.
- Failed lookup responses stay generic.
- Admin-only identity fields are protected by login.
- Birth dates must never be displayed in the web UI.

### 7.8 Operational Readiness Section

Purpose:

- Make the product feel serious and deployable.

Content:

- Hosted web/API on VM monolith.
- Backend readiness and health.
- Rollbackable deployment.
- MongoDB persistent data protection.
- Google Maps fallback behavior.

Keep this concise and visual. Do not turn the landing page into deployment documentation.

### 7.9 Final CTA and Footer

CTA:

- Dark slate or deep ink background.
- Large direct title.
- Three actions: public map, public history, admin login.

Footer:

- Product links.
- Public/admin links.
- API/web domains.
- Short privacy statement.

## 8. Public Operations Pages

### 8.1 `/public` Public Heatmap

Purpose:

- Let unauthenticated users view public map conditions and begin privacy-gated history lookup.

Primary sections:

1. Public app top bar.
2. Map canvas.
3. Map toolbar.
4. Lookup panel or sheet.
5. Marker/history preview region.
6. Map fallback region.

Desktop layout:

- `grid-template-columns: minmax(0, 1fr) 380px`.
- Map canvas min height `640px`.
- Right panel contains filters and lookup.

Mobile layout:

- Map first.
- Toolbar wraps into two rows.
- Lookup opens in a bottom sheet or tab below map.

Controls:

- Message value filter: `fine`, `needs_rescue`, `medical_help`, `food_water`, `shelter_needed`, `trapped`, `danger`, `unknown`.
- Map type: roadmap, satellite, terrain, hybrid where supported.
- Marker-only toggle.
- Refresh.
- Optional date range if backend filters are wired.

Public map privacy:

- Public marker details may show node ID, status, last seen, last message, range, and location when available.
- Public markers must not expose owner full name before successful lookup unless backend explicitly returns it for public mode. Current contract makes `ownerFullName` optional; public UI must treat it as absent.
- No owner birth date anywhere.

States:

- Loading: map skeleton plus toolbar skeleton.
- Empty heatmap: show map with calm overlay, "No reports match this filter yet."
- API error: retry action and non-map lookup remains usable.
- Google Maps failure: fallback panel plus lookup/search availability.
- Partial data: markers can still render if heatmap fails, and history can still render if map fails.

### 8.2 `/public/history` Public History Lookup

Purpose:

- Focused privacy-gated message history lookup.

Primary sections:

1. Public top bar.
2. Lookup form.
3. Result history list.
4. Privacy explanation.

Form fields:

- Owner full name.
- Owner birth date.

Behavior:

- Client validates basic field shape.
- Submit to public lookup API.
- On `ok: true`, render message history.
- On `ok: false`, render one generic failure.
- Preserve field values after failure for typo correction.
- Do not autocomplete public owner names.
- Do not expose whether name or birth date was incorrect.

Results:

- Message value.
- Sender node.
- Timestamp rendered in Asia/Jakarta by default.
- Source.
- Location if present and allowed.
- Route range metadata only if useful to public users; otherwise keep technical details collapsed.

Empty success:

- "No messages have reached the network for this owner yet."

## 9. Admin Pages

### 9.1 `/admin/login`

Purpose:

- Authenticate admin users and route them into operations.

Layout:

- Split screen.
- Left: landing-style but restrained product context: map trace, mesh route, or system wordmark.
- Right: login form.

Fields:

- Username.
- Password.

States:

- Session checking.
- Submitting.
- Generic auth failure.
- Rate-limited if backend safely reports it.
- API unavailable.

Rules:

- No public data preview before authentication.
- No password visibility tricks unless accessible and implemented carefully.
- Successful login fetches session and redirects to `/admin`.

### 9.2 `/admin`

Purpose:

- Operational overview for command-center users.

Sections:

1. Admin shell.
2. Status summary.
3. Map preview.
4. Recent messages.
5. Stale nodes.
6. Latest ingest/deploy/readiness indicators if available.

Grid:

- Row one: map preview `span 8`, system status `span 4`.
- Row two: active nodes `span 3`, categories `span 3`, recent messages `span 6`.

Metrics from PRD to surface when backend supports them:

- Total registered nodes.
- Active nodes.
- Messages in time range.
- Messages by canonical value.
- Safe status count.
- Duplicate/rejected ingest counts.
- Latest ingest batch time.
- Stale nodes.
- Range-to-gateway distribution.

If an aggregate endpoint does not yet exist, use available map/nodes/messages APIs and avoid fake metrics.

### 9.3 `/admin/map`

Purpose:

- Full operational map with admin marker details and history.

Sections:

1. Full map canvas.
2. Floating toolbar.
3. Selected node drawer.
4. Drawer tabs: details, history, route metadata.

Controls:

- Message value filter.
- Time range filter.
- Map type menu.
- Marker-only toggle.
- Refresh.
- Search by node ID or owner name if backed by APIs.

Admin marker detail:

- Node ID and numeric node ID.
- Owner full name.
- Status.
- Last seen.
- Last message.
- Last known coordinates.
- Last range to gateway.

Drawer behavior:

- Desktop: right drawer never covers entire map.
- Mobile: bottom sheet with tabs.
- Closing drawer preserves map filter state.

### 9.4 `/admin/nodes`

Purpose:

- Register, search, and inspect registered nodes.

Sections:

1. Search/action bar.
2. Registered node table.
3. Register node dialog.
4. Optional selected node preview.

Search:

- Single search input that supports node ID or owner name, matching backend `search`.
- Debounced.
- Clear button.

Table columns:

- Node ID.
- Owner full name.
- Status.
- Last seen.
- Last message.
- Last range to gateway.
- Location available.
- Created/updated when useful.
- Actions: view detail, view on map.

Register node form:

- Node ID numeric, range `0..16777215`.
- Owner full name.
- Owner birth date.

Validation:

- Client mirrors obvious contract validation.
- Backend duplicate node ID appears on node ID field.
- Birth date is collected but never shown after submission.

### 9.5 `/admin/nodes/[nodeId]`

Purpose:

- Focused node detail and per-node history.

Sections:

1. Node identity header.
2. Status and latest metadata.
3. Location/range panel.
4. Message filters.
5. Message history table/list.

Visible node fields:

- Node ID.
- Owner full name.
- Status.
- Last known lat/lon when available.
- Last seen.
- Last message.
- Last range to gateway.
- Created/updated timestamps.

Never show:

- Owner birth date.
- Owner birth-date hash/encrypted value.

History:

- Filter by message value, from, to.
- Paginate with `nextCursor`.
- Show sender node, seqId, message value, source, timestamp, backend received time, route ranges, location.

### 9.6 `/admin/messages`

Purpose:

- Cross-node message investigation.

Sections:

1. Dense filter bar.
2. Cursor-paginated table.
3. Selected message drawer.

Filters:

- Node ID.
- Owner name.
- Message value.
- From.
- To.

Table columns:

- Message value.
- Sender node.
- SeqId.
- Source.
- Timestamp.
- Backend received time.
- Sender range.
- Last forwarder range.
- Location.

Drawer:

- Full message metadata.
- Related node link.
- Map link when location exists.

### 9.7 `/admin/settings`

MVP minimal page, only if needed:

- Current admin session.
- API base URL display.
- Health/readiness coarse check.
- Logout.

Do not expose secrets, runtime env values, MongoDB internals, or API keys.

## 10. Component System

### 10.1 Foundations

Layout primitives:

- `PageShell`
- `LandingShell`
- `PublicAppShell`
- `AdminShell`
- `Section`
- `Grid`
- `Stack`
- `Cluster`
- `Panel`
- `Drawer`
- `Sheet`

Rules:

- Use CSS grid for structural layout.
- Avoid complex flex percentage math.
- No nested cards.
- Stable dimensions for icon buttons, segmented controls, tables, counters, map toolbars.

### 10.2 Controls

Buttons:

- Variants: `command`, `secondary`, `ghost`, `mesh`, `danger`, `mapControl`.
- Sizes: `sm`, `md`, `lg`, `icon`.
- States: hover, focus, active, disabled, loading.
- Icon buttons require tooltip and `aria-label`.

Inputs:

- Text input.
- Password input.
- Date input.
- Numeric node ID input.
- Search input.
- Select/menu.
- Optional textarea for future admin notes only if a backend field exists.

Forms:

- Label above input.
- Helper text below label or input.
- Error below field.
- Submit area with loading and retry state.

### 10.3 Data Components

- `DataTable`
- `MessageHistoryTable`
- `MessageList`
- `NodeStatusBadge`
- `MessageValueBadge`
- `RouteRangePill`
- `Timestamp`
- `LocationCell`
- `PaginationControls`
- `MetadataGrid`

Message value labels:

| Contract value   | UI label       | Color role |
| ---------------- | -------------- | ---------- |
| `fine`           | Safe           | safe       |
| `needs_rescue`   | Needs rescue   | critical   |
| `medical_help`   | Medical help   | critical   |
| `food_water`     | Food or water  | attention  |
| `shelter_needed` | Shelter needed | attention  |
| `trapped`        | Trapped        | critical   |
| `danger`         | Danger         | critical   |
| `unknown`        | Unknown        | unknown    |

Node status labels:

| Contract value | UI label   | Color role |
| -------------- | ---------- | ---------- |
| `registered`   | Registered | command    |
| `active`       | Active     | mesh       |
| `inactive`     | Inactive   | attention  |
| `unknown`      | Unknown    | unknown    |

### 10.4 Map Components

Provider boundary:

- `MapProviderLoader`
- `MapShell`
- `HeatmapLayer`
- `MarkerLayer`
- `MapToolbar`
- `MapTypeMenu`
- `MessageValueFilter`
- `MarkerModeToggle`
- `NodeDetailDrawer`
- `MapFallback`

Requirements:

- Google Maps API details stay inside map components.
- Screens pass contract-shaped heatmap points and marker objects.
- Public and admin map modes share components but not data permissions.
- Map provider failure keeps lookup/history/search usable.

### 10.5 Feedback Components

- `Skeleton`
- `MapSkeleton`
- `TableSkeleton`
- `InlineAlert`
- `Toast`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`
- `LoadingOverlay`

Empty states:

- Public heatmap: no reports match filter.
- Public history: no messages reached network for matched owner.
- Admin nodes: no registered nodes yet, with register action.
- Admin messages: no messages match filters.
- Admin map: no markers with location.

Error states:

- Public lookup generic failure.
- Admin auth failure.
- API unavailable.
- Session expired.
- Google Maps failed.
- Partial data fetch failure.

## 11. Data and API Integration

Frontend API client:

- Uses `NEXT_PUBLIC_API_BASE_URL`.
- Groups helpers by domain: auth, publicLookup, map, nodes, messages.
- Sends credentials for admin session endpoints.
- Validates responses with `packages/contracts` schemas where practical.
- Never talks directly to MongoDB.

Known contract surfaces:

- Web route manifest: `GET /api/web/routes` returns canonical landing, public, admin, and API paths.
- Auth: `adminLoginRequestSchema`, `adminSessionResponseSchema`, `adminLoginResponseSchema`, `adminLogoutResponseSchema`.
- Nodes: `registerNodeRequestSchema`, `registeredNodeSchema`, `nodeListQuerySchema`, `nodeListResponseSchema`.
- Map: `heatmapQuerySchema`, `heatmapResponseSchema`, `markerResponseSchema`.
- Messages: `messageHistoryQuerySchema`, `messageHistoryResponseSchema`.
- Public lookup: `publicHistoryLookupRequestSchema`, `publicHistoryLookupResponseSchema`.
- Ingest shape informs UI copy and metadata, but web does not upload mobile bursts in Phase 4.

Date/time:

- Exchange ISO strings.
- Display in Asia/Jakarta by default.
- Use short relative time plus exact tooltip when helpful.

Pagination:

- Use `nextCursor`.
- Prefer "Load more" over infinite scroll for MVP.

Caching:

- Map and history requests should support background refetching.
- Do not blank the map on filter changes; use an overlay or subtle loading state.

## 12. Required User Flows

Landing to public map:

1. User opens `/`.
2. User reads hero and chooses `Open public map`.
3. App navigates to `/public`.
4. Public heatmap loads without login.

Landing to admin:

1. Admin opens `/`.
2. Admin chooses `Admin login`.
3. App navigates to `/admin/login`.
4. Admin signs in.
5. App redirects to `/admin`.

Public heatmap:

1. User opens `/public`.
2. Heatmap and public markers load.
3. User filters by message value.
4. User switches map type or marker-only mode.
5. UI updates without exposing private identity.

Public history lookup:

1. User opens `/public/history` or lookup panel from `/public`.
2. User enters full name and birth date.
3. Backend validates pair.
4. Success shows messages.
5. Failure shows generic error only.

Admin registers node:

1. Admin logs in.
2. Admin opens `/admin/nodes`.
3. Admin opens register node dialog.
4. Admin enters node ID, owner full name, birth date.
5. Backend validates and stores.
6. Table refreshes.

Admin investigates marker:

1. Admin opens `/admin/map`.
2. Admin filters heatmap and markers.
3. Admin selects marker.
4. Drawer shows node metadata.
5. Admin opens history tab.
6. Admin follows link to node detail if needed.

Admin searches messages:

1. Admin opens `/admin/messages`.
2. Admin filters by node ID, owner name, message value, or time.
3. Table updates.
4. Admin opens selected message drawer.

## 13. Accessibility

Requirements:

- All controls have visible focus states.
- Icon-only buttons have `aria-label` and tooltip.
- Dialogs, drawers, and sheets trap focus.
- Escape closes overlays.
- Forms connect labels, helper text, and errors to controls.
- Tables use semantic table markup.
- Color is never the only status indicator.
- Minimum touch target is `44px`.
- Motion respects `prefers-reduced-motion`.
- Landing media has descriptive alt text or is marked decorative when appropriate.

Map accessibility:

- Admin marker data must also be available as table/list data.
- Public lookup remains fully usable without map interaction.
- Map fallback provides direct navigation to history lookup.

## 14. Responsiveness

Breakpoints:

- Mobile: `< 768px`.
- Tablet: `768px-1023px`.
- Desktop: `1024px+`.
- Wide operations display: `1440px+`.

Rules:

- Landing hero becomes single column on mobile.
- Landing bento becomes one column on mobile and preserves reading order.
- Public map controls wrap without overlapping map content.
- Admin sidebar becomes drawer navigation below desktop.
- Right drawers become bottom sheets on mobile.
- Tables scroll inside their region, not the page body.
- Use `min-h-[100dvh]` for full-height sections, never `h-screen`.
- Wrap animated pages in `overflow-x-hidden w-full max-w-full`.

## 15. Testing and QA

Automated tests should cover:

- Landing renders hero, public/admin CTAs, public link, admin link.
- Landing CTAs route to `/public`, `/public/history`, and `/admin/login`.
- Public heatmap loads without login.
- Public message filter changes heatmap request params.
- Public map type switch and marker-only toggle update UI state.
- Public lookup success renders history.
- Public lookup failure renders the generic error.
- Admin login success redirects to `/admin`.
- Admin route without session redirects to `/admin/login`.
- Admin node registration validates fields and handles duplicate node ID.
- Admin node search sends expected query.
- Admin marker selection opens drawer.
- Admin message filters request expected params.
- Google Maps failure renders fallback and keeps lookup/search usable.
- Mobile viewport has no overlapping toolbar, drawer, or form text.

Visual QA:

- Landing feels polished and product-specific, not generic SaaS.
- H1 is never a narrow 6-line wall.
- Public and admin pages feel like professional tools.
- Palette uses command blue, mesh teal, safe green, amber, coral, mist, sand, and slate intentionally.
- No text overflows inside buttons, panels, cards, or table cells.
- No nested cards.
- No emoji, fake badges, cheap meta-labels, neon glow, pure black, or purple-blue gradient defaults.
- Loading, empty, error, success, disabled, hover, focus, and active states exist for important controls.

## 16. Phase 4 Implementation Notes

Scaffold:

- Add `apps/web/package.json` only when the real Next.js app is scaffolded.
- Add `apps/web` to root npm workspaces in the same implementation change.
- Prefer Next.js App Router with TypeScript.
- Check package versions before importing Tailwind, icons, maps, animation, or query libraries.

Recommended implementation boundaries:

- Server components for static shells and landing content where possible.
- Client leaf components for interactive maps, drawers, dialogs, forms, session providers, and GSAP sections.
- Isolate Google Maps provider code.
- Isolate landing GSAP/scroll effects from admin/public app component trees.
- Do not mix GSAP and Framer Motion in the same component tree.

Suggested dependencies to evaluate:

- Next.js and React.
- Tailwind CSS.
- One icon library: `@phosphor-icons/react` or `@radix-ui/react-icons`.
- Google Maps wrapper or thin custom loader.
- Query/cache library only if it reduces duplicated loading/error/refetch code.
- GSAP only for isolated landing storytelling sections.

Do not implement:

- Public account system.
- Public node registration.
- Frontend-only privacy decisions.
- Direct database reads.
- Owner birth-date display.
- Mobile burst upload from web.
- Fake metrics not backed by API or fixtures clearly marked as mock.

## 17. Durable Rules

These must not be silently changed:

- Public lookup failure remains generic.
- Public heatmap remains unauthenticated.
- Admin owner identity is visible only after authenticated session.
- Owner birth date is collected for registration and lookup validation but never displayed.
- Google Maps provider remains isolated behind map components.
- Frontend consumes backend APIs and shared contracts only.
- Backend remains the policy source for privacy, auth, validation, and deduplication.
- Landing page can explain the system, but public operational access must remain one click away.
