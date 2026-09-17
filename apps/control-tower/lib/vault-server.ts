import { constants } from 'node:fs';
import { lstat, mkdir, open, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { connectVault, type VaultConnection } from '../../../packages/knowledge/src/vault-library.ts';
import { MarkdownVault, renderNote } from '../../../packages/knowledge/src/markdown-vault.ts';
import { KnowledgeError } from '../../../packages/knowledge/src/article-types.ts';

const stateRoot = resolve(process.cwd(), '.business-os');
// Process-local capability; a restart requires a fresh same-origin bootstrap.
const session = randomBytes(32).toString('hex');
export const sessionCookie = `business_os_local=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`;
export function assertLocalRequest(request: Request, write = false) {
  const host = request.headers.get('host') ?? new URL(request.url).host;
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/.test(host) || request.headers.get('x-business-os') !== 'local-v1') throw new KnowledgeError('local-access-required');
  const origin = request.headers.get('origin');
  if ((origin && origin !== 'http://' + host) || request.headers.get('sec-fetch-site') === 'cross-site') throw new KnowledgeError('local-access-required');
  if (write && (origin !== 'http://' + host || !request.headers.get('cookie')?.split(';').some(value => value.trim() === `business_os_local=${session}`))) throw new KnowledgeError('local-session-required');
}
async function stateDirectory() {
  await mkdir(stateRoot, { recursive: true, mode: 0o700 });
  if ((await lstat(stateRoot)).isSymbolicLink()) throw new KnowledgeError('invalid-local-settings');
}
export async function loadConnection(): Promise<VaultConnection | null> {
  try {
    await stateDirectory();
    const handle = await open(resolve(stateRoot, 'vault.json'), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      if ((await handle.stat()).size > 16384) throw new KnowledgeError('invalid-local-settings');
      const saved = JSON.parse(await handle.readFile('utf8'));
      if (saved === null) return null;
      return await connectVault(saved.root, saved.folders, saved.writable === true);
    } finally { await handle.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new KnowledgeError('vault-unavailable');
  }
}
export async function storeConnection(connection: VaultConnection | null) {
  await stateDirectory();
  const file = resolve(stateRoot, 'vault.json');
  const temporary = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  const handle = await open(temporary, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(connection)); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, file);
}
export async function demoConnection(): Promise<VaultConnection> {
  await stateDirectory();
  const root = resolve(stateRoot, 'demo-vault');
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await lstat(root)).isSymbolicLink()) throw new KnowledgeError('invalid-vault-path');
  const vault = await MarkdownVault.connect(root);
  await vault.safePath('20_raw/document/placeholder.md', true);
  // Separate, synthetic documents for trying the UI and taking public screenshots.
  await vault.exclusive(async () => {
    const examples = [
      ['30_wiki/지식을-다시-사용하는-방법.md', '지식을 다시 사용하는 방법', ['지식 관리','시작하기'], '# 지식을 다시 사용하는 방법\n\n좋은 자료를 모으는 것에서 한 걸음 더 나아가, 다음 작업에 다시 활용할 수 있는 지식을 만듭니다.\n\n## 읽고, 정리하고, 연결하기\n\n- 원문은 그대로 보존합니다.\n- 정리글에는 사례와 숫자, 코드를 남깁니다.\n- 반복해서 쓰는 지식만 Wiki로 연결합니다.\n\n## 하나의 보관함\n\n웹에서 가져온 자료는 이 보관함의 Markdown으로 저장됩니다. 같은 폴더를 Obsidian에서 열면 같은 파일을 읽을 수 있습니다.'],
      ['30_wiki/콘텐츠-기획-체크리스트.md', '콘텐츠 기획 체크리스트', ['콘텐츠','마케팅'], '# 콘텐츠 기획 체크리스트\n\n독자가 궁금해하는 질문에서 시작하세요.\n\n## 작성 전\n\n- 어떤 질문에 답하는 글인가요?\n- 설명을 뒷받침할 사례가 있나요?\n- 원문과 내 해석이 구분되나요?\n\n## 검토\n\n독자가 다음 행동을 선택할 수 있도록 구체적인 예시를 남깁니다.'],
      ['30_wiki/코드와-설명-함께-보관하기.md', '코드와 설명 함께 보관하기', ['개발','코드'], '# 코드와 설명 함께 보관하기\n\n실행 조건과 코드를 함께 남기면 다음 작업에서 다시 사용하기 쉽습니다.\n\n```typescript\nconst notes = ["idea.md", "reference.md"];\nconsole.log(`다시 읽을 자료: ${notes.length}개`);\n```\n\n이 예제는 화면 테스트용 합성 자료입니다.'],
    ] as const;
    for (const [path, title, tags, body] of examples) {
      try { await vault.create(path, renderNote({ title, tags: [...tags] }, body)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
  });
  return connectVault(root, ['30_wiki'], true);
}
export async function limitedJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new KnowledgeError('json-required');
  const reader = request.body?.getReader();
  if (!reader) throw new KnowledgeError('invalid-request');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 2_200_000) { await reader.cancel(); throw new KnowledgeError('request-too-large'); }
    chunks.push(part.value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new KnowledgeError('invalid-request'); }
}
