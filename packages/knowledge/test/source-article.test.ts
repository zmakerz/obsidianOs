import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { MarkdownVault, digest, parseNote, renderNote } from '../src/markdown-vault.ts';
import { processSource, providedDraft } from '../src/source-article.ts';
import type { SourceInput, ArticleGenerator } from '../src/article-types.ts';

const source: SourceInput = { title: '한글 자료: 코드와 수치', body: '# 원문\r\n\r\n12개 예시, 30분.\r\n\r\n```ts\r\nconst x = 42;\r\n```\r\n', sourceType: 'web', sourceUrl: 'https://example.com/source', domain: 'general' };
const now = new Date('2026-09-17T01:00:00Z');
async function fixture(t: test.TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'business-os-article-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = resolve(root, 'vault'); await mkdir(path);
  const vault = await MarkdownVault.connect(path);
  return { root, path, vault };
}
const generator = (): ArticleGenerator => providedDraft('# 정리글\n\n12개 예시를 30분 동안 검토합니다.\n');

test('Raw keeps exact UTF-8/CRLF, Article has lineage, one daily log; repeated request makes no call', async t => {
  const f = await fixture(t); let calls = 0;
  const g = generator(); const generate = g.generate;
  g.generate = async (...args) => { calls++; return generate(...args); };
  const first = await processSource(source, { vault: f.vault, generator: g, now });
  assert.equal(first.status, 'created');
  const raw = parseNote(await f.vault.read(first.raw.path), first.raw.path);
  assert.equal(raw.body, source.body); assert.equal(raw.metadata.content_hash, digest(source.body));
  const article = parseNote(await f.vault.read(first.article.path), first.article.path);
  assert.equal(article.metadata.generation_mode, 'provided-draft'); assert.equal(article.metadata.raw_id, first.raw.id);
  assert.equal(article.metadata.review, 'pending');
  const before = await f.vault.read('90_logs/2026-09-17.md');
  const again = await processSource({ ...source, title: '새 표시 제목' }, { vault: f.vault, generator: g, now: new Date('2026-09-18T01:00:00Z') });
  assert.equal(again.status, 'existing'); assert.equal(calls, 1);
  assert.equal(await f.vault.read('90_logs/2026-09-17.md'), before);
  assert.deepEqual(await readdir(resolve(f.path, '90_logs')), ['2026-09-17.md']);
  assert.deepEqual((await readdir(f.path)).sort(), ['20_raw', '80_outputs', '90_logs']);
});

test('document identity survives renaming; no duplicate Article', async t => {
  const f = await fixture(t), g = generator();
  const result = await processSource(source, { vault: f.vault, generator: g, now });
  if (result.status === 'needs-input') return assert.fail();
  const renamed = '80_outputs/articles/renamed.md';
  await rename(resolve(f.path, result.article.path), resolve(f.path, renamed));
  const again = await processSource(source, { vault: f.vault, generator: g, now });
  assert.equal(again.status, 'existing');
  assert.equal(again.article.id, result.article.id); assert.equal(again.article.path, renamed);
});

test('same URL with changed body creates a separate immutable snapshot', async t => {
  const f = await fixture(t), g = generator();
  const first = await processSource(source, { vault: f.vault, generator: g, now });
  if (first.status === 'needs-input') return assert.fail();
  const before = await f.vault.read(first.raw.path);
  const second = await processSource({ ...source, body: source.body + '추가 사례\n' }, { vault: f.vault, generator: g, now });
  if (second.status === 'needs-input') return assert.fail();
  assert.notEqual(first.raw.id, second.raw.id); assert.equal(await f.vault.read(first.raw.path), before);
});

test('missing body and bare URL require input without files or AI calls', async t => {
  const f = await fixture(t); const g: ArticleGenerator = { fingerprint: 'test', async generate() { assert.fail('must not call'); } };
  for (const body of ['', '   ', 'https://example.com/watch']) {
    assert.deepEqual(await processSource({ ...source, body }, { vault: f.vault, generator: g, now }), { status: 'needs-input', reason: 'source-body-required' });
  }
  assert.deepEqual(await readdir(f.path), []);
});

