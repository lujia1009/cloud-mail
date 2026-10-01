# Virevan Mail frontend

Independent React 19, TypeScript and Vite frontend for the existing Cloud Mail Worker. The Worker API remains the source of truth; this project sends requests to `/api` and emits static assets into `../mail-worker/dist`.

## Development

```sh
cd mail-react
pnpm install --frozen-lockfile
pnpm dev
```

Vite proxies `/api` to `http://127.0.0.1:8787` (see `vite.config.ts`). Run the existing Worker locally with its own D1/R2/KV bindings to exercise real authentication, mail and admin flows. The React app has no mock backend.

## Checks and deployment

```sh
pnpm run typecheck
pnpm run lint
pnpm run build
```

The production build writes directly to `mail-worker/dist`. The Wrangler build commands install this project's frozen lockfile and run its production build. Deploy the Worker through the existing Cloudflare workflow after configuring the existing Worker bindings and secrets.

`FRONTEND_MIGRATION.md` at the repository root records the legacy feature/API inventory, storage compatibility and verification boundaries.
