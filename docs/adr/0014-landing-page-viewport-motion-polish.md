# 0014 Landing Page Viewport Motion Polish

Status: Accepted
Date: 2026-05-08
Scope: root web landing page layout, responsive behavior, visual cropping, and motion

## Context

The root web route `/` is LOOM's public entry point and uses asset-led sections based on fixed
1672x941 reference designs. The page needed to behave as a polished landing experience on 16:10
displays, avoid partial adjacent-section peeking, preserve full-bleed image coverage on image-led
sections, and improve visual details without changing the public/admin route model.

This decision covers the landing-page visual work spread across two commits:

- `35db01d fix: refine landing page visual layout`
- the follow-up landing-page motion/footer/documentation commit from 2026-05-08

## Decision

Keep the root landing page as an asset-led, full-viewport scroll experience. Each `.landing-stage`
occupies one viewport slice using dynamic viewport height and scroll snapping inside the landing
page scroller. Hero and final CTA image layers use full-viewport cover behavior so no side gaps
appear on 16:10 screens.

Use the existing GSAP dependency and `LandingMotion` client component for polished motion. The
server-rendered page remains responsible for static structure and content, while the client motion
shell handles hero entrance, section reveals, card/media reveals, image-scale scroll polish, and
hover physics. Section 3 mesh-step cards are intentionally excluded from per-card scroll reveal
because scroll snapping can otherwise leave the seventh card hidden during snap timing; those cards
retain hover motion only.

Tune section-specific visual crops and spacing in CSS rather than changing image assets. This keeps
the reference image set stable while allowing individual cards and visual tiles to show the intended
parts of the product screenshots.

## Rationale

Dynamic viewport sections make the reference-driven landing page predictable on 16:10 screens while
still allowing targeted responsive overrides for narrower viewports. Keeping motion in one client
component preserves Next.js server-component boundaries and avoids spreading browser-only code
through the route implementation.

GSAP is already part of the web workspace, so the motion enhancement does not introduce another
animation dependency. Excluding section 3 cards from scroll reveal is a narrow stability choice:
the mesh section is dense, card 7 sits near the viewport bottom, and snap scrolling can produce
edge-trigger states that are more noticeable than in less dense sections.

## Consequences

The landing page now depends on the internal `.landing-page` scroller for ScrollTrigger behavior.
Future landing sections should either use the same scroller-aware motion setup or remain static.
Motion changes must continue to respect `prefers-reduced-motion`.

Responsive landing behavior is mostly managed through CSS overrides rather than alternate markup.
This keeps the component tree simple but means future visual edits should be checked at desktop and
mobile viewport sizes with Playwright before completion.

## Follow-up

If additional landing sections are added, verify that section-level scroll snapping, GSAP triggers,
and hover transforms do not compete for the same element transforms. Consider expanding visual
regression coverage for the root landing page once the design stabilizes.
