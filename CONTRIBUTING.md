# Contributing

Business OS / obsidianOs is an early-stage, local-first knowledge and operations project.
현재는 범용 자료 → Article → 선택적 Wiki 흐름을 만드는 단계입니다.

## Start small

- Read [PROJECT](PROJECT.md), [ACTIVE](ACTIVE.md) and the relevant code only.
- Discuss broad architecture changes in an issue before implementing them.
- Prefer a focused bug fix, regression test, documentation correction or reproducible example.
- Do not introduce a new AI provider, paid call, external publishing action or dependency without explaining why it is needed.

## Verify a change

Use Node.js 24+ and the pnpm version pinned in package.json.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm demo
corepack pnpm typecheck
corepack pnpm build
```

In your pull request, explain the change, its tests and remaining limitations.
Use temporary Vaults and synthetic input for tests; do not change personal documents or require API keys.
Default database unit tests use a fake database. Live PostgreSQL tests run separately as described below and are also configured in CI with PostgreSQL 18.

## Live database verification

Use PostgreSQL 18 (verified locally: 18.6). Put `initdb`, `pg_ctl` and `createdb` on PATH; on macOS, Homebrew's `postgresql@18` supplies them under `/opt/homebrew/opt/postgresql@18/bin`. Do not register an automatic service just to run tests.

This POSIX-shell example creates a private temporary cluster with Unix-socket access only. Local trust authentication is confined to its private temporary directory; TCP access is disabled.

```sh
PG_TEST_DIR=$(mktemp -d /tmp/bos-pg.XXXXXX)
initdb -D "$PG_TEST_DIR/data" --encoding=UTF8 --locale=C --auth-local=trust --auth-host=reject
pg_ctl -D "$PG_TEST_DIR/data" -l "$PG_TEST_DIR/server.log" -o "-h '' -k $PG_TEST_DIR -p 55481" -w start
createdb -h "$PG_TEST_DIR" -p 55481 business_os_test
export TEST_DATABASE_URL="postgresql://localhost:55481/business_os_test?host=$PG_TEST_DIR"
corepack pnpm test:database:integration
pg_ctl -D "$PG_TEST_DIR/data" -m fast -w stop
```

Stop the temporary server even if a test fails. The directory is retained for inspection and is disposable after shutdown. This is a developer test setup, not the product installer.

The test command requires an explicit **local** `TEST_DATABASE_URL` with database name `business_os_test` and a role with `CREATEDB`. It never falls back to `DATABASE_URL`. Each case creates a random `business_os_test_*` database, closes its connections and drops only that database. Never point tests at production or a shared development database. The dedicated CI credentials are synthetic and used only in the disposable service.

Coverage includes empty installation, concurrent migration, checksums/order, failed installation/upgrade rollback, rejection of untracked schemas, workspace foreign keys, scoped repository access, concurrent approval, audit rollback, pool reuse, a fresh Node process, and the Control Tower server adapter. Job tests also cover simultaneous claims, cross-workspace constraints, retry limits/success, cancellation, partial/unknown model usage, DB failures and CLI history across processes. All model responses are mocked. Recovery tests also SIGKILL child processes at model/file/log boundaries, force lease expiry only inside disposable databases, and check live-owner protection, concurrent resumes and user edits. Database-server restart/reconnection was additionally verified on the Mac; it is not part of the automated integration command.

`db:migrate` now records versions/checksums in `public.business_os_migrations`, serializes runners and applies pending migrations in one transaction. `001_control_tower.sql` remains unchanged; `003_workspace_learning.sql` adds a workspace-bound source reference and `004_processing_jobs.sql` adds durable processing records; `005_processing_recovery.sql` adds leases and recovery journals. Stop old CLI processes before migrating; running jobs without leases are not automatically adopted. `002_demo_seed.sql` remains an explicit opt-in seed, outside the migration manifest. Add new numbered SQL bodies without `BEGIN`/`COMMIT` and register them in `src/migrations.ts`; never edit an applied migration.

An existing public schema without a ledger is deliberately rejected. There is no automatic baseline/import command yet: use a new empty dedicated DB for trials; preserving an old DB requires backup and a separate schema/data review before an explicit baseline is designed. Do not delete tables or fabricate ledger records to bypass the check. A recorded migration checksum verifies migration history, not arbitrary manual schema drift.

## Resume development on another computer

Clone, install, and verify using the [README quick-start commands](README.md#quick-start). For an existing checkout with no local changes, use `git pull --ff-only` to update the checked-out branch.

- Open the repository root in your development tool. Read [AGENTS](AGENTS.md) → [PROJECT](PROJECT.md) → [ACTIVE](ACTIVE.md), then the relevant code and documents. M2.0 is complete; M2.1 is in progress. PostgreSQL job records are connected; explicit local crash resume is implemented; input and real-source quality verification come next.
- Open only `vault/` in Obsidian. GitHub contains public code and samples; keys, private documents, Obsidian settings/plugins, installed dependencies, and DB data require separate local setup or secure transfer.
- Demo/tests need no key. The processing CLI reads the root `.env.local`; a file's existence is not proof of a working API connection.
- [Product decisions](docs/PRODUCT.md#설계-이력과-확정-기준) explain how the design evolved. [PROJECT](PROJECT.md#대화-없이-이어가는-문서-지도) maps the documents needed to continue without rereading old chats.

Only **committed and pushed** code/documents reach another checkout. Verification recorded for another computer does not replace checking the current machine's setup.

Suggested prompt for a new session:

> Read PROJECT.md and ACTIVE.md first, then the relevant PRODUCT decisions and the next unfinished MILESTONES item. Confirm implementation status against the current code and verification results. Continue from there, updating the existing documents with changes and remaining work.

## Leave a resumable state

- Keep durable product decisions and their reasons in [PRODUCT](docs/PRODUCT.md), service boundaries in [ARCHITECTURE](docs/ARCHITECTURE.md), and acceptance criteria in [MILESTONES](docs/MILESTONES.md). Extend these before adding another handoff document.
- Update [ACTIVE](ACTIVE.md) with the current slice, verification date/environment, known limits and next concrete action. Separate planned, implemented and verified behavior; do not use a private conversation, temporary file or Git stash as the only record of an accepted decision.
- Record whether changes are committed/pushed. On another machine, check its checkout and local setup before relying on previous verification. Document-only changes need link/content checks and the repository tests, without new paid API calls or unrelated build repetition.
- Keep developer handoff, Git synchronization and agent-session prompts in this contributor guide and ACTIVE, rather than in the user-facing READMEs.
- Keep [README](README.md) in English as the default and [README.ko](README.ko.md) in Korean, with reciprocal language links at the top. Update both when commands, prerequisites, capabilities, limits or milestone status change. This documentation language choice does not change the application's output language.

## Public repository boundary

Publish only code, original documentation, templates and redistributable sample data.
Never include credentials, private conversations, customer records, scraped articles without redistribution rights, or local Obsidian plugin settings.
Use an untracked local-vault/ directory for private experiments; tracked vault/ files are public examples.
Original contributions are provided under the repository's MIT license. Dependencies and third-party material retain their own licenses.
