# LOOM Manual Provisioning Checklist

Document status: Active
Created: 2026-05-05
Purpose: short checklist for external resources needed before first production deploy

## DNS

- `loomnetwork.site` points to the production VM.
- `api.loomnetwork.site` points to the production VM.
- Ports `80` and `443` are reachable from the internet.

## VM

- Ubuntu/Debian-like host provisioned.
- `deploy/scripts/bootstrap-vm.sh` run successfully.
- Deploy user can SSH with the GitHub Actions private key.
- Deploy user can run Docker.
- `/opt/loom/hosted/shared/mongo-data` exists and is not inside a release directory.

## GitHub Secrets

- VM SSH host/user/port/private key/known hosts configured.
- Caddy email configured.
- MongoDB username/password/database/replica key configured.
- Session secret configured.
- Admin bootstrap username/password configured.
- Google Maps API key configured.

## Google Maps

- Maps JavaScript API enabled.
- Billing/quota configured for the production key.
- Production key allowed for `loomnetwork.site`.
