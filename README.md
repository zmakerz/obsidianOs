# Business OS · obsidianOs

**English** | [한국어](README.ko.md)

A local-first knowledge and operations foundation for Obsidian, Markdown, and AI-assisted workflows.

Turn source material into readable articles and reusable knowledge, then bring that knowledge into company workflows. Personal knowledge and company data remain separate.

**Early development / local demo.** The first M2.1 slice supports local Raw preservation and AI Article generation through a CLI. Durable PostgreSQL jobs, recovery, Obsidian processing commands, and the full approval/execution flow are still in development. This is not yet a production or public-server release.

## What we are building

```text
Source → Preserved Raw → Faithful Article → Optional Wiki updates → Reuse in the next task
```

Preserve the original and produce an article that retains its examples, numbers, and code. Update the Wiki only when there is reusable knowledge to add. The longer-term goal is to connect that knowledge to planning, approval, execution, and measurement.

| Available now | Next to implement |
|---|---|
| Local CLI for Raw preservation, supplied drafts, and AI Articles | PostgreSQL job records and recovery |
| Reuse of completed requests and manual-edit conflict detection | Per-segment checkpoints and real-source quality evaluation |
| Public Obsidian sample Vault and structure/link checks | Obsidian processing commands and shared web task views |
| Control Tower Demo and initial DB views | Reviewed, approved Wiki changes and section-level retrieval |

**Language coverage:** this README is available in English and Korean. The current AI Article policy generates Korean text; detailed design documents and the sample Vault are also mostly in Korean. Selecting a README language does not change the application or generation language.

