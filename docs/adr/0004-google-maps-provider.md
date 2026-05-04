# 0004 Google Maps Provider

Status: Accepted  
Date: 2026-05-04  
Scope: public and admin web map rendering

## Context

The PRD requires public and admin heatmaps, marker views, map type switching, and a fallback when the
map provider fails.

## Decision

Use Google Maps API for the MVP web map provider. Keep provider code isolated behind web map
components so application screens consume LOOM map data rather than Google-specific details.
Render heatmap-style intensity with weighted Google circle overlays instead of the deprecated Google
Maps Heatmap Layer.

## Rationale

Google Maps satisfies heatmap, marker, and map type needs without building custom geospatial
rendering during MVP. Circle overlays keep the MVP off the Maps JavaScript Heatmap Layer, which is
deprecated and scheduled for removal after May 2026.

## Consequences

The hosted runtime must manage a Google Maps API key and quota/billing risk. Public and admin
fallback states must preserve non-map lookup/history workflows when maps fail to load. Future work
can replace the circle overlay with a dedicated supported heatmap renderer if visual fidelity becomes
more important than the current MVP dependency footprint.

## Follow-up

Monitor Google Maps marker deprecation guidance and migrate to Advanced Marker APIs when the wrapper
library and MVP schedule make that practical.
