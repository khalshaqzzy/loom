# 0001 VM Monolith Runtime

Status: Accepted  
Date: 2026-05-04  
Scope: hosted backend, web, database, and reverse proxy runtime

## Context

LOOM needs a deployable MVP that emergency-response operators can run without managing a
distributed platform. The PRD fixes the hosted topology to one VM running the API, web frontend,
MongoDB, and Caddy.

## Decision

Use a single VM monolith managed by Docker Compose. Caddy terminates TLS and routes public domains
to the internal API and web services. MongoDB stays private on the internal Compose network and
persists data under `/opt/loom/hosted/shared/mongo-data`.

## Rationale

This keeps the operational model small, supports source-archive deploys without an image registry,
and gives rollback a simple release-directory switch. It also preserves a clean boundary: hosted
clients only talk to the backend API, never directly to MongoDB.

## Consequences

The VM is a shared failure domain for API, web, MongoDB, and Caddy. Deployment scripts must never
delete shared data, and readiness checks must fail when MongoDB is unavailable.

## Follow-up

Docker Compose, Caddy, deploy, rollback, and CI/CD workflows still need to be added before hosted
runtime rollout.
