# LOOM Web App

Next.js public and admin web frontend for LOOM.

## Routes

- `/` polished public landing page.
- `/public` unauthenticated public heatmap and marker surface.
- `/public/history` privacy-gated public history lookup.
- `/admin/login` admin authentication.
- `/admin/**` authenticated operational dashboards for overview, map, nodes, messages, and settings.

## Local Commands

Run from the repository root:

```bash
npm run web:dev
npm run web:test
npm run web:build
```

The root `lint`, `typecheck`, `test`, and `build` scripts include this workspace.
