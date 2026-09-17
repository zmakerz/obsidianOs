# Active

updated_at: 2026-09-17
milestone: M2.0 Baseline repair
status: public-baseline-verified

## Scope

Public early-development baseline: source code, MIT license, documentation, synthetic demo data and blank Vault templates only.
No private conversations, company decision history or local review reports are included.

## Implemented

- Kernel approval/loop state models and knowledge promotion policy.
- Next.js Control Tower demo and initial PostgreSQL schema/repository.
- Runnable in-memory loop example; no external execution or API keys.
- Explicit-path sample Vault links and portable proposal CLI.
- CLI input/path-boundary regression tests, local-only web binding, CI.

## Not implemented / not validated

- Raw/Article processing service, real AI generation, persistent Worker and Obsidian processing commands.
- Authentication, multi-company isolation, approval payload/revision binding.
- Live PostgreSQL migrations, restart/concurrency/rollback integration tests.
- Strict YAML/kind/heading/link-reachability validation.
- Native Obsidian UI end-to-end verification.

## Local verification — 2026-09-17

- Frozen-lockfile installation, 19 tests (zero skipped), demo, typecheck and production build passed.
- Structure check: 17 required paths. Current Vault lint: 21 Markdown files, 22 links.
- Current publication snapshot: no private conversation identifiers, personal machine paths or high-confidence credential patterns found.
- This is not a complete security audit. GitHub CI is verified separately after publication.

## Next — M2.0

Finish strict Vault validation with negative fixtures, HOME reachability and native Obsidian checks.
Use temporary Vaults only; never modify private source data in tests.
Then follow [Milestones](docs/MILESTONES.md) for M2.1 common processing service, M2.2 Obsidian/web/Wiki, M3 first operational loop and M4 B2B readiness.

Company-specific goals are required before company strategy, not before generic data processing.
