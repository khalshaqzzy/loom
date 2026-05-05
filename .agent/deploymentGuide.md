# LOOM Production Deployment Guide

Document status: Active
Created: 2026-05-05
Last updated: 2026-05-05
Purpose: complete first-deploy runbook from VM access through the first automatic `main` deployment

## 1. Deployment Model

Production is a single VM monolith:

- Web: `https://loomnetwork.site`
- API: `https://api.loomnetwork.site`
- VM base directory: `/opt/loom/hosted`
- Release directories: `/opt/loom/hosted/releases/<sha>`
- Current release symlink: `/opt/loom/hosted/current`
- Current release marker: `/opt/loom/hosted/current_release`
- Shared runtime env: `/opt/loom/hosted/shared/runtime.env`
- Persistent MongoDB data: `/opt/loom/hosted/shared/mongo-data`

GitHub Actions deploys by uploading a source archive to the VM, rendering
`/opt/loom/hosted/shared/runtime.env`, running a VM preflight, running Docker Compose on the VM,
smoke-checking production, and rolling back to the previous release if post-deploy validation fails.

## 2. Prerequisites

Local workstation:

- Git repository access to LOOM.
- OpenSSH client available.
- GitHub repository admin access for configuring Actions secrets.
- Ability to create DNS records for `loomnetwork.site` and `api.loomnetwork.site`.

VM:

- Ubuntu/Debian-like Linux host.
- Public IPv4 or DNS hostname.
- Root or sudo access for the initial bootstrap.
- Ports `22`, `80`, and `443` reachable from your workstation or GitHub Actions as appropriate.

GitHub Actions:

- Production environment may be created in repository settings, but the deploy workflow also works
  if GitHub creates it when secrets are added.
- Required secrets are listed in section 8.

## 3. Generate The GitHub Actions Deploy SSH Key

Generate a dedicated key pair for GitHub Actions. Do not reuse a personal SSH key.

Recommended on Windows PowerShell:

```powershell
ssh-keygen -t ed25519 -C "github-actions-loom-production" -f "$env:USERPROFILE\.ssh\loom_production_deploy"
```

Recommended on Linux/macOS:

```bash
ssh-keygen -t ed25519 -C "github-actions-loom-production" -f ~/.ssh/loom_production_deploy
```

When prompted for a passphrase, leave it empty for GitHub Actions automation.

Files created:

- Private key: `loom_production_deploy`
- Public key: `loom_production_deploy.pub`

Print the public key:

Windows PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.ssh\loom_production_deploy.pub"
```

Linux/macOS:

```bash
cat ~/.ssh/loom_production_deploy.pub
```

Keep the public key text ready for the bootstrap command. The public key starts with `ssh-ed25519`.

Print the private key for the GitHub secret later:

Windows PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.ssh\loom_production_deploy" -Raw
```

Linux/macOS:

```bash
cat ~/.ssh/loom_production_deploy
```

Store the private key only in GitHub Actions secrets. Do not commit it.

## 4. Access The VM For The First Time

Use the VM provider's default user or root access. Examples:

```bash
ssh root@<vm-host-or-ip>
```

or:

```bash
ssh <provider-user>@<vm-host-or-ip>
sudo -i
```

Confirm the OS is Debian/Ubuntu-like:

```bash
cat /etc/os-release
```

Update package metadata before bootstrap if desired:

```bash
apt-get update
```

## 5. Get The Bootstrap Script Onto The VM

The bootstrap script lives at:

```text
deploy/scripts/bootstrap-vm.sh
```

Option A: clone the repo temporarily on the VM:

```bash
git clone https://github.com/<owner-or-org>/loom.git /tmp/loom
cd /tmp/loom
```

Option B: copy only the script from your workstation:

```bash
scp deploy/scripts/bootstrap-vm.sh root@<vm-host-or-ip>:/tmp/bootstrap-vm.sh
```

If using `scp`, run it on the VM as:

```bash
sudo bash /tmp/bootstrap-vm.sh production loom-deploy "<ssh-public-key>"
```

If using the cloned repo, run it as:

```bash
sudo bash deploy/scripts/bootstrap-vm.sh production loom-deploy "<ssh-public-key>"
```

Replace `<ssh-public-key>` with the full public key from `loom_production_deploy.pub`.

The deploy user name in this guide is `loom-deploy`. If you choose a different user, use the same
value for the `PRODUCTION_VM_USER` GitHub secret.

## 6. What Bootstrap Does

The bootstrap script:

