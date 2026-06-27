# Agent Base

Agent Base is a local-first research platform. The current runnable slice installs a loopback-only web process, worker, and private PostgreSQL/pgvector runtime, then creates the initial Owner and Workspace automatically.

## macOS development

Development requires Node.js 24, pnpm 10.12.1, PostgreSQL 18, and pgvector 0.8.2. End-user Windows installations bundle these dependencies; they are development tools only on macOS.

```sh
brew install postgresql@18 pgvector
corepack enable
pnpm install
pnpm dev
```

If PostgreSQL is not under `/opt/homebrew/opt/postgresql@18/bin`, set `AGENT_BASE_POSTGRES_BIN` to its `bin` directory. `pnpm dev` builds the application, initializes data under `~/Library/Application Support/Agent Base`, and starts the runtime at `http://127.0.0.1:3210`.

Runtime controls use the same interface as the native package:

```sh
pnpm --filter @agent-base/runtime exec tsx src/cli.ts health
pnpm --filter @agent-base/runtime exec tsx src/cli.ts stop
```

Run `pnpm check` for formatting, type checks, and tests. Run `pnpm build` to create production assets.

## Windows distribution

The Windows acceptance workflow builds pgvector 0.8.2 against PostgreSQL 18.4, stages portable Node.js 24 LTS and PostgreSQL binaries, creates a per-Owner Inno Setup installer, and verifies install/start/health/loopback/stop behavior with machine-level development tools removed from `PATH`.

Installed Start, Health, and Stop shortcuts call the bundled runtime. Application data remains in `%LOCALAPPDATA%\Agent Base` when the application is uninstalled so an Owner does not lose research data implicitly.
