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
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Public browser key; never use a service-role key |

The application starts without these variables while no data layer is implemented.

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