- installs Docker Engine and Docker Compose plugin;
- installs `ca-certificates`, `curl`, `git`, and `ufw`;
- creates the deploy user if missing;
- installs the provided public key in `/home/<deploy-user>/.ssh/authorized_keys`;
- adds the deploy user to the `docker` group;
- creates:
  - `/opt/loom/hosted`
  - `/opt/loom/hosted/releases`
  - `/opt/loom/hosted/shared`
  - `/opt/loom/hosted/shared/caddy-data`
  - `/opt/loom/hosted/shared/caddy-config`
  - `/opt/loom/hosted/shared/mongo-data`
- opens SSH, HTTP, and HTTPS in UFW.

After bootstrap, log out and reconnect as the deploy user so group membership is fresh:

```bash
ssh -i ~/.ssh/loom_production_deploy loom-deploy@<vm-host-or-ip>
```

On Windows PowerShell:

```powershell
ssh -i "$env:USERPROFILE\.ssh\loom_production_deploy" loom-deploy@<vm-host-or-ip>
```

Confirm Docker works for the deploy user:

```bash
docker version
docker compose version
```

Confirm directories exist:

```bash
ls -la /opt/loom/hosted
ls -la /opt/loom/hosted/shared
```

Bootstrap must be complete before the first automatic deploy. The deploy workflow now runs a VM-side
preflight before touching the runtime, so missing Docker access, missing shared directories, missing
runtime env, or DNS that does not resolve will stop the deploy before Compose changes containers.

## 7. Configure DNS

Create DNS records before the first deploy so Caddy can issue TLS certificates.

Required records:

- `loomnetwork.site` -> VM public IP
- `api.loomnetwork.site` -> VM public IP

Use `A` records for IPv4. Add `AAAA` records only if the VM has a working public IPv6 address.

Verify from your workstation:

```bash
nslookup loomnetwork.site
nslookup api.loomnetwork.site
```

or:

```bash
dig loomnetwork.site
dig api.loomnetwork.site
```

If DNS is not propagated before deploy, the remote preflight fails before Compose starts. If DNS
changes during deployment, Caddy TLS issuance can still fail during the public HTTPS smoke check.

## 8. Create GitHub Production Secrets

Open:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions
```

Create these repository secrets, or create them under the `production` environment if your repository
uses environment-scoped secrets.

### VM SSH Secrets

`PRODUCTION_VM_HOST`

- VM public IP or hostname.
- Example: `203.0.113.10`

`PRODUCTION_VM_USER`

- Deploy user created by bootstrap.
- Recommended: `loom-deploy`

`PRODUCTION_VM_SSH_PORT`

- SSH port.
- Use `22` unless you changed SSH configuration.

`PRODUCTION_VM_SSH_PRIVATE_KEY`

- Full private key contents from `loom_production_deploy`.
- Include the begin/end lines.
- Example shape:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

`PRODUCTION_VM_SSH_KNOWN_HOSTS`

- Pinned host key output.
- Generate from your workstation:

```bash
ssh-keyscan -H <vm-host-or-ip>
```

Windows PowerShell:

```powershell
ssh-keyscan -H <vm-host-or-ip>
```

Copy the full output into the secret. This prevents GitHub Actions from trusting an unpinned host.

### Runtime Secrets

`PRODUCTION_CADDY_EMAIL`

- Email used by Caddy for ACME/TLS.
- Example: `ops@example.com`

`PRODUCTION_MONGO_ROOT_USERNAME`

- MongoDB root username for the Compose-managed MongoDB.
- Example: `loomroot`

`PRODUCTION_MONGO_ROOT_PASSWORD`

- Long random password.
- Generate one locally:

```bash
openssl rand -base64 36
```

PowerShell alternative:

```powershell
[Convert]::ToBase64String((1..36 | ForEach-Object { Get-Random -Maximum 256 }))
```

`PRODUCTION_MONGO_DATABASE`

- Database name.
- Recommended: `loom`

`PRODUCTION_MONGO_REPLICA_KEY`

- Random alphanumeric/base64 secret for MongoDB replica-set keyfile.
- Generate like the Mongo password.

`PRODUCTION_SESSION_SECRET`

- Generate like the Mongo password.
- Also used by the API for owner birth-date hashing.

`PRODUCTION_ADMIN_BOOTSTRAP_USERNAME`

- Initial admin username.
- Example: `admin`

`PRODUCTION_ADMIN_BOOTSTRAP_PASSWORD`

- Initial admin password.
- Use a strong generated password and store it in your password manager.

`PRODUCTION_GOOGLE_MAPS_API_KEY`

- Google Maps JavaScript API key for the production web frontend.
- Restrict it to `https://loomnetwork.site/*` in Google Cloud when possible.