test('failed generator leaves Raw intact and retry reuses it', async t => {
  const f = await fixture(t); let attempts = 0;
  const g: ArticleGenerator = { fingerprint: 'retry-test', async generate() { if (++attempts === 1) throw new Error('fixture failure'); return { body: '완료', mode: 'provided-draft' }; } };
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /fixture failure/);
  assert.deepEqual(await readdir(f.path), ['20_raw']);
  const files = await readdir(resolve(f.path, '20_raw/web'));
  const before = await readFile(resolve(f.path, '20_raw/web', files[0]));
  assert.equal((await processSource(source, { vault: f.vault, generator: g, now })).status, 'created');
  assert.deepEqual(await readFile(resolve(f.path, '20_raw/web', files[0])), before);
  assert.equal((await readdir(resolve(f.path, '20_raw/web'))).length, 1);
});

test('hand-edited Article is preserved and blocks silent regeneration', async t => {
  const f = await fixture(t), g = generator();
  const first = await processSource(source, { vault: f.vault, generator: g, now });
  if (first.status === 'needs-input') return assert.fail();
  const content = await f.vault.read(first.article.path) + '\n내가 직접 수정한 문장';
  await writeFile(resolve(f.path, first.article.path), content);
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /article-edited-or-conflicting/);
  assert.equal(await f.vault.read(first.article.path), content);
});

test('Raw edits during model call stop Article creation without undoing user edits', async t => {
  const f = await fixture(t);
  const g: ArticleGenerator = { fingerprint: 'edit-raw', async generate() {
    const files = await readdir(resolve(f.path, '20_raw/web'));
    await writeFile(resolve(f.path, '20_raw/web', files[0]), '사용자 수정');
    return { body: '결과', mode: 'provided-draft' };
  } };
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /raw-changed-during-processing/);
  assert.deepEqual(await readdir(f.path), ['20_raw']);
});

test('existing Raw tampering and duplicate IDs fail closed', async t => {
  const f = await fixture(t), g = generator();
  const first = await processSource(source, { vault: f.vault, generator: g, now });
  if (first.status === 'needs-input') return assert.fail();
  const raw = await f.vault.read(first.raw.path);
  await writeFile(resolve(f.path, '20_raw/web/copy.md'), raw);
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /duplicate-document-id/);
  await rm(resolve(f.path, '20_raw/web/copy.md'));
  await writeFile(resolve(f.path, first.raw.path), raw + 'changed');
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /raw-content-conflict/);
});

test('concurrent writers are rejected and cancellation leaves no partial Article', async t => {
  const f = await fixture(t); let release!: () => void, ready!: () => void;
  const started = new Promise<void>(r => ready = r), wait = new Promise<void>(r => release = r);
  const controller = new AbortController();
  const g: ArticleGenerator = { fingerprint: 'concurrent', async generate() { ready(); await wait; return { body: 'result', mode: 'provided-draft' }; } };
  const first = processSource(source, { vault: f.vault, generator: g, signal: controller.signal, now });
  await started;
  await assert.rejects(processSource(source, { vault: f.vault, generator: generator(), now }), /vault-busy-or-interrupted/);
  controller.abort(); release(); await assert.rejects(first);
  assert.deepEqual(await readdir(f.path), ['20_raw']);
});

