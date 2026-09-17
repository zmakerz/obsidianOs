import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIArticleGenerator, splitSource } from '../src/openai-article.ts';
import type { SourceInput } from '../src/article-types.ts';
const source: SourceInput = { title: '테스트', body: '사례 12개와 조건을 보존합니다.', sourceType: 'note' };
const response = (text: string, extra: Record<string, unknown> = {}) => new Response(JSON.stringify({
  status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 20, output_tokens: 10 }, ...extra,
}), { status: 200 });
const fake = (work: (url: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch => work as typeof fetch;

test('adapter sends bounded request only to OpenAI and returns safe usage', async () => {
  let calls = 0;
  const generator = new OpenAIArticleGenerator({ apiKey: 'test-credential', fetch: fake(async (url, init) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(init?.redirect, 'error');
    const data = JSON.parse(String(init?.body));
    assert.equal(data.store, false); assert.equal(data.tools, undefined); assert.equal(data.max_output_tokens, 8192);
    assert.equal(JSON.parse(data.input).source_text, source.body);
    return response('## 사례\n12개와 조건을 보존합니다.');
  }) });
  const result = await generator.generate(source);
  assert.equal(result.mode, 'ai'); assert.equal(result.model, 'gpt-5.6-terra');
  assert.deepEqual(result.usage, { inputTokens: 20, outputTokens: 10, calls: 1 }); assert.equal(calls, 1);
  assert.ok(!generator.fingerprint.includes('test-credential'));
});

test('long source chunks reassemble exactly, fenced code is not split, every chunk gets processed', async () => {
  const body = ('문장과 숫자 123을 보존합니다.\n\n').repeat(20) + '```ts\nconst n = 123;\n\nconsole.log(n);\n```\n\n' + '끝 문단.\n';
  const chunks = splitSource(body, 180, 20); assert.equal(chunks.join(''), body);
  assert.equal(chunks.filter(c => c.includes('```')).length, 1);
  const received: string[] = [];
  const generator = new OpenAIArticleGenerator({ apiKey: 'test', maxChars: 180, maxCalls: 20, fetch: fake(async (_url, init) => {
    const chunk = JSON.parse(JSON.parse(String(init?.body)).input).source_text;
    received.push(chunk); return response(chunk);
  }) });
  const result = await generator.generate({ ...source, body });
  assert.equal(received.join(''), body); assert.equal(result.usage?.calls, chunks.length); assert.match(result.body, /끝 문단/);
});

test('oversized indivisible block and call budget stop before any API call', async () => {
  const generator = new OpenAIArticleGenerator({ apiKey: 'test', maxChars: 100, maxCalls: 1, fetch: fake(async () => assert.fail('unexpected request')) });
  await assert.rejects(generator.generate({ ...source, body: 'a'.repeat(101) }), /source-block-exceeds-budget/);
  await assert.rejects(generator.generate({ ...source, body: ('a'.repeat(80) + '\n\n').repeat(2) }), /source-exceeds-call-budget/);
});

for (const status of [401, 429, 500]) test('HTTP ' + status + ' is sanitized and never retried automatically', async () => {
  let calls = 0;
  const g = new OpenAIArticleGenerator({ apiKey: 'private-test-value', fetch: fake(async () => { calls++; return new Response('private-test-value and source body', { status }); }) });
  await assert.rejects(g.generate(source), error => {
    assert.equal((error as Error).message, 'openai-http-' + status); return true;
  }); assert.equal(calls, 1);
});

test('truncated/refused/empty responses cannot become Articles', async () => {
  for (const payload of [
    response('partial', { status: 'incomplete' }), response(''),
    response('ignored', { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }),
    response('---\nmodel_yaml: forbidden'), response('body', { usage: undefined }),
  ]) {
    const g = new OpenAIArticleGenerator({ apiKey: 'test', fetch: fake(async () => payload) });
    await assert.rejects(g.generate(source));
  }
});

test('changed or missing source code is rejected; unchanged code passes', async () => {
  const input = { ...source, body: '예제\n\n```js\nconst value = 42;\n```\n' };
  const bad = new OpenAIArticleGenerator({ apiKey: 'test', fetch: fake(async () => response('```js\nconst value = 1;\n```')) });
  await assert.rejects(bad.generate(input), /source-code-not-preserved/);
  const good = new OpenAIArticleGenerator({ apiKey: 'test', fetch: fake(async () => response(input.body)) });
  assert.match((await good.generate(input)).body, /42/);
});

test('network exceptions never disclose key or upstream body', async () => {
  const g = new OpenAIArticleGenerator({ apiKey: 'private-test-value', fetch: fake(async () => { throw new Error('private-test-value'); }) });
  await assert.rejects(g.generate(source), /openai-network-or-response-error/);
});

test('policy fingerprint changes when output-affecting settings change', () => {
  const a = new OpenAIArticleGenerator({ apiKey: 'a' }), b = new OpenAIArticleGenerator({ apiKey: 'b' });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.fingerprint, new OpenAIArticleGenerator({ apiKey: 'a', maxOutputTokens: 4096 }).fingerprint);
});
