# Internals Rules

Document status: Active  
Created: 2026-03-19  
Purpose: operating rules for Codex when reading or updating the `.agent/` directory

## 1. Why This Folder Exists

The `.agent/` folder is the project memory and execution layer for LOOM.

It exists to:

- preserve product and implementation intent across sessions
- prevent re-planning work that is already decided
- keep future sessions aligned with the current repo state
- record what was completed, what is next, and where to start

If code changes materially affect roadmap, deployment, scope, or recommended next steps, `.agent/` should usually be updated in the same session.

## 2. File Roles

## 2.1 Product and design source of truth

Read these first when behavior or scope is unclear:

- `PRD.md`
  - product contract
  - business rules
  - expected user behavior

There are currently no dedicated `adminFrontendDesign.md` or `publicFrontendDesign.md` files in `.agent/`.

Until those exist, treat:

- `PRD.md`
- the latest relevant handoff file
- existing admin/public implementation in the repo
- relevant ADRs under `docs/adr/`

as the practical design-intent source of truth.

## 2.2 Execution and planning source of truth

Read these before planning or continuing implementation:

- `implementationPhases.md`
  - master roadmap
  - current repo progress snapshot
  - cross-phase sequencing
- `phaseBacklog.md`
  - condensed actionable backlog
  - next recommended items
- `environmentMatrix.md`
  - local/staging/production topology
- `deploymentGuide.md`
  - canonical deployment, provisioning, secrets, rollback, and smoke-test runbook
- `releaseExecutionChecklist.md`
  - operator checklist for live staging and production rollout windows
- `manualProvisioningChecklist.md`
  - short external provisioning checklist
- `productionReadinessChecklist.md`
  - final pre-prod and pre-main release gate

These should be updated whenever implementation changes alter roadmap status, environment assumptions, or deployment/provisioning requirements.

## 2.3 Session continuity files

Use these to resume work efficiently:

- `sessionHandoff-YYYY-MM-DD.md`
  - high-signal snapshot of what the last major session completed
  - verification run
  - repo facts and next recommended start
  - the canonical phase-by-phase sequence for WhatsApp platform migration

If a future session creates a dedicated `phase{N}Kickoff.md`, treat it as a phase-specific starter. Until then, use the newest handoff plus the relevant roadmap doc instead of assuming a kickoff file already exists.

## 2.4 Traceability and support docs

- `phaseBacklog.md`
  - short execution inventory
- `docs/adr/`
  - accepted architecture decisions
  - frozen runtime, contract, and topology choices future sessions should not silently re-decide

If a dedicated requirement traceability matrix is added later, treat it as the first stop for PRD-to-code coverage checks. Until then, use `PRD.md`, `implementationPhases.md`, `phaseBacklog.md`, and the relevant ADRs together for traceability.

Update these when requirement-to-implementation mapping changes or when the recommended next work changes materially.

## 2.5 Architecture decision records

Use `docs/adr/` when a session makes or materially changes a long-lived technical decision.

Typical ADR-worthy changes include:

- contract shape changes that affect multiple apps or future work
- runtime topology decisions such as workers, queues, storage, or provider boundaries
- deployment or operational architecture decisions that future sessions must preserve
- an implementation choice that intentionally narrows future options

ADR files should:

- use the next sequential `000N-...` filename
- state status, date, and decision scope near the top
- separate context, decision, rationale, consequences, and follow-up clearly
- describe the decision, not just the code diff
- avoid roadmap phase references such as `Phase 4` or `Phase 8`; ADRs must describe durable decisions and concrete future work, not project schedule labels

If a session changes an existing accepted architecture decision, update the affected ADR or add a superseding ADR in the same session.

## 3. Recommended Read Order For Future Sessions

For most implementation sessions, read in this order:

1. `.agent/rules.md`
2. the newest `.agent/sessionHandoff-YYYY-MM-DD.md`
3. `.agent/implementationPhases.md`
4. `.agent/phaseBacklog.md`
5. `.agent/deploymentGuide.md` if the session touches environments, secrets, deploys, VMs
6. `.agent/releaseExecutionChecklist.md` if the session is preparing or guiding a live rollout
7. `.agent/PRD.md` if product behavior is involved
8. relevant `docs/adr/` entries when the task touches architecture, contracts, runtime behavior, or deployment shape

## 4. When To Update Existing Files

Update an existing `.agent` file when:

