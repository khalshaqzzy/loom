# 0010 Web Frontend Design Polish and Motion System

Status: Accepted
Date: 2026-05-04
Scope: Next.js web frontend CSS, component system, admin/public page visual quality

## Context

Phase 4-5 produced a functional web frontend with working pages, API integration, and a polished
landing page. However, the non-landing pages (public map, public history, admin login, admin
dashboard, admin map, admin nodes, admin messages, admin settings, 404) were visually flat:
uniform white panels, no motion, generic skeletons, plain tables, and minimal visual hierarchy.

The frontend design guide (`frontendDesign.md`) specifies a premium, operational aesthetic. The
existing implementation met functional requirements but lacked the visual polish, motion, and
component refinement needed to feel production-grade.

Key gaps identified:

- No CSS animation utilities for staggered reveals, shimmer loaders, or tactile feedback
- `ui.tsx` primitives lacked loading states, empty states, status indicators, and refined styling
- Admin sidebar was visually flat with no active indicators or glassmorphism
- Tables had no row entrance animations or hover effects
- Dialogs/modals had no backdrop blur or slide-up entrance
- Map controls lacked glassmorphism treatment
- Metric cards had no count-up animation
- Skeleton loaders used a basic pulse instead of a shimmer gradient
- No consistent motion language across admin and public surfaces

## Decision

Adopt a CSS-only motion system for all app pages (admin and public), keeping GSAP isolated in the
landing page. The motion baseline targets subtle, professional transitions (200-300ms) with
staggered list reveals, shimmer loading states, and tactile button feedback.

### CSS Foundation (`globals.css`)

Add animation keyframes and utility classes:

- `shimmer` - gradient sweep for skeleton loaders
- `fade-up` - entrance animation for panels and cards (12px translateY + opacity)
- `fade-in` - simple opacity entrance
- `slide-up` - modal/dialog entrance (24px translateY + scale)
- `scale-in` - scale entrance for overlays
- `breathe` - infinite pulse for live status dots
- `stagger-item` - CSS `animation-delay` based on `--stagger-index` custom property
- `tactile-press` - `active:scale(0.98)` for button feedback
- `glass-panel` / `glass-panel-strong` - backdrop-blur + inner border + tinted shadow
- `hover-lift` - translateY(-2px) on hover with shadow expansion

All animations respect `prefers-reduced-motion` via a comprehensive media query override.

### Component System (`ui.tsx`)

Extend the shared component library:

- `Button` - add `loading` prop with spinner, tactile press, refined shadows
- `Panel` - accept `style` prop for animation delays, refined shadow treatment
- `Skeleton` - use shimmer gradient instead of basic pulse
- `Badge` - add optional `dot` indicator for status badges
- `Field` - add `hint` prop, warning icon on errors, refined focus/hover states
- `StatusDot` - breathing pulse indicator for live/active states
- `InlineAlert` - add icon integration (Info/CheckCircle/WarningCircle/XCircle)
- `EmptyState` - composed empty state with icon, title, description, action
- `LoadingSpinner` - SVG spinner for button loading states
- `SkeletonText` - multi-line text skeleton

### Page Improvements

**Admin Shell** (`AdminShell.tsx`):
- Refined sidebar with active indicator bar, hover transitions, glassmorphism header
- Mobile drawer navigation with backdrop blur
- Loading state with spinner instead of skeleton block
- User badge with status dot

**Admin Overview** (`AdminOverviewClient.tsx`):
- Asymmetric bento grid: `2fr+1fr` row 1, `0.7fr+1.6fr` row 2
- Metric cards with count-up animation, staggered entrance, hover lift
- Node status list with staggered row entrance
- Recent messages table with staggered rows, hover highlight
- Arrow links to full pages

**Admin Login** (`AdminLoginClient.tsx`, `login/page.tsx`):
- Animated mesh-line SVG overlay on left panel
- Glassmorphism form panel with refined field styling
- Password visibility toggle
- Refined loading and error states

**Public Map** (`PublicMapClient.tsx`):
- Refined map controls with toggle button states
- Status bar with breathing live indicator
- Marker preview cards with staggered entrance
- Privacy note card
- Refresh button with rotation animation

**Public History** (`PublicHistoryLookup.tsx`, `history/page.tsx`):
- Refined lookup form with icon header
- Staggered result card entrance
- Privacy explanation panel with staggered info cards
- Empty state component integration

**Admin Map** (`AdminMapClient.tsx`):
- Refined info cards with consistent styling
- Empty state for no selection
- Staggered entrance for selected node details

**Admin Nodes** (`AdminNodesClient.tsx`):
- Staggered table row entrance
- Refined register dialog with slide-up animation, backdrop blur
- Search icon in search field
- Empty state with register CTA
- Cancel button in dialog

**Admin Node Detail** (`AdminNodeDetailClient.tsx`):
- Hero-style header with gradient wash
- Back-to-nodes navigation link
- Info cards with icon + staggered entrance
- Refined message filter and table

**Admin Messages** (`AdminMessagesClient.tsx`):
- Staggered table rows
- Empty state integration
- Refined filter bar

**Admin Settings** (`settings/page.tsx`):
- Two-column layout with diagnostics and security panels
- Staggered security info cards

**Not Found** (`not-found.tsx`):
- Animated mesh-line background
- Staggered entrance for content blocks
- Warning icon and refined typography

**Shared Components**:
- `Brand.tsx` - use Broadcast icon with breathing pulse animation
- `PublicTopBar.tsx` - glassmorphism, animated nav link underlines
- `MessageTable.tsx` - staggered row entrance, hover highlight, refined source badges

## Rationale

CSS-only motion avoids adding JavaScript bundle weight to app pages, keeps animations
GPU-accelerated via `transform` and `opacity`, and ensures `prefers-reduced-motion` compliance
through a single media query override. GSAP remains isolated in the landing page for scroll-triggered
storytelling.

The asymmetric bento grid for the admin overview breaks the generic "equal cards" pattern and creates
visual hierarchy through varied column ratios. Metric count-up animations add a premium feel without
distracting from operational use.

Glassmorphism (backdrop-blur + inner border + tinted shadow) creates visual depth for floating
elements (sidebar, header, map controls) without adding heavy shadows or nested cards.

Staggered list reveals (via CSS `--stagger-index` custom property) create sequential entrance
animations that feel intentional without requiring JavaScript orchestration.

## Consequences

All app page animations are CSS-only. Future motion work on admin/public pages should continue using
CSS transitions and keyframes, not GSAP or Framer Motion. GSAP is reserved for landing-page
scroll-triggered storytelling only.

The `Panel` component now accepts a `style` prop. Any consumer passing `style` must use it only for
animation delays (`animationDelay`) to maintain consistency with the stagger system.

The `EmptyState` and `StatusDot` components are now part of the shared UI library. All admin and
public pages should use these instead of inline empty/error markup.

The shimmer gradient on skeletons replaces the basic Tailwind `animate-pulse`. This creates a more
premium loading feel but is visually different from the default Tailwind skeleton pattern.

## Verification

Verified with:

- `npm run lint` - passes clean
- `npm run typecheck` - passes clean (contracts, test-fixtures, api, web)
- Visual review of all modified pages against the design guide

## Follow-up

Future polish work could include:

- Table column sorting with animated row reordering
- Drawer/sheet components for mobile admin detail views
- Toast notification system for admin actions
- Map marker clustering for high-density node deployments
- Advanced Marker API migration when the Google Maps wrapper supports it
