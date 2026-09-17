import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSource, fileTitle, filterItems, inferKind, MAX_FILE_BYTES, SAMPLE_ITEMS, validateFile } from '../../apps/control-tower/lib/library.ts';

test('file intake rejects unsupported, empty and over-limit files', () => {
  assert.equal(validateFile('source.MD', MAX_FILE_BYTES), null);
  for (const [name, size] of [['x.pdf', 100], ['x.txt', 0], ['x.md', MAX_FILE_BYTES + 1], ['x.md', NaN]]) assert.ok(validateFile(name, size));
  assert.equal(fileTitle('자료 이름.md'), '자료 이름');
});
test('UTF-8 import retains source text and rejects corrupt or binary content', () => {
  const text = '# 제목\r\n\r\n<script>alert(1)</script>\n```ts\nx = 3;\n```';
  assert.equal(decodeSource(new TextEncoder().encode(text).buffer), text);
  assert.throws(() => decodeSource(new Uint8Array([0xff, 0xfe, 0xfa]).buffer));
  assert.throws(() => decodeSource(new TextEncoder().encode('a\0b').buffer));
  assert.throws(() => decodeSource(new TextEncoder().encode('  \n').buffer));
  assert.equal(inferKind(text), 'code');
  assert.equal(inferKind('일반 글'), 'note');
});
test('library search combines title/body/tags without modifying source order', () => {
  const custom = { ...SAMPLE_ITEMS[0], id: 'local', sample: false, title: '새 자료', body: '업로드한 실제 본문', tags: ['검토'], addedAt: 10 };
  const items = [...SAMPLE_ITEMS, custom];
  assert.deepEqual(filterItems(items, '검토 실제', 'mine', 'recent').map(item => item.id), ['local']);
  assert.equal(filterItems(items, '없는검색어', 'all', 'recent').length, 0);
  assert.equal(filterItems(items, '', 'code', 'recent').length, 1);
  assert.equal(filterItems(items, '', 'all', 'recent')[0].id, 'local');
  assert.equal(items[0].id, SAMPLE_ITEMS[0].id);
});
