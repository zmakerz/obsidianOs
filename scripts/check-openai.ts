// Explicit connectivity check; not part of tests or startup. No source documents are sent.
import { KnowledgeError } from '../packages/knowledge/src/article-types.ts';
const key = process.env.OPENAI_API_KEY?.trim();
try {
  if (!key) throw new KnowledgeError('openai-key-required');
  const model = process.env.OPENAI_MODEL ?? 'gpt-5.6-terra';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', redirect: 'error', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: 'Reply with exactly OK.', reasoning: { effort: 'none' }, max_output_tokens: 32, store: false }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new KnowledgeError('openai-http-' + response.status);
  const payload = await response.json();
  const text = payload.output?.flatMap((item: {content?: {type: string; text?: string}[]}) => item.content ?? [])
    .filter((part: {type: string}) => part.type === 'output_text').map((part: {text?: string}) => part.text ?? '').join('');
  if (payload.status !== 'completed' || text?.trim() !== 'OK') throw new KnowledgeError('unexpected-test-response');
  console.log(JSON.stringify({ status: 'connected', model: payload.model, inputTokens: payload.usage?.input_tokens, outputTokens: payload.usage?.output_tokens }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', reason: error instanceof KnowledgeError ? error.code : 'network-or-response-error' }));
  process.exitCode = 1;
}