## 9. Validate Local Repo Before First Push

From the repo root:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

If Docker is running locally, validate the hosted Compose runtime:

```bash
docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml config
docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml build
```

If Docker is not running locally, CI will still run the Compose config/build checks on GitHub-hosted
Ubuntu.

## 10. First Push To Main

The production deploy workflow is automatic after successful `CI` on `main`.

Recommended first-release flow:

```bash
git status
git add .
git commit -m "ci: add hosted production deployment"
git push origin main
```

If you work on a feature branch first:

```bash
git push origin <branch>
```

Then open a PR to `main`. After the PR merges, `CI` runs on `main`, and `Deploy Production` starts
automatically if CI succeeds.

## 11. What Happens In GitHub Actions

The `CI` workflow runs on hosted-runtime changes to `main` and PRs targeting `main`.

CI validates:

- format
- lint
- typecheck
- tests
- production build
- Docker-free e2e
- Docker Compose config
- Docker Compose build
- Gitleaks
- Trivy HIGH/CRITICAL filesystem scan

The `Deploy Production` workflow starts after successful `CI` on `main`.

Deploy steps:

1. Checkout the release SHA.
2. Validate all required secrets exist.
3. Start SSH agent with `PRODUCTION_VM_SSH_PRIVATE_KEY`.
4. Configure known hosts from `PRODUCTION_VM_SSH_KNOWN_HOSTS`.
5. Create `/opt/loom/hosted/releases/<sha>` and `/opt/loom/hosted/shared`.
6. Capture previous release from `/opt/loom/hosted/current_release`.
7. Upload source archive to the release directory.
8. Render `/opt/loom/hosted/shared/runtime.env`.
9. Run `deploy/scripts/remote-preflight.sh` on the VM.
10. Run `deploy/scripts/remote-deploy.sh` on the VM.
11. Smoke-check:
    - `https://api.loomnetwork.site/health`
    - `https://api.loomnetwork.site/ready`
    - `https://loomnetwork.site`
12. Assert readiness payload:
    - `status` is `ready`
    - `mongo` is `true`
    - `indexes` is `true`
13. Roll back to the previous release if validation fails and a previous release exists.

Production deploy concurrency is serialized in two places:

- GitHub queues production deploy workflow runs instead of canceling an in-flight deploy.
- VM scripts use `/opt/loom/hosted/deploy.lock` so deploy and rollback cannot run concurrently.

## 12. Validate The First Deployment

After the workflow succeeds:

```bash
curl -fsSL https://api.loomnetwork.site/health
curl -fsSL https://api.loomnetwork.site/ready
curl -I https://loomnetwork.site
```

Log in to the VM as deploy user:

```bash
ssh -i ~/.ssh/loom_production_deploy loom-deploy@<vm-host-or-ip>
```

Inspect release state:

```bash
cat /opt/loom/hosted/current_release
ls -la /opt/loom/hosted/current
ls -la /opt/loom/hosted/releases
```

Inspect containers:

```bash
cd /opt/loom/hosted/current
docker compose \
  --project-name loom-production \
  --project-directory /opt/loom/hosted/current \
  --env-file /opt/loom/hosted/shared/runtime.env \
  -f /opt/loom/hosted/current/deploy/compose/docker-compose.remote.yml \
  ps
```

Check logs:

```bash
docker compose \
  --project-name loom-production \
  --project-directory /opt/loom/hosted/current \
  --env-file /opt/loom/hosted/shared/runtime.env \
  -f /opt/loom/hosted/current/deploy/compose/docker-compose.remote.yml \
  logs --tail 100 api
```

Open browser checks:

- `https://loomnetwork.site`
- `https://loomnetwork.site/public`
- `https://loomnetwork.site/admin/login`

Use the bootstrap admin credentials from GitHub secrets for first admin login.

## 13. First Deploy Failure Behavior

The first deployment has no previous release. If it fails after containers start, automatic rollback
cannot switch back to an older release because `/opt/loom/hosted/current_release` does not exist yet.

Do not delete `shared/mongo-data` as a reflex. First inspect:

```bash
docker ps -a
docker logs $(docker ps -aq --filter name=api) --tail 100
docker logs $(docker ps -aq --filter name=web) --tail 100
docker logs $(docker ps -aq --filter name=caddy) --tail 100
docker logs $(docker ps -aq --filter name=mongo) --tail 100
```

Then fix the underlying issue and rerun `Deploy Production` manually against `main`.

Common first-deploy causes:

