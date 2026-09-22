// Isolated integration-test subprocess. No real API calls or production fault flags.
import { createPostgresDatabase } from '../src/postgres.ts';
import { ProcessingJobRepository } from '../src/processing-jobs.ts';
import { MarkdownVault } from '../../knowledge/src/markdown-vault.ts';
import { processSourceJob } from '../../knowledge/src/process-job.ts';
import { OpenAIArticleGenerator } from '../../knowledge/src/openai-article.ts';
import { providedDraft } from '../../knowledge/src/source-article.ts';

const database = createPostgresDatabase(process.env.TEST_DATABASE_URL!);
const boundary = async (name: string) => {
  if (name === process.argv[3]) {
    process.send?.({ boundary: name });
    await new Promise<void>(() => {});
  }
};
try {
  const generator = process.argv[4] === 'draft' ? providedDraft('Synthetic supplied result.') : new OpenAIArticleGenerator({ apiKey: 'synthetic-fixture', model: 'fixture-model', maxChars: 100,
    fetch: async () => {
      await database.query('INSERT INTO recovery_probe DEFAULT VALUES');
      await boundary('http:effect');
      return Response.json({ status: 'completed', usage: { input_tokens: 12, output_tokens: 4 },
        output: [{ type: 'message', content: [{ type: 'output_text', text: 'Synthetic segment result.' }] }] });
    },
  });
  const result = await processSourceJob({ title: 'Recovery fixture', body: 'a'.repeat(80) + '\n\n' + 'b'.repeat(80), sourceType: 'document' },
    { vault: await MarkdownVault.connect(process.argv[2]), jobs: new ProcessingJobRepository(database), generator, workspaceId: 'a', resume: true, boundary });
  console.log(JSON.stringify(result));
} finally { await database.close(); }
