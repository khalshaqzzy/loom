# 0008 Next.js Web Workspace and Asset-Led Landing

Status: Accepted  
Date: 2026-05-04  
Scope: web frontend runtime, route ownership, landing implementation, and asset handling

## Context

The backend exposes stable APIs for public map data, public privacy lookup, admin sessions, node registration, messages, and the web route manifest. The repository previously kept `apps/web` as a placeholder, but the product now needs the real public and admin web surfaces described by the route model.

The landing page has a section-by-section visual reference set and raw visual assets under `apps/web/public/assets`. Those references are implementation guidance, not runtime assets.

## Decision

Promote `apps/web` to an active npm workspace using Next.js, React, TypeScript, Tailwind CSS, Phosphor icons, GSAP, and Vitest.

Implement the frontend route ownership as:

- `/` for the public landing page.
- `/public` for the unauthenticated heatmap and marker surface.
- `/public/history` for the privacy-gated public lookup flow.
- `/admin/login` for admin authentication.
- `/admin/**` for admin operational views.

Implement the landing page from code and raw assets in `apps/web/public/assets`, not by embedding or copying `.agent/designImages` section reference images into the runtime. Generated Next output and local screenshot output are ignored and must not be committed.

## Rationale

Making `apps/web` a real workspace lets the root verification commands cover the hosted web runtime alongside the API and shared packages. Keeping visual reference images out of the web runtime preserves a clean separation between design inputs and shippable assets.

Using raw assets plus HTML/CSS for the landing keeps links, headings, and responsive behavior inspectable and maintainable while still allowing the page to follow the provided visual direction closely.

## Consequences

Root install, lint, typecheck, test, and build now include the web workspace. Future changes to hosted runtime must account for both API and web builds.

The `.agent/designImages` folder remains a local design input only. If new design references are added in future sessions, they should be treated as source material for implementation, not served directly from the web app.

## Follow-up

The next integration pass should connect public and admin web flows to a running backend environment, then add broader frontend/backend e2e coverage for map filters, lookup outcomes, admin login, node registration, marker selection, and message history.
