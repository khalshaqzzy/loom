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

## Rationale

Google Maps satisfies heatmap, marker, and map type needs without building custom geospatial
rendering during MVP.

## Consequences

The hosted runtime must manage a Google Maps API key and quota/billing risk. Public and admin
fallback states must preserve non-map lookup/history workflows when maps fail to load.

## Follow-up

The web frontend must implement the actual Google Maps integration behind reusable map components.
