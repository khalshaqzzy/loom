# 0006 Active Workspaces and Placeholder Directories

Status: Accepted  
Date: 2026-05-04  
Scope: repository scaffold and npm workspace boundaries

## Context

The repository includes the full LOOM directory shape before all apps and runtimes are implemented.
Some directories are real packages today, while others exist only to reserve the future project
layout.

## Decision

Only directories with runnable or buildable code are npm workspaces. The active workspaces are:

- `apps/api`
- `packages/contracts`
- `packages/test-fixtures`

Future-only directories use `README.md` placeholders instead of placeholder `package.json` files:

- `apps/web`
- `apps/mobile`
- `packages/decision-tree`
- `firmware/loom-node`

## Rationale

This keeps root `npm` commands honest. A package manifest means a package exists and has meaningful
scripts, dependencies, and ownership. README placeholders preserve the planned layout without
creating fake packages that can hide missing implementation.

## Consequences

When frontend, mobile, decision-tree, or firmware implementation begins, the implementing session
must add the real package or firmware manifest in the same change that adds runnable code. Root
workspace entries and scripts must be updated only for newly active packages.

## Follow-up

Add `apps/web/package.json` only when the Next.js app is scaffolded.
