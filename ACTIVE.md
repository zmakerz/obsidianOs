# Active

updated_at: 2026-09-17
milestone: M2.0 Baseline repair
status: complete

## Current state

- This revision contains the completed M2.0 baseline and the M2.1 handoff.
- Public scope: code, MIT license, tests, documentation and synthetic/blank sample Vault only.
- Keep the portable repository layout: development root plus its vault/ subfolder.
- Open only vault/ in Obsidian. A Vault rename changes its actual folder name.
- No private data, credentials or local Obsidian settings are included. Real AI processing is not implemented.

## Implemented

- Portable proposal CLI with strict arguments, source/target path boundaries and exclusive writes.
- YAML 1.2 parser, kind-specific fields, real dates, optional unique IDs and bounded frontmatter expansion.
- Actual-file Wikilinks, display aliases, relative paths, headings/blocks and attachment checks.
- HOME reachability for active/draft Wiki/SOP; no navigation requirement for standalone Article/Output.
- Read-only failure fixtures; no automatic content edits or factual/style constraints.
- Development-root Obsidian settings are ignored by Git, not deleted.

## Verification

- Local verification on 2026-09-17: frozen-lockfile installation, full test suite, demo, typecheck and production build passed with the current code.
- Sample Vault: 21 Markdown files, 22 Wikilinks, 5 reachable Wiki/SOP documents.
- Final rerun: 59 tests passed, zero failed/skipped (11 core + 8 proposal CLI + 40 Vault checks); git diff --check passed.
- Both root and Vault .obsidian settings are ignored by Git and retained on disk.
- Manual Obsidian verification: Company Profile, Business OS operating model and company knowledge promotion SOP open with existing content. Company Profile fields remain intentional blank template placeholders.
- This manual document check is not an automated Obsidian end-to-end test.
- Current lint does not validate ordinary Markdown links, external URLs, real PDF page counts or all Obsidian plugins.
- Live PostgreSQL, real AI processing and authentication/tenant isolation remain unverified.

## Next

1. M2.0 is complete within its stated scope. M2.1 implementation has not started; continue there without rebuilding M2.0.
2. M2.1: common Capture/Raw/Article service, stable IDs, immutable source snapshots and duplicate-safe writes in temporary Vault tests first. Then versioned PostgreSQL work state and recovery.
3. Real AI calls require a separate key/cost/input-scope check. Company-specific strategy waits for Company Profile; generic processing does not.

## Resume on another computer

- Follow README quick start with Node.js 24+ and the pinned pnpm version; the demo needs no API key or database.
- Read AGENTS.md, PROJECT.md and this file from the repository root, then the M2.1 section in docs/MILESTONES.md.
- Open only the clone's vault/ subfolder in Obsidian, starting at 40_navigation/HOME.md.
- Git does not transfer .env files, private Vault data, local plugin settings, node_modules or a database. Configure/transfer these separately only when needed.
- Recheck credentials locally without displaying their values; do not assume another computer's setup is available. API env loading still needs implementation.

See [Milestones](docs/MILESTONES.md). Source/private company documents and local Obsidian settings must not be included in publication.
