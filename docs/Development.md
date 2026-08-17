# Development Guide

## Prerequisites

- Node.js 24 or newer
- pnpm 11 or newer
- A Supabase project is optional until a domain requiring persistence is implemented

## Installation

```bash
git clone https://github.com/trsegui06/phoenix-os.git
cd phoenix-os
pnpm install
```

Copy `.env.example` to `.env.local` only when Supabase is required. Never commit `.env.local` or real keys.

## Environment variables

| Variable | Required now | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for authentication | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for authentication | Public browser key; never use a service-role key |

Without these variables, authenticated routes redirect to `/login` and the login screen reports that authentication is not configured. No authenticated state is simulated.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm db:types
```

The repository uses pnpm. The scripts are standard npm scripts and can also be run with `npm run <script>` when npm is available in the local Node.js installation.

## Project structure

```text
app/        Presentation layer: routes, layouts and page composition
components/ Reusable UI primitives
domain/     Business rules and use cases, organized by domain
services/   Application-service orchestration
data/       Persistence adapters and database access
lib/        Framework and infrastructure utilities
tests/      Unit and end-to-end tests
```

## Conventions

- UI components do not contain business rules or database queries.
- Domain services are testable independently from the UI.
- Data access is isolated under `data/`.
- Financial amounts will use integer cents and validated transactions will be immutable.
- Database migrations must be versioned before a persistent domain is delivered.

## Local development, tests and build

Run `pnpm dev` and open `http://localhost:3000`. Run `pnpm test` for unit tests and `pnpm test:e2e` for the browser smoke test. Run `pnpm build` before release to validate the production build.

## Local PostgreSQL migration validation

Docker Desktop with its Linux engine running is required for this disposable local validation. The migration source of truth is `database/migrations/`; create future migrations there with an ordered filename such as `0002_description.sql`.

The following PowerShell commands use the Docker Desktop CLI path that was validated on Windows. They create a local-only container without publishing a port, mount the migration read-only, and execute it with the image's `psql` client:

```powershell
$docker = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
$migration = (Resolve-Path "database/migrations/0001_trading_core.sql").Path
$validationPassword = [guid]::NewGuid().ToString("N")

& $docker info
& $docker run --rm -d --name phoenix-os-pg-validation `
  -e POSTGRES_USER=phoenix_validation `
  -e POSTGRES_PASSWORD=$validationPassword `
  -e POSTGRES_DB=phoenix_validation `
  --mount "type=bind,source=$migration,target=/validation/0001_trading_core.sql,readonly" `
  postgres:16.11
& $docker exec phoenix-os-pg-validation pg_isready -U phoenix_validation -d phoenix_validation
& $docker exec phoenix-os-pg-validation psql -v ON_ERROR_STOP=1 -U phoenix_validation -d phoenix_validation -f /validation/0001_trading_core.sql
```

Remove the disposable database after validation, then repeat the start and apply commands with a new container to prove a clean reapplication:

```powershell
& $docker rm -f phoenix-os-pg-validation
& $docker ps
```

These commands are **local validation only**. Never run reset, removal, or migration commands against a production or remote Supabase/PostgreSQL database.

## Local Supabase Auth and RLS validation

The project pins the Supabase CLI as a development dependency. Docker Desktop must be running. `database/migrations/` remains the only migration source; create the local-only Windows junction below before starting Supabase so the CLI reads the same files without copying them:

```powershell
$bridge = Join-Path (Resolve-Path "supabase").Path "migrations"
if (-not (Test-Path $bridge)) {
  New-Item -ItemType Junction -Path $bridge -Target (Resolve-Path "database/migrations").Path
}

pnpm supabase start --agent no -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,mailpit,realtime
pnpm supabase db reset --local --agent no
pnpm supabase stop --no-backup --agent no
```

`supabase db reset --local` destroys and recreates the local database, then applies `0001`, `0002`, and later migrations from the junction. It must never be used with `--linked` for this workflow. Do not run `supabase link`, `supabase db push`, or a remote reset during local validation.

With local Supabase running and all migrations applied, regenerate the checked-in public database types with `pnpm db:types`. The generated `lib/supabase/database.types.ts` file is infrastructure output: do not hand-edit it or use it as a domain model. Regenerate it after every database migration and include the resulting diff in the same change.

### Local authentication UI testing

With local Supabase running, expose only its local URL and anonymous/publishable key to the application and tests:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "<local anon key from supabase status>"
$env:PHOENIX_SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$env:PHOENIX_SUPABASE_ANON_KEY = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm test
pnpm test:e2e
```

The E2E setup creates disposable synthetic Auth users and one matching Trader profile through the anonymous authenticated workflow. It never uses a service-role key or a remote project. Stop local Supabase with `pnpm supabase stop --no-backup --agent no` after testing.

### Local registration and recovery email testing

The local Auth configuration allows email/password signup without confirmation and enforces the provider minimum of six password characters. Set `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000` so signup and recovery use the fixed `/auth/callback` endpoint. Hosted deployments must configure the same trusted origin and callback in Supabase redirect allow-lists.

Supabase CLI captures recovery and, when enabled, confirmation messages in Mailpit. Run `pnpm supabase status` and open the reported Mailpit URL (normally `http://127.0.0.1:54324`). Never configure real SMTP credentials in the repository. Production SMTP delivery, provider limits, domain configuration, monitoring, and infrastructure abuse protection remain deployment responsibilities.
