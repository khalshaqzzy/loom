# ADR 0015: Firmware Node Runtime Contract

Status: Accepted
Date: 2026-05-15
Scope: ESP32 node firmware

## Context

The node sketch needed to move from prototype behavior to the firmware runtime described by the product requirements. This session was scoped to firmware only.

## Decision

The node firmware now owns packet encoding, route state, deduplication, pending storage, backlog handoff, phone validation, internet-path state, and Serial Monitor observability inside `firmware/loom-node`.

The gateway sketch, mobile app, backend, shared packages, fixtures, and tests are intentionally outside this decision.

## Consequences

Mobile and shared contracts still need a later alignment pass before the full edge flow is complete. Firmware build verification also needs an environment with PlatformIO available.
