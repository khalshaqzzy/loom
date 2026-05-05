# 0012 Docker-Free Hosted E2E Harness

Status: Accepted
Date: 2026-05-05
Scope: hosted API/web end-to-end tests

## Context

LOOM needs browser-level coverage for the integrated hosted API and web behavior before CI/CD and
VM deployment automation become release gates. The tests must be runnable locally and in CI without
requiring Docker, while still using real API, web, and MongoDB processes.

## Decision

Add `apps/e2e` as a real npm workspace using Playwright. The e2e global setup starts an ephemeral
`MongoMemoryReplSet`, the built API server on a dynamic local port, and the Next.js web app in dev
mode on a dynamic local port. The web process receives `NEXT_PUBLIC_API_BASE_URL` at startup, and
Google Maps is intentionally left unconfigured so tests exercise the deterministic fallback map.

Seed data flows through real backend APIs: admin login, node registration, burst ingest, public
lookup, and admin reads. The suite covers public map/history, admin registry/map/history, and ingest
deduplication behavior end to end.

## Rationale

Docker-free e2e keeps the local and CI feedback loop available on machines that do not have Docker
running. Using real processes catches contract and cookie/CORS integration issues that component
tests cannot see. Starting the web app in dev mode is required because the API URL is a browser
environment value and must be dynamic for isolated e2e ports.

## Consequences

`npm run e2e` now builds API and web first, installs Playwright Chromium, and runs the e2e suite.
The e2e suite is not a substitute for Docker Compose validation; Phase 7 CI also validates Compose
config and image builds. The fallback map must keep marker selection testable without a Google Maps
API key.

## Verification

The accepted gate is:

- `npm run e2e`
- root lint, typecheck, tests, build, and formatting checks
