import test from 'node:test';
import assert from 'node:assert/strict';
import { vaultRequest } from '../../apps/control-tower/lib/vault-client.ts';

test('a stalled write is bounded and reports uncertain outcome without retry', async () => {
  let calls = 0;
  const fetcher = async (_url, init) => {
    calls++;
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.headers['x-business-os'], 'local-v1');
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  };
  await assert.rejects(vaultRequest({ action: 'save' }, undefined, undefined, { fetcher, timeoutMs: 5 }), /처리 결과를 확인하지 못했습니다.*저장 여부/);
  assert.equal(calls, 1);
});
test('deadline also covers a stalled body and read failures can be retried explicitly', async () => {
  const fetcher = async (_url, init) => ({ ok: true, json: () => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) });
  await assert.rejects(vaultRequest(undefined, 'id', 'connection', { fetcher, timeoutMs: 5 }), /응답 대기 시간이 초과됐습니다/);
  const result = await vaultRequest(undefined, 'a/b', 'c d', { fetcher: async (url, init) => {
    assert.equal(url, '/api/vault?id=a%2Fb&connection=c%20d');
    assert.equal(init.method, 'GET');
    return Response.json({ item: { title: 'recovered' } });
  } });
  assert.equal(result.item.title, 'recovered');
});
test('network/non-JSON errors are actionable and server details stay out of messages', async () => {
  for (const fetcher of [async () => { throw new TypeError('private path'); }, async () => new Response('<html>private path</html>', { status: 500 })]) {
    await assert.rejects(vaultRequest(undefined, undefined, undefined, { fetcher }), error => error.message.includes('로컬 서버') && !error.message.includes('private path'));
  }
  await assert.rejects(vaultRequest(undefined, undefined, undefined, { fetcher: async () => Response.json({ error: 'vault-read-only' }, { status: 400 }) }), /읽기 전용/);
  await assert.rejects(vaultRequest(undefined, undefined, undefined, { fetcher: async () => Response.json({ error: '/private/path' }, { status: 500 }) }), error => error.message.includes('500') && !error.message.includes('/private/path'));
});