[Quick start](#quick-start) · [Process a source](#process-a-source) · [Obsidian](#use-with-obsidian) · [Resume development](#resume-on-another-computer) · [Roadmap](#roadmap-and-contributing)

## Quick start

The Demo and automated tests require **no API key or database**. Use Node.js 24+, Git, and the pnpm version pinned in [package.json](package.json). Run commands from the repository root.

```sh
git clone https://github.com/zmakerz/obsidianOs.git
cd obsidianOs
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm demo
corepack pnpm dev
```

If Corepack is unavailable, install pnpm 11.19.0 and omit the `corepack` prefix. No `.env` file is needed for Demo mode. Leave `DATABASE_URL` unset: setting it switches the dashboard to PostgreSQL mode.

Open [the local dashboard](http://127.0.0.1:3000). The dev/start commands bind to loopback. Demo KPIs, suggestions, and activities are synthetic, and approval buttons are disabled.

## Process a source

This is the first M2.1 implementation. Keep real documents in a private Vault or the Git-ignored `local-vault/` directory, rather than the public sample `vault/`. Replace the absolute paths below with your own. The target Vault directory must already exist.

### Save a supplied draft without an API call

Both the source and draft must be inside the specified `--source-root`.

```sh
corepack pnpm knowledge:process -- --vault "/absolute/private-vault" --source-root "/absolute/input" --source "/absolute/input/source.md" --title "Source title" --source-type web --url "https://example.com/article" --domain general --draft "/absolute/input/draft.md"
```

### Generate an Article with AI

Use [.env.example](.env.example) as a reference and set `OPENAI_API_KEY` in the repository-root `.env.local`. Replace `--draft ...` in the command above with `--ai`. This explicitly sends the selected source body to OpenAI and incurs API usage charges.

The adapter is configured to use `gpt-5.6-terra` by default, with an `OPENAI_MODEL` override. Compatibility with the adapter's reasoning options must be checked when changing models.

```sh
# Optional paid connectivity check requesting a short OK response.
# This is not part of the automated test suite.
corepack pnpm check:openai
```

### Outputs and behavior

| Output | Location | Purpose |
|---|---|---|
| Raw | `20_raw/<source_type>/date-title-hash.md` | Preserve the source body and line endings; verify with SHA-256 |
| Article | `80_outputs/articles/date-title-hash.md` | Store the review-pending draft, source ID/link, generation policy, and usage when available |
| Daily log | `90_logs/YYYY-MM-DD.md` | Append result summaries; does not replace the job database |

- Input is a UTF-8 `.md` or `.txt` file. The whole file is preserved. Capture frontmatter extraction, web/YouTube fetching, and binary/PDF imports are not implemented yet.
- Document IDs are separate from filenames. Repeating the same source/content/policy request returns the existing result without another AI call. Changed content or model/policy produces a separate result.
- Existing Raw/Article content is not overwritten. Manual edits or stale source links after a Raw move produce a conflict requiring review. This command does not delete Inbox items or create Wiki pages.
- Supplied drafts and AI-generated Articles are distinguished; both remain pending review.
- Empty or URL-only input returns `needs-input`. Model errors, truncated responses, or missing code blocks fail the request and preserve Raw. These checks do not guarantee factual or writing quality.
- AI input is split without breaking paragraphs or fenced code blocks: up to 12,000 characters per segment, 8 calls, and 8,192 output tokens per response. There are no automatic retries. Oversized indivisible blocks or inputs exceeding the call budget fail explicitly rather than being silently truncated.

The service currently supports one local writer. Concurrent writes are rejected through `.business-os-write.lock`. Normal errors/cancellation release the lock; forced termination can leave it behind for manual inspection and recovery. Partial generation checkpoints, automatic crash recovery, and persistent jobs/attempts/events are still pending. This is not a completed M2.1 pipeline or operational Worker.

API references: [OpenAI Responses](https://developers.openai.com/api/reference/responses/create) and [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra). Tests use synthetic fixtures and mocked API responses, without user documents or credentials.

## Use with Obsidian

Open **the `vault/` folder inside this repository**, then start at [40_navigation/HOME.md](vault/40_navigation/HOME.md). Top-level folders should include `00_system`, `10_inbox`, and `30_wiki`. If you see `apps` or `node_modules`, you opened the development root instead.

Keep the repository's internal `vault/` directory name. The outer checkout directory can be renamed. Renaming the Vault through Obsidian can also rename its folder; see [Obsidian Vault management](https://obsidian.md/help/manage-vaults).

Set the Core Templates folder to `00_system/templates`. HOME links distinguish actual file paths from display labels.

Run read-only validation from the repository root:

```sh
corepack pnpm check:vault
node scripts/vault-lint.mjs --vault "/absolute/company-vault"
```

Validation does not modify content or require an Article to create a Wiki or Map. See the [Vault operating rules](vault/00_system/OPERATING_RULES.md) for the current scope.

The existing personal-to-company promotion command creates a **manual proposal only**. Select an individual source from your personal Vault, use `--source-root` to bound reads, and use `--vault` for the private company Vault receiving the proposal. The target must contain `10_inbox`. On Windows/PowerShell, use absolute paths such as `C:/...`.

```sh
node scripts/propose-knowledge-promotion.mjs --vault "/absolute/company-vault" --source-root "/absolute/personal-vault" --source "/absolute/personal-vault/source.md" --title "Knowledge for company use" --domain general --kind article
```

A proposal does not perform AI processing, copy the original, or apply Wiki changes.

## Verify the project

```sh
corepack pnpm test
corepack pnpm demo
corepack pnpm typecheck
corepack pnpm build
```

CI runs these commands. Tests cover Kernel rules, knowledge promotion, the Raw/Article service, CLI input/path boundaries, and database repositories. Database unit tests currently use `FakeDatabase`; live PostgreSQL, AI, and Obsidian end-to-end verification are separate acceptance criteria.

The Vault linter checks YAML, kind-specific metadata, duplicate IDs, Wikilink targets/headings/attachments, and HOME reachability. It does not validate ordinary Markdown links or external URLs.

`corepack pnpm demo` runs an in-memory Loop through planning and approval. Its output includes:

```json
{ "phase": "execute", "cycle": 1, "approval": "approved" }
```

This demonstrates state transitions only: no publishing, API calls, file changes, or DB writes.

## Repository map

| Path | Current role |
|---|---|
| `packages/kernel` | Approval and operating-loop primitives |
| `packages/knowledge` | Knowledge references, promotion policy, local Raw/Article service, Markdown/OpenAI adapters |
| `packages/database` | Initial PostgreSQL schema/repositories and Demo snapshots |
| `apps/control-tower` | Demo and database dashboard |
| `apps/worker` | In-memory Loop example; operational Worker not implemented |
| `packs/marketing` | Models for the later GEO/AEO workflow |
| `vault` | Public Obsidian sample Vault and templates |

## Resume on another computer

Clone, install, and verify using the quick-start commands. For an existing checkout with no local changes, use `git pull --ff-only` to update the checked-out branch.

- Open the repository root in your development tool. Read [AGENTS](AGENTS.md) → [PROJECT](PROJECT.md) → [ACTIVE](ACTIVE.md), then the relevant code and documents. M2.0 is complete; M2.1 is in progress. PostgreSQL job state and recovery come next.
- Open only `vault/` in Obsidian. GitHub contains public code and samples; keys, private documents, Obsidian settings/plugins, installed dependencies, and DB data require separate local setup or secure transfer.
- Demo/tests need no key. The processing CLI reads the root `.env.local`; a file's existence is not proof of a working API connection.
- [Product decisions](docs/PRODUCT.md#설계-이력과-확정-기준) explain how the design evolved. [PROJECT](PROJECT.md#대화-없이-이어가는-문서-지도) maps the documents needed to continue without rereading old chats.

Only **committed and pushed** code/documents reach another checkout. Verification recorded for another computer does not replace checking the current machine's setup.

Suggested prompt for a new session:

> Read PROJECT.md and ACTIVE.md first, then the relevant PRODUCT decisions and the next unfinished MILESTONES item. Confirm implementation status against the current code and verification results. Continue from there, updating the existing documents with changes and remaining work.

## Data and operational boundaries

- Markdown is the intended source of truth for sources, articles, and knowledge; PostgreSQL owns job, approval, and execution state.
- A Company Profile is needed before company-specific workflows, not before building the generic pipeline.
- Tracked `vault/` files are public samples. Keep real personal/company data outside the repository or in ignored `local-vault/`. `.gitignore` does not protect files already tracked by Git.
- Do not commit API keys, tokens, `.env.local`, local Obsidian plugin settings, or private source material.
- Use a separate test database. The initial migration does not yet have versioned upgrade management or verification.
- The DB-mode actor string is not authentication. Network/team deployment requires authentication, company isolation, and approvals bound to their payloads.
- PostgreSQL configuration is documented in [apps/control-tower/.env.example](apps/control-tower/.env.example). The commands are `corepack pnpm db:migrate` and `corepack pnpm db:seed`; seed data is synthetic.

## Roadmap and contributing

| Stage | Scope | Status |
|---|---|---|
| M2.0 | Baseline and Obsidian usability | Complete within its defined scope |
| M2.1 | Source → Raw → Article, durable processing | In progress; local CLI slice implemented |
| M2.2 | Obsidian/web integration, optional Wiki, retrieval | Planned |
| M3 | One real company workflow with measurement and feedback | Planned |
| M4 | B2B readiness: authentication, isolation, backup/recovery, operations | Planned |

[Current state](ACTIVE.md) · [Product scope](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [Acceptance criteria](docs/MILESTONES.md) · [Contributing](CONTRIBUTING.md)

Progress is reported through verified scenarios and remaining limits, not speculative completion percentages or token-savings claims. Keep the English and Korean READMEs aligned when changing setup, commands, scope, or status. Detailed project documents are currently mostly in Korean.

## License

[MIT](LICENSE). Copyright (c) 2026 zmakerz and contributors.

Applies to original project code, documentation, and templates. Dependencies and third-party sources or linked material retain their own rights.
