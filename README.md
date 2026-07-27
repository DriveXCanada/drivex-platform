# DriveX Platform

A [Turborepo](https://turbo.build/repo) monorepo for the DriveX platform.

```
drivex-platform/
├── apps/
│   └── vets-canada/     # VETS Canada — Dartmouth Food Bank (Next.js 14, App Router)
├── packages/            # (shared packages — reserved for future use)
├── turbo.json
├── railway.json         # Railway deploy config (Nixpacks)
└── package.json         # npm workspaces
```

## Apps

### `apps/vets-canada`

The VETS Canada Dartmouth food-bank inventory app, migrated from the standalone
[VETS repo](https://github.com/vantagesecurityconsulting/VETS). **All existing
features are preserved.** Two infrastructure changes were made:

1. **Database driver** — swapped `@vercel/postgres` for **`pg` (node-postgres)**
   so it runs on Railway's standard Postgres. A drop-in `sql` tagged-template in
   [`apps/vets-canada/lib/db.ts`](apps/vets-canada/lib/db.ts) preserves the exact
   call surface, so none of the ~311 query call-sites changed.
2. **Multi-tenancy** — every table carries a `tenant_id`, isolated with Postgres
   **Row-Level Security** (see below).

## Multi-tenancy

- The active tenant per deployment is fixed by the `TENANT_ID` env var
  (default `vets-canada`). One app = one tenant/brand.
- Every application table has a `tenant_id` column that **defaults** to the
  `app.tenant_id` Postgres GUC, which the DB client sets per request.
- **Row-Level Security** policies restrict every non-superuser role to rows for
  the current `app.tenant_id`. Writes are auto-stamped by the column default;
  reads/updates/deletes are auto-filtered by the policy.
- The running app connects as a **dedicated non-superuser role** (`vets_app`) so
  RLS is actually enforced (superusers and table owners bypass RLS). A separate
  **superuser** connection (`ADMIN_DATABASE_URL`) is used only for one-time
  bootstrap/DDL and seeding.

### Connection strings

| Var | Role | Used for |
| --- | --- | --- |
| `ADMIN_DATABASE_URL` | superuser (`postgres`) | one-time bootstrap: schema, RLS, role creation, seeding |
| `DATABASE_URL` | app role (`vets_app`) | all request-time queries (RLS enforced) |

## Environment

Copy [`apps/vets-canada/.env.example`](apps/vets-canada/.env.example) to
`.env.local` for local dev. Required keys:

```
TENANT_ID              # vets-canada
TENANT_NAME            # display name for the tenants row
ADMIN_DATABASE_URL     # superuser connection (bootstrap only)
APP_DB_USER            # app role name (default vets_app)
APP_DB_PASSWORD        # app role password (used to create/sync the role)
DATABASE_URL           # app-role connection (runtime)
SESSION_SECRET         # 32+ char random secret
```

- `.env.local` uses the Railway **public proxy** URL (for local dev).
- `.env.production` uses the Railway **internal** URL (only resolves inside
  Railway's private network at runtime).
- **No `.env` file with real secrets is committed** — `.gitignore` tracks only
  `.env.example`. In Railway, set these as service Variables (ideally reference
  the Postgres service, e.g. `${{ Postgres.DATABASE_URL }}`).

## Local development

```bash
npm install
npm run dev            # runs all apps via turbo
```

Then open http://localhost:3000. On first request the app self-bootstraps the
database (schema, RLS, the `vets_app` role, and seed data) using
`ADMIN_DATABASE_URL`. You can also trigger it explicitly by visiting
`/api/setup`. Default first login: manager **PIN `0000`** (forces a change).

## Deploying to Railway

1. Push this repo to GitHub (see below) and create a Railway service from it, in
   the same project as the Postgres service.
2. Set the service **Variables** (see the table above). Use the **internal**
   Postgres host (`postgres.railway.internal`) for `ADMIN_DATABASE_URL` and
   `DATABASE_URL`.
3. Railway builds with Nixpacks per [`railway.json`](railway.json):
   - build: `npm run build` (turbo builds all apps)
   - start: `npm run start -w apps/vets-canada` (`next start`, binds `$PORT`)
4. First request bootstraps the database automatically.

## Security notes

- The Postgres superuser password was shared in plaintext during setup —
  **rotate it** in Railway after bootstrapping.
- `SESSION_SECRET` and `APP_DB_PASSWORD` in the local `.env.*` files are
  generated values; rotate/replace them for production as needed.
