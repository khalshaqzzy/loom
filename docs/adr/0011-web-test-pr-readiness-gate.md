# 0011 Web Test PR Readiness Gate

Status: Accepted
Date: 2026-05-05
Scope: Next.js web tests, repository formatting gate, PR readiness verification

## Context

The web frontend polish and motion pass changed markup and accessible labels across admin and public
surfaces. The production app still passed lint, typecheck, and build, but several web tests were
stale because they asserted implementation-sensitive text structure or ambiguous labels.

The most visible issues were:

- password field tests matched both the password input and the password visibility button;
- node registration tests queried `Node ID` globally after the dialog opened, colliding with other
  page controls;
- public map tests asserted combined text that is now split by styled child elements;
- admin messages tests expected the old empty-state sentence as the primary rendered text.

`npm run format:check` was also failing across previously committed source and documentation files,
so PR readiness required a repository-wide Prettier pass.

## Decision

Keep the polished production UI unchanged and update tests to query stable user-facing semantics.

Web tests should prefer:

- input-specific label queries when adjacent buttons share similar accessible names;
- scoped `within(...)` queries for dialog or form interactions;
- text-content assertions for intentionally composed visual labels and values;
- current empty-state titles plus generic guidance text rather than stale copy fragments.

`npm run format:check` is part of the PR readiness gate for this branch, alongside lint,
typecheck, tests, and build.

## Rationale

The failing tests were not identifying product regressions. They were tied to pre-polish DOM
structure and old copy. Updating the tests keeps coverage focused on real behavior: login submits the
right credentials, node registration sends the expected contract payload, public map counts render,
and empty states remain visible.

Using Testing Library queries scoped to the relevant form or visible text keeps the tests closer to
how users interact with the UI while avoiding brittle assumptions about icon buttons, wrappers, and
animated layout markup.

Running Prettier across the repo creates a clean formatting baseline so future PRs do not inherit a
known failing gate.

## Consequences

Future web UI polish should update tests in the same change when accessible labels, empty-state copy,
or visual text composition changes.

Tests should not force production UI rollbacks when the UI remains accessible and the failure is only
query ambiguity or stale text. If a test reveals a genuine accessibility gap, fix the component
instead of weakening the test.

Formatter changes in this branch are intentionally included because the repository-level formatting
gate is now clean.

## Verification

Verified after the test refactor and formatting pass with:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

## Follow-up

Phase 6 should still add hosted web/API e2e coverage for public map/filter/lookup, admin
login/node registration/search/map marker/history, and ingest-to-map/history updates.
