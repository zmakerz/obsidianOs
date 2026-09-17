import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { connectVault, listVault, readVaultEntry, saveVaultSource, validateFolders } from '../../packages/knowledge/src/vault-library.ts';
import { assertLocalRequest, sessionCookie, limitedJson } from '../../apps/control-tower/lib/vault-server.ts';
import { parseNote } from '../../packages/knowledge/src/markdown-vault.ts';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'business-os-web-'));
  await mkdir(join(root, 'notes'));
  await writeFile(join(root, 'notes', 'legacy.md'), '# 기존 노트\n\n원본 유지');
  return root;
}
test('explicit folder scope reads ordinary notes and excludes hidden files and symlinks', async () => {
  const root = await fixture();
  await mkdir(join(root, '.private'));
  await writeFile(join(root, '.private', 'secret.md'), 'not-in-scope');
  await writeFile(join(root, 'outside.md'), 'outside scope');
  await symlink(join(root, '.private'), join(root, 'notes', 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  const connection = await connectVault(root, ['notes']);
  const listed = await listVault(connection);
  assert.equal(listed.items.length, 1);
  const item = await readVaultEntry(connection, listed.items[0].id);
  assert.equal(item.body, '# 기존 노트\n\n원본 유지');
  assert.ok(item.obsidianUrl.startsWith('obsidian://open?path='));
  assert.equal(decodeURIComponent(item.obsidianUrl.split('path=')[1]), connection.root + '/notes/legacy.md');
  assert.equal(await readFile(join(root, 'notes/legacy.md'), 'utf8'), item.body);
  for (const folders of [['../'], ['/'], ['notes/../'], ['.private'], ['node_modules'], ['notes\\x'], ['']]) assert.throws(() => validateFolders(folders));
  await assert.rejects(() => readVaultEntry(connection, '../../outside.md'));
});
test('read-only rejects saves; Raw survives reconnect, deduplicates and protects manual changes', async () => {
  const root = await fixture();
  const body = '# 원문\r\n\r\n수치 3개\r\n```js\nconst count = 3;\n```\n';
  const readOnly = await connectVault(root, ['notes']);
  await assert.rejects(() => saveVaultSource(readOnly, '자료', body), /vault-read-only/);
  const writable = await connectVault(root, ['notes'], true);
  const saved = await saveVaultSource(writable, '자료', body);
  assert.equal(saved.body, body);
  const disk = await readFile(join(root, saved.path), 'utf8');
  assert.equal(parseNote(disk, saved.path).body, body);
  const reconnected = await connectVault(root, ['notes'], true);
  assert.equal((await readVaultEntry(reconnected, saved.id)).body, body);
  const duplicate = await saveVaultSource(reconnected, '다른 표시 제목', body);
  assert.equal(saved.path, duplicate.path);
  assert.equal((await readdir(join(root, '20_raw/document'))).length, 1);
  await writeFile(join(root, saved.path), disk + 'manual change');
  await assert.rejects(() => saveVaultSource(reconnected, '자료', body), /raw-content-conflict/);
  assert.ok((await readFile(join(root, saved.path), 'utf8')).endsWith('manual change'));
});
test('file refresh reads external edits and CRLF frontmatter without mutating legacy notes', async () => {
  const root = await fixture(); const connection = await connectVault(root, ['notes']);
  const id = (await listVault(connection)).items[0].id;
  await writeFile(join(root, 'notes/legacy.md'), '---\r\ntitle: 새 제목\r\ntags: [업데이트]\r\n---\r\n새 내용');
  const item = await readVaultEntry(connection, id);
  assert.equal(item.title, '새 제목'); assert.equal(item.body, '새 내용'); assert.deepEqual(item.tags, ['업데이트']);
  await assert.rejects(() => saveVaultSource({ ...connection, writable: true }, '링크', 'https://example.com'), /source-body-required/);
});
test('local API rejects foreign origins, missing capabilities and sessions', async () => {
  const url = 'http://127.0.0.1:3107/api/vault';
  const headers = { host:'127.0.0.1:3107', origin:'http://127.0.0.1:3107', 'x-business-os':'local-v1', cookie:sessionCookie.split(';')[0] };
  assert.doesNotThrow(() => assertLocalRequest(new Request(url, { headers }), true));
  for (const changed of [{origin:'https://evil.example'}, {host:'evil.example'}, {'x-business-os':''}, {cookie:''}, {'sec-fetch-site':'cross-site'}]) {
    assert.throws(() => assertLocalRequest(new Request(url, {headers:{...headers,...changed}}), true));
  }
  assert.equal((await limitedJson(new Request(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{"action":"demo"}' }))).action, 'demo');
  await assert.rejects(() => limitedJson(new Request(url, {method:'POST', body:'not-json'})), /json-required/);
  await assert.rejects(() => limitedJson(new Request(url, {method:'POST',headers:{'Content-Type':'application/json'},body:'[]'})), /invalid-request/);
});
test('settings and test Vault persist across new processes; disconnect preserves files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'business-os-settings-'));
  const moduleUrl = pathToFileURL(resolve('apps/control-tower/lib/vault-server.ts')).href;
  const run = code => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(moduleUrl)}); ${code}`], {cwd, encoding:'utf8'}));
  const first = run('const c = await m.demoConnection(); await m.storeConnection(c); console.log(JSON.stringify(c));');
  const second = run('console.log(JSON.stringify(await m.loadConnection()));');
  assert.equal(first.root, second.root); assert.equal(first.id, second.id);
  assert.equal(run('await m.storeConnection(null); console.log(JSON.stringify(await m.loadConnection()));'), null);
  assert.equal((await readdir(join(first.root, '30_wiki'))).length, 3);
});