- a phase changes from pending to complete in repo terms
- the recommended next phase or next session start changes
- a deploy workflow, secret list, runtime path, domain, or environment assumption changes
- the canonical source-of-truth file for a topic changes
- a previous handoff is now stale for the current repo state
- roadmap status changes but the file's original purpose is still the same

Update or add an ADR when:

- a long-lived architecture decision was made during the session
- an accepted technical decision changed in a way future sessions must know
- code now implements a previously planned architecture choice and the decision should be frozen in repo memory

Examples:

- phase 4 or 5 implementation finished:
  - update `implementationPhases.md`
  - update `phaseBacklog.md`
  - update the current handoff file
- deployment env templates or GitHub secrets changed:
  - update `deploymentGuide.md`
  - update `manualProvisioningChecklist.md`
  - update `environmentMatrix.md` if topology changed
- a new worker, provider boundary, or storage lifecycle became part of the architecture:
  - add or update a `docs/adr/` entry

## 5. When To Add A New File

Add a new file in `.agent/` when:

- a new phase needs a dedicated kickoff/start document
- a major session materially changes the repo and needs a fresh handoff
- a new category of long-lived operational knowledge appears and does not fit an existing file cleanly
- a new canonical runbook is needed for a distinct area
- adding the content to an existing file would make that file confusing or overload its purpose

Examples:

- starting phase 7:
  - add `phase7Kickoff.md`
- after a large session that changes the recommended next start:
  - add a new dated `sessionHandoff-YYYY-MM-DD.md`
- if observability or security hardening gets large enough:
  - add a focused runbook instead of overloading `deploymentGuide.md`

## 6. When Not To Add A New File

Do not add a new file when:

- the information is only a minor status update to an existing roadmap or handoff
- the content belongs naturally in `deploymentGuide.md`, `implementationPhases.md`, or `phaseBacklog.md`
- the new file would duplicate information already documented elsewhere
- the change is temporary scratch work that will not help future sessions

Default to updating an existing file unless there is a clear reason to split.

## 7. Naming Rules

Use these patterns:

- `sessionHandoff-YYYY-MM-DD.md`
- `phase{N}Kickoff.md`
- descriptive long-lived docs in `camelCase.md` only when they represent a stable concept already used in this folder
- ADRs in `docs/adr/` should use `000N-kebab-case-title.md`

New files should have:

- a one-line purpose near the top
- document status
- creation date
- enough context for a future session to use the file without rereading unrelated files first

## 8. Commit Message Rules

Use a conventional prefix for new commit messages. The subject must start with a lowercase type followed by a colon and a space.

Preferred types:

- `feat:` for user-visible features or new capabilities
- `fix:` for bug fixes, regressions, security fixes, and broken behavior
- `chore:` for maintenance, dependency updates, tooling, repo hygiene, or generated updates
- `docs:` for documentation-only changes
- `test:` for test-only changes
- `refactor:` for behavior-preserving code restructuring
- `perf:` for performance improvements
- `ci:` for GitHub Actions, deploy pipeline, and automation changes
- `build:` for build system, packaging, Dockerfile, or artifact changes

Subject rules:

- write in imperative mood, for example `fix: sort dashboard customers by earned points`
- keep the subject concise and specific, ideally 72 characters or fewer
- do not end the subject with a period
- use a body when the reason, migration impact, or operational caveat is not obvious from the subject
- prefer one logical change per commit; split unrelated runtime, docs, and deployment changes when practical

If a change spans multiple categories, choose the prefix that best describes the user-visible or operational effect. For example, a code change with tests should usually be `feat:` or `fix:`, not `test:`.

## 9. Content Rules

When updating or adding files in `.agent/`:

- write for future Codex sessions, not for marketing or external users
- optimize for high-signal continuity
- keep absolute product facts and current repo facts separate
- state whether something is complete in repo terms or still requires external provisioning
- call out frozen decisions that must not be re-decided
- note important caveats that can save a future session from bad assumptions

When updating or adding ADRs:

- explain the durable technical decision and why it was chosen
- capture tradeoffs and operational caveats, not just happy-path outcomes
- note follow-up work if the decision intentionally defers later improvements

## 10. Required Updates After Major Sessions

After a major implementation or deployment-prep session, usually do all of the following:

1. update `implementationPhases.md`
2. update `phaseBacklog.md`
3. update the current handoff file or create a new dated handoff
4. update any affected environment/deployment docs
5. add the next phase kickoff file if the next session start is now clear
6. add or update a `docs/adr/` entry if the session introduced or changed a durable architecture decision

If future sessions make these stale, update them before ending the session.
