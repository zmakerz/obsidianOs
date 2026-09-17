import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { KnowledgeError, type SourceInput } from '../packages/knowledge/src/article-types.ts';
import { MarkdownVault } from '../packages/knowledge/src/markdown-vault.ts';
import { OpenAIArticleGenerator } from '../packages/knowledge/src/openai-article.ts';
import { processSource, providedDraft } from '../packages/knowledge/src/source-article.ts';
import { processSourceJob } from '../packages/knowledge/src/process-job.ts';

async function readInput(root: string, path: string): Promise<string> {
  if (!isAbsolute(root) || !isAbsolute(path)) throw new KnowledgeError('absolute-input-paths-required');
  const actualRoot = await realpath(root), actual = await realpath(path), part = relative(actualRoot, actual);
  if (!(await stat(actualRoot)).isDirectory() || !part || part === '..' || part.startsWith('..' + sep) || isAbsolute(part)) throw new KnowledgeError('input-outside-source-root');
  if (!['.md', '.txt'].includes(extname(actual).toLowerCase())) throw new KnowledgeError('text-file-required');
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 2_000_000) throw new KnowledgeError('invalid-input-file');
    return new TextDecoder('utf-8', { fatal: true }).decode(await handle.readFile());
  } finally { await handle.close(); }
}
export async function run(argv: string[]): Promise<void> {
  const { values, tokens } = parseArgs({ args: argv[0] === '--' ? argv.slice(1) : argv, strict: true, allowPositionals: false, tokens: true,
    options: {
      vault: { type: 'string' }, 'source-root': { type: 'string' }, source: { type: 'string' }, title: { type: 'string' },
      'source-type': { type: 'string' }, url: { type: 'string' }, domain: { type: 'string' }, draft: { type: 'string' },
      ai: { type: 'boolean' }, 'capture-scope': { type: 'string' }, help: { type: 'boolean', short: 'h' },
      'track-job': { type: 'boolean' }, workspace: { type: 'string' }, retry: { type: 'boolean' }, 'max-attempts': { type: 'string' },
    } });
  const seen = new Set();
  for (const token of tokens) if (token.kind === 'option') { if (seen.has(token.name)) throw new KnowledgeError('duplicate-option'); seen.add(token.name); }
  if (values.help) {
    console.log('Usage: node --env-file-if-exists=.env.local scripts/process-source.ts --vault /absolute/vault --source-root /absolute/input-folder --source /absolute/input-folder/source.md --title "제목" [--source-type web] [--url https://...] [--domain general] [--capture-scope full|excerpt] (--draft /absolute/input-folder/draft.md | --ai)\n--ai explicitly sends the selected source body to OpenAI. --draft does not call an API. URL-only input returns needs-input. No Wiki creation or Inbox deletion.');
    console.log('Optional: --track-job --workspace <existing-workspace-id> [--max-attempts 1..5] [--retry]. Requires DATABASE_URL. A repeated request returns the saved job. --retry explicitly retries an eligible failed job.');
    return;
  }
  if (!values.vault || !isAbsolute(values.vault) || !values['source-root'] || !values.source || !values.title) throw new KnowledgeError('required-arguments-missing');
  if (Boolean(values.ai) === Boolean(values.draft)) throw new KnowledgeError('choose-ai-or-draft');
  if (!values['track-job'] && (values.workspace || values.retry || values['max-attempts'])) throw new KnowledgeError('track-job-required');
  if (values['track-job'] && (!process.env.DATABASE_URL || !values.workspace)) throw new KnowledgeError('database-and-workspace-required');
  const maxAttempts = Number(values['max-attempts'] ?? '3');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new KnowledgeError('invalid-attempt-limit');
  const body = await readInput(values['source-root'], values.source);
  const generator = values.draft ? providedDraft(await readInput(values['source-root'], values.draft))
    : new OpenAIArticleGenerator({ apiKey: process.env.OPENAI_API_KEY ?? '', model: process.env.OPENAI_MODEL });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  try {
    const input = { title: values.title, body, sourceType: (values['source-type'] ?? 'document') as SourceInput['sourceType'],
      sourceUrl: values.url, domain: values.domain, contentMode: (values['capture-scope'] ?? 'full') as SourceInput['contentMode'] };
    const options = { vault: await MarkdownVault.connect(values.vault), generator, signal: controller.signal };
    let result;
    if (values['track-job']) {
      const { createPostgresDatabase } = await import('../packages/database/src/postgres.ts');
      const { ProcessingJobRepository } = await import('../packages/database/src/processing-jobs.ts');
      const database = createPostgresDatabase(process.env.DATABASE_URL!);
      try {
        result = await processSourceJob(input, { ...options, jobs: new ProcessingJobRepository(database), workspaceId: values.workspace!,
          retry: values.retry, maxAttempts });
        if (['failed', 'needs-input', 'needs-review', 'cancelled'].includes(result.status)) process.exitCode = 1;
      } finally { await database.close(); }
    } else result = await processSource(input, options);
    console.log(JSON.stringify(result, null, 2));
  } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await run(process.argv.slice(2)); }
  catch (error) {
    console.error(JSON.stringify({ status: 'failed', reason: error instanceof KnowledgeError ? error.code : 'invalid-input-or-local-io-error' }));
    process.exitCode = 1;
  }
}
