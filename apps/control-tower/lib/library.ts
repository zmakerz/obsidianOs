export type LibraryKind = 'note' | 'code' | 'document';
export interface LibraryItem {
  id: string;
  title: string;
  body: string;
  kind: LibraryKind;
  source: string;
  tags: string[];
  sample: boolean;
  addedAt: number;
  persisted?: boolean;
  path?: string;
  revision?: string;
  obsidianUrl?: string;
}
export const MAX_FILE_BYTES = 2_000_000;
export const MAX_SESSION_BYTES = 10_000_000;
export const MAX_SESSION_FILES = 20;

export function validateFile(name: string, size: number): string | null {
  if (!/\.(md|txt)$/i.test(name)) return '현재는 Markdown(.md)과 텍스트(.txt) 파일을 추가할 수 있습니다.';
  if (!Number.isFinite(size) || size <= 0) return '빈 파일은 추가할 수 없습니다.';
  if (size > MAX_FILE_BYTES) return '파일 한 개는 2 MB 이하여야 합니다.';
  return null;
}
export function decodeSource(bytes: ArrayBuffer): string {
  const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!body.trim() || body.includes('\0')) throw new Error('읽을 수 있는 UTF-8 텍스트가 필요합니다.');
  return body;
}
export function inferKind(body: string): LibraryKind {
  return /^\s*(`{3,}|~{3,})/m.test(body) ? 'code' : 'note';
}
export function filterItems(items: LibraryItem[], query: string, filter: string, sort: string): LibraryItem[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(item => (filter === 'all' || (filter === 'mine' ? !item.sample : item.kind === filter)) &&
    terms.every(term => `${item.title} ${item.source} ${item.tags.join(' ')} ${item.body}`.toLocaleLowerCase().includes(term)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ko') : b.addedAt - a.addedAt);
}
export function fileTitle(name: string): string { return name.replace(/\.(md|txt)$/i, '').trim() || '제목 없는 자료'; }

export const SAMPLE_ITEMS: LibraryItem[] = [
  { id: 'sample-1', title: '정보를 모으는 곳에서, 지식이 자라는 곳으로', kind: 'note', source: '시작 가이드', tags: ['지식 관리', '시작하기'], sample: true, addedAt: 3,
    body: '# 정보를 모으는 곳에서, 지식이 자라는 곳으로\n\n좋은 자료를 발견하는 일만큼, 필요할 때 다시 꺼내 쓰는 일도 중요합니다. 이 자료실은 원문을 보존하고 나에게 유용한 지식으로 연결하는 공간입니다.\n\n## 1. 자료를 한곳에서 살펴보세요\n\n파일을 추가하거나 본문을 붙여넣으면 지금 이 탭에서 읽고 검색할 수 있습니다. 이 글과 나머지 시작 자료는 화면 사용을 위한 예시입니다.\n\n## 2. 원문을 남기고 정리하세요\n\n완성할 흐름은 원문 보존 → 충실한 정리글 → 필요한 지식 연결입니다. 모든 글을 짧게 줄이거나 모든 키워드를 별도 노트로 만들지 않습니다.\n\n## 3. 다시 사용할 수 있도록 연결하세요\n\n설정에서 보관함을 연결하면 저장된 Markdown을 읽고 Obsidian에서 같은 파일을 열 수 있습니다. 원문 저장을 허용하면 파일과 붙여넣은 본문이 보관함에 남습니다. 웹 AI 정리는 아직 지원하지 않습니다.' },
  { id: 'sample-2', title: '원문, 정리글, 위키는 어떻게 다를까요?', kind: 'document', source: '사용 방법', tags: ['원문 보존', 'Article'], sample: true, addedAt: 2,
    body: '# 원문, 정리글, 위키는 어떻게 다를까요?\n\n같은 자료를 세 번 복사하는 구조가 아닙니다. 각각의 목적을 구분하면 문서가 불필요하게 늘어나지 않습니다.\n\n## 원문 · Raw\n\n처음 가져온 내용을 보존합니다. 나중에 출처와 세부 내용을 다시 확인할 수 있어야 합니다.\n\n## 정리글 · Article\n\n원문의 사례, 숫자, 조건과 코드를 살린 읽기 좋은 글입니다. 짧은 요약만을 의미하지 않습니다.\n\n## 재사용 지식 · Wiki\n\n다른 작업에서도 반복해서 사용하는 개념과 연결입니다. 정리글만으로 충분하다면 위키를 만들지 않습니다.\n\n- 원문은 보존합니다.\n- 사람이 수정한 글을 자동으로 덮어쓰지 않습니다.\n- 위키 변경은 실제 차이를 확인한 뒤 반영합니다.' },
  { id: 'sample-3', title: '코드가 담긴 자료도 함께 읽기', kind: 'code', source: 'Markdown 예시', tags: ['개발', '코드'], sample: true, addedAt: 1,
    body: '# 코드가 담긴 자료도 함께 읽기\n\n코드와 설명을 한 문서 안에서 살펴보세요. 파일 추가는 원문을 AI에 전송하지 않습니다.\n\n## 코드 블록\n\n```typescript\nconst sources = ["note.md", "guide.txt"];\n\nfor (const source of sources) {\n  console.log(`읽을 자료: ${source}`);\n}\n```\n\n## 현재 미리보기 범위\n\n제목, 문단, 목록과 코드 블록을 읽기 좋게 표시합니다. HTML과 스크립트는 실행하지 않으며, Obsidian 전용 문법과 첨부 렌더링은 후속 기능입니다.' },
];
