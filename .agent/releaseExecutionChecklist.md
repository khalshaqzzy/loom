# LOOM Release Execution Checklist

Document status: Active
Created: 2026-05-05
Purpose: operator checklist for production hosted runtime releases

## Before Merge To Main

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`
- Compose config/build passes when Docker is available.

## Before First Automatic Deploy

- VM bootstrap completed.
- GitHub production secrets configured.
- DNS points to the VM.
- `PRODUCTION_VM_SSH_KNOWN_HOSTS` pinned from `ssh-keyscan -H`.

## During Deploy

- Confirm `CI` succeeds on `main`.
- Confirm `Deploy Production` starts from the successful CI workflow run.
- Confirm release SHA in logs matches intended commit.
- Confirm VM preflight passes before Compose deploy starts.
- Confirm smoke checks pass for:
  - `https://api.loomnetwork.site/health`
  - `https://api.loomnetwork.site/ready`
  - `https://loomnetwork.site`

## After Deploy

- Confirm `/ready` returns `status=ready`, `mongo=true`, and `indexes=true`.
- Confirm web loads at `https://loomnetwork.site`.
- Confirm admin login works with bootstrap credentials or current admin credentials.
- Confirm public map renders with Google Maps or fallback state.

## Rollback

- Automatic rollback runs when post-deploy validation fails and a previous release exists.
- Manual rollback can use `deploy/scripts/remote-rollback.sh` with a known-good SHA.
- Rollback does not mutate or restore MongoDB data.
- First deploy has no previous release, so failed first deploys require diagnosis and a rerun rather
  than automatic rollback.
