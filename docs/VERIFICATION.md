# Together V1 — Verification Record

## Environment

Handoff sandbox:

- OS: Linux container
- Node: `v22.16.0`
- Required project runtime: Node 24 LTS
- pnpm executable: unavailable
- Corepack: present, but registry DNS unavailable (`EAI_AGAIN registry.npmjs.org`)
- uploaded `node_modules`: copied from a different/platform-stale install and intentionally excluded from final ZIP

## Passing verification

### Sandbox-safe aggregate

```bash
node tools/verify-sandbox.mjs
```

Result: PASS.

It runs:

1. `node tools/verify-pure.mjs`
   - 161 tests
   - 161 pass
   - 0 fail
2. `tsc -p client/tsconfig.json --noEmit`
   - PASS
3. `tsc -p shared/tsconfig.json --noEmit`
   - PASS
4. `tsc -p content/tsconfig.json --noEmit`
   - PASS
5. `node tools/validate-repository.mjs`
   - PASS
   - nine ordered migrations
   - required project roots/docs found
   - no obvious committed secrets
   - obsolete legacy runtime entrypoints absent

### Content validation

The emitted content validator returned `[]` (no content issues).

## Blocked/failed because of environment

### pnpm quality gate

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
```

Could not start: `pnpm: command not found`.

`corepack pnpm --version` attempted to obtain the declared pnpm version but failed because registry DNS/network access is disabled.

### ESLint direct

Direct execution reached the stale installed ESLint 8 tree and failed to resolve the newly declared `@typescript-eslint/eslint-plugin`. The clean package graph declares the plugin; it simply cannot be installed here.

### Server TypeScript direct

Global `tsc -p server/tsconfig.json --noEmit` reaches application source but the copied dependency tree lacks:

- `@types/express`;
- `@types/supertest`;
- the declared current Drizzle `drizzle-orm/pg-core` package/type shape.

The resulting implicit-any cascade is dependency typing loss, not evidence that those callback parameters are intentionally untyped in a clean install.

### Vite production build

Direct Vite build fails before application bundling because the copied dependency tree lacks Linux Rollup optional package `@rollup/rollup-linux-x64-gnu`.

This is the exact platform-copy failure the project instructions warned against; `node_modules` is excluded from the final archive.

### Server boot

The copied dependency tree does not contain the declared `tsx` package entrypoint, so the TypeScript development server cannot be booted in this sandbox.

## Required first connected verification

On Node 24 with registry access:

```bash
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build
pnpm test:e2e
```

If all pass, commit the generated `pnpm-lock.yaml`, then switch CI to `pnpm install --frozen-lockfile`.

Also perform manually:

- two-browser Couple create/join/property/movement test;
- six-player Friends soak if enough clients are available;
- reload/reconnect persistence;
- shared kitchen parallel work;
- furniture simultaneous edit test;
- moving transaction and Memory spread;
- voice peer test with STUN then TURN;
- Quiet Walk, Shared Kitchen, Money, Rain, Moving, Memory and No-HUD PRD acceptance tests;
- Medium 1080p frame-time/draw-call/triangle measurements on an Iris Xe-class machine or equivalent.
