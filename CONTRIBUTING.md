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
The existing database unit tests use a fake database, not a live PostgreSQL server.

## Leave a resumable state

- Keep durable product decisions and their reasons in [PRODUCT](docs/PRODUCT.md), service boundaries in [ARCHITECTURE](docs/ARCHITECTURE.md), and acceptance criteria in [MILESTONES](docs/MILESTONES.md). Extend these before adding another handoff document.
- Update [ACTIVE](ACTIVE.md) with the current slice, verification date/environment, known limits and next concrete action. Separate planned, implemented and verified behavior; do not use a private conversation, temporary file or Git stash as the only record of an accepted decision.
- Record whether changes are committed/pushed. On another machine, check its checkout and local setup before relying on previous verification. Document-only changes need link/content checks and the repository tests, without new paid API calls or unrelated build repetition.
- Keep [README](README.md) in English as the default and [README.ko](README.ko.md) in Korean, with reciprocal language links at the top. Update both when commands, prerequisites, capabilities, limits or milestone status change. This documentation language choice does not change the application's output language.

## Public repository boundary

Publish only code, original documentation, templates and redistributable sample data.
Never include credentials, private conversations, customer records, scraped articles without redistribution rights, or local Obsidian plugin settings.
Use an untracked local-vault/ directory for private experiments; tracked vault/ files are public examples.
Original contributions are provided under the repository's MIT license. Dependencies and third-party material retain their own licenses.
