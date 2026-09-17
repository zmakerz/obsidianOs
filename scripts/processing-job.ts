import { parseArgs } from 'node:util';
import { createPostgresDatabase } from '../packages/database/src/postgres.ts';
import { ProcessingJobRepository } from '../packages/database/src/processing-jobs.ts';

try {
  const argv = process.argv.slice(2);
  const { values, tokens } = parseArgs({ args: argv[0] === '--' ? argv.slice(1) : argv, strict: true, allowPositionals: false, tokens: true,
    options: { workspace: { type: 'string' }, job: { type: 'string' }, cancel: { type: 'boolean' }, help: { type: 'boolean' } } });
  const names = tokens.filter(t => t.kind === 'option').map(t => t.name);
  if (new Set(names).size !== names.length) throw new Error('duplicate-option');
  if (values.help) console.log('Usage: pnpm knowledge:job --workspace <id> [--job <id> [--cancel]]. Lists the latest 50 jobs, or reads status/attempts/events/usage for one. Cancel is cooperative; running work is not reclaimed.');
  else {
    if (!process.env.DATABASE_URL || !values.workspace || (values.cancel && !values.job)) throw new Error('database-workspace-job-required');
    const database = createPostgresDatabase(process.env.DATABASE_URL);
    try {
      const jobs = new ProcessingJobRepository(database);
      if (values.cancel) await jobs.cancel(values.workspace, values.job!);
      const result = values.job ? await jobs.inspect(values.workspace, values.job) : await jobs.list(values.workspace);
      console.log(JSON.stringify(result ?? { status: 'not-found' }, null, 2));
      if (!result) process.exitCode = 1;
    } finally { await database.close(); }
  }
} catch {
  console.error(JSON.stringify({ status: 'failed', reason: 'job-command-failed-check-arguments-and-database' }));
  process.exitCode = 1;
}