- DNS does not resolve both production domains to the VM.
- Cloud firewall blocks `80` or `443`.
- Caddy ACME issuance is still pending or rate-limited.
- Mongo credentials were changed after MongoDB initialized the persistent data directory.
- Deploy user did not reconnect after bootstrap and still lacks Docker group membership.

Only remove `/opt/loom/hosted/shared/mongo-data` if this is a deliberate production reset before any
real data exists.

## 14. Manual Deploy

Use GitHub Actions:

```text
Actions -> Deploy Production -> Run workflow -> git_ref
```

Set `git_ref` to a branch, tag, or SHA. The workflow resolves the exact release SHA before deploy.

## 15. Manual Rollback

Automatic rollback happens only when post-deploy validation fails and a previous release exists.

Manual rollback from the VM:

```bash
bash /opt/loom/hosted/current/deploy/scripts/remote-rollback.sh \
  production \
  <previous-release-sha> \
  /opt/loom/hosted \
  /opt/loom/hosted/shared/runtime.env
```

Rollback switches code/runtime only. It does not reverse database writes.

Never delete:

```text
/opt/loom/hosted/shared/mongo-data
```

## 16. Troubleshooting

### CI succeeds but deploy does not start

- Confirm the branch is `main`.
- Confirm the `Deploy Production` workflow listens to `workflow_run` for workflow name `CI`.
- Confirm the `CI` workflow conclusion is `success`.
- If the change was docs-only, `.agent/**`-only, mobile-only, firmware-only, or
  `packages/decision-tree/**`-only, CI is intentionally skipped. Run `Deploy Production` manually if
  you only changed deployment secrets or external infrastructure.

### Deploy fails at secret validation

- One required GitHub secret is missing or blank.
- Recheck section 8 exactly.

### SSH fails from GitHub Actions

- Confirm `PRODUCTION_VM_HOST`, `PRODUCTION_VM_USER`, and `PRODUCTION_VM_SSH_PORT`.
- Confirm the private key matches the public key installed by bootstrap.
- Regenerate `PRODUCTION_VM_SSH_KNOWN_HOSTS` with `ssh-keyscan -H <vm-host-or-ip>`.
- Confirm the VM firewall allows SSH.

### Docker permission denied on VM

Reconnect as the deploy user after bootstrap:

```bash
exit
ssh -i ~/.ssh/loom_production_deploy loom-deploy@<vm-host-or-ip>
```

If still failing:

```bash
groups
sudo usermod -aG docker loom-deploy
```

Then reconnect again.

### Remote preflight fails

- Confirm Docker works for the deploy user:

```bash
docker info
docker compose version
```

- Confirm shared directories are writable:

```bash
touch /opt/loom/hosted/shared/.write-test && rm /opt/loom/hosted/shared/.write-test
```

- Confirm DNS from the VM:

```bash
getent ahostsv4 loomnetwork.site
getent ahostsv4 api.loomnetwork.site
```

If `PRODUCTION_VM_HOST` is an IP address, both domains must resolve to that same IP.

### Caddy/TLS fails

- Confirm DNS records point to the VM.
- Confirm ports `80` and `443` are open in cloud firewall and UFW.
- The smoke check retries for about five minutes by default to allow first-time ACME issuance.
- Check Caddy logs:

```bash
docker logs $(docker ps -q --filter name=caddy) --tail 100
```

### API readiness fails

Check API logs:

```bash
docker logs $(docker ps -q --filter name=api) --tail 100
```

Check Mongo logs:

```bash
docker logs $(docker ps -q --filter name=mongo) --tail 100
```

Common causes:

- Mongo replica key too short or malformed.
- Mongo credentials changed after data directory already initialized.
- `runtime.env` missing a required value.
- MongoDB data directory permissions are wrong.

### Google Maps does not render

- Confirm `PRODUCTION_GOOGLE_MAPS_API_KEY`.
- Confirm Maps JavaScript API is enabled.
- Confirm key referrer restrictions allow `https://loomnetwork.site/*`.
- The app should still show the fallback map if Maps fails.

## 17. Secret Rotation Notes

Most runtime secrets are rendered to `/opt/loom/hosted/shared/runtime.env` during deployment.

To rotate a secret:

1. Update the GitHub secret.
2. Run `Deploy Production` manually against `main`, or push a new `main` commit.
3. Confirm `/opt/loom/hosted/shared/runtime.env` was regenerated.

Changing Mongo root username/password after MongoDB has initialized may require a deliberate MongoDB
credential migration. Do not rotate Mongo credentials casually on an existing data directory.

Changing `PRODUCTION_SESSION_SECRET` also changes the owner birth-date hash secret. On an existing
deployment, rotate it only with a deliberate migration plan for sessions and registered owner
birth-date hashes.