test('symlink output directories and escaping paths never write outside Vault', async t => {
  const f = await fixture(t); const external = resolve(f.root, 'outside'); await mkdir(external);
  await symlink(external, resolve(f.path, '20_raw'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(processSource(source, { vault: f.vault, generator: generator(), now }), /symlink-not-allowed/);
  assert.deepEqual(await readdir(external), []);
  await assert.rejects(f.vault.create('../escape.md', 'x'), /path-outside-vault/);
});

test('atomic create refuses overwrite and does not leave a temporary file', async t => {
  const f = await fixture(t); await f.vault.create('data/a.md', 'original');
  await assert.rejects(f.vault.create('data/a.md', 'replacement'), { code: 'EEXIST' });
  assert.equal(await f.vault.read('data/a.md'), 'original');
  assert.deepEqual(await readdir(resolve(f.path, 'data')), ['a.md']);
});

test('unsafe metadata and invalid scope fail before writing', async t => {
  const f = await fixture(t);
  for (const change of [{ domain: '../private' }, { title: 'bad\nvalue' }, { sourceUrl: 'file:///secret' }, { contentMode: 'pointer' }]) {
    await assert.rejects(processSource({ ...source, ...change } as SourceInput, { vault: f.vault, generator: generator(), now }));
  }
  assert.deepEqual(await readdir(f.path), []);
});

test('CLI provided-draft mode runs without API key and refuses outside source', async t => {
  const f = await fixture(t); const inputs = resolve(f.root, 'input'); await mkdir(inputs);
  const src = resolve(inputs, 'source.md'), draft = resolve(inputs, 'draft.md');
  await writeFile(src, source.body); await writeFile(draft, '# 정리\n12개');
  const script = resolve(import.meta.dirname, '../../../scripts/process-source.ts');
  const args = [script, '--', '--vault', f.path, '--source-root', inputs, '--source', src, '--draft', draft, '--title', source.title];
  const env = { ...process.env }; delete env.OPENAI_API_KEY;
  const good = spawnSync(process.execPath, args, { env, encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr); assert.equal(JSON.parse(good.stdout).status, 'created');
  assert.equal(await readFile(src, 'utf8'), source.body);
  const bad = spawnSync(process.execPath, [...args, '--ai'], { env, encoding: 'utf8' });
  assert.equal(bad.status, 1); assert.match(bad.stderr, /choose-ai-or-draft/);
  const outside = spawnSync(process.execPath, [script, '--vault', f.path, '--source-root', f.path, '--source', src, '--draft', draft, '--title', 'x'], { env, encoding: 'utf8' });
  assert.equal(outside.status, 1); assert.match(outside.stderr, /input-outside-source-root/);
});

test('completed Article with a failed daily-log write is recovered without another generator call', async t => {
  const f = await fixture(t); let calls = 0;
  const g: ArticleGenerator = { fingerprint: 'log-recovery', async generate() { calls++; return { body: '완료된 정리글', mode: 'provided-draft' }; } };
  await writeFile(resolve(f.path, '90_logs'), 'blocking fixture');
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }));
  assert.equal(calls, 1);
  await rm(resolve(f.path, '90_logs'));
  const recovered = await processSource(source, { vault: f.vault, generator: g, now });
  assert.equal(recovered.status, 'existing'); assert.equal(calls, 1);
  assert.match(await f.vault.read('90_logs/2026-09-17.md'), /event:article-/);
});

test('document dates cannot redirect a daily log into another folder', async t => {
  const f = await fixture(t);
  await assert.rejects(f.vault.appendEvent('../20_raw/overwrite', 'article-' + 'a'.repeat(64), 'raw-' + 'b'.repeat(64), 'article-' + 'a'.repeat(64)), /invalid-log-event/);
  assert.deepEqual(await readdir(f.path), []);
});

test('a pre-existing interrupted lock is not silently stolen', async t => {
  const f = await fixture(t); await writeFile(resolve(f.path, '.business-os-write.lock'), 'interrupted owner');
  await assert.rejects(processSource(source, { vault: f.vault, generator: generator(), now }), /vault-busy-or-interrupted/);
  assert.equal(await readFile(resolve(f.path, '.business-os-write.lock'), 'utf8'), 'interrupted owner');
});

test('Raw rename is found by ID but a stale Article link requires review', async t => {
  const f = await fixture(t), g = generator();
  const first = await processSource(source, { vault: f.vault, generator: g, now });
  if (first.status === 'needs-input') return assert.fail();
  const before = await f.vault.read(first.article.path);
  await rename(resolve(f.path, first.raw.path), resolve(f.path, '20_raw/web/renamed.md'));
  await assert.rejects(processSource(source, { vault: f.vault, generator: g, now }), /lineage-link-needs-review/);
  assert.equal(await f.vault.read(first.article.path), before);
});

test('generated Raw, Article and daily log pass the actual Vault linter', async t => {
  const f = await fixture(t);
  for (const name of ['capture', 'knowledge', 'sop', 'daily-log']) {
    await f.vault.create('00_system/templates/' + name + '.md', '# Template');
  }
  const metadata = { kind: 'navigation', status: 'active', created: '2026-09-17', updated: '2026-09-17' };
  await f.vault.create('00_system/OPERATING_RULES.md', renderNote(metadata, '# Rules'));
  await f.vault.create('40_navigation/HOME.md', renderNote(metadata, '# HOME'));
  await processSource(source, { vault: f.vault, generator: generator(), now });
  const lint = spawnSync(process.execPath, [resolve(import.meta.dirname, '../../../scripts/vault-lint.mjs'), '--vault', f.path], { encoding: 'utf8' });
  assert.equal(lint.status, 0, lint.stderr); assert.match(lint.stdout, /Vault lint passed/);
});
