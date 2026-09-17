'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decodeSource, fileTitle, filterItems, inferKind, MAX_FILE_BYTES, MAX_SESSION_BYTES, MAX_SESSION_FILES, SAMPLE_ITEMS, validateFile, type LibraryItem } from '@/lib/library';
import { API_ERRORS, vaultRequest } from '@/lib/vault-client';
import './workspace.css';

type IconName = 'library' | 'plus' | 'search' | 'upload' | 'file' | 'code' | 'settings' | 'arrow' | 'close' | 'grid' | 'list' | 'check' | 'folder' | 'clock' | 'external';
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    library: <><path d="M4 4h4v16H4zM11 4h4v16h-4zM18 4l3 15" /></>,
    plus: <path d="M12 5v14M5 12h14" />, search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" /></>,
    file: <path d="M14 3H5v18h14V8l-5-5v5h5M8 12h8M8 16h5" />,
    code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-12-2 18" />,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />, close: <path d="m6 6 12 12M6 18 18 6" />,
    grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" />,
    check: <path d="m4 12 5 5L20 6" />, folder: <path d="M3 6h7l2 3h9v11H3V6z" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
    external: <path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
const KIND_LABELS = { note: '노트', code: '코드', document: '문서' };
interface VaultConnection { id: string; root: string; name: string; folders: string[]; writable: boolean }
const byteSize = (text: string) => new TextEncoder().encode(text).length;

function MarkdownPreview({ body }: { body: string }) {
  const elements: ReactNode[] = [];
  const lines = body.slice(0, 50_000).split(/\r?\n/);
  let code: string[] | null = null, marker = '', paragraph: string[] = [], list: string[] = [];
  const flush = () => {
    if (paragraph.length) { elements.push(<p key={elements.length}>{paragraph.join('\n')}</p>); paragraph = []; }
    if (list.length) { elements.push(<ul key={elements.length}>{list.map((line, i) => <li key={i}>{line}</li>)}</ul>); list = []; }
  };
  for (const line of lines) {
    const fence = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (code) {
      if (fence && fence[1][0] === marker[0] && fence[1].length >= marker.length && !fence[2].trim()) {
        elements.push(<pre key={elements.length}><code>{code.join('\n')}</code></pre>); code = null;
      } else code.push(line);
      continue;
    }
    if (fence) { flush(); code = []; marker = fence[1]; continue; }
    const heading = /^(#{1,6})\s+(.+)/.exec(line);
    if (heading) { flush(); elements.push(heading[1].length === 1 ? <h2 key={elements.length}>{heading[2]}</h2> : <h3 key={elements.length}>{heading[2]}</h3>); }
    else if (/^\s*[-*+]\s+/.test(line)) { if (paragraph.length) flush(); list.push(line.replace(/^\s*[-*+]\s+/, '')); }
    else if (!line.trim()) flush();
    else { if (list.length) flush(); paragraph.push(line); }
  }
  flush();
  if (code) elements.push(<pre key={elements.length}><code>{code.join('\n')}</code></pre>);
  return <div className="kw-prose">{elements}{body.length > 50_000 && <p className="kw-notice">미리보기는 앞 50,000자까지 표시합니다. 전체 본문은 다운로드할 수 있습니다.</p>}</div>;
}

export default function KnowledgeWorkspace() {
  const [items, setItems] = useState<LibraryItem[]>(SAMPLE_ITEMS);
  const [section, setSection] = useState('library');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [removed, setRemoved] = useState<LibraryItem | null>(null);
  const [readerMode, setReaderMode] = useState('read');
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState('file');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [comfortable, setComfortable] = useState(true);
  const [connection, setConnection] = useState<VaultConnection | null>(null);
  const [vaultPath, setVaultPath] = useState('');
  const [folderScope, setFolderScope] = useState('.');
  const [writeAllowed, setWriteAllowed] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(true);
  const [serverError, setServerError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [readBusy, setReadBusy] = useState(false);
  const busyRef = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const reader = useRef<HTMLElement>(null);
  const readGeneration = useRef(0);
  const mine = items.filter(item => !item.sample);
  const visible = useMemo(() => filterItems(items, query, filter, sort), [items, query, filter, sort]);

  function acceptListing(result: { connection: VaultConnection | null; items: LibraryItem[]; warnings?: string[]; truncated?: boolean }) {
    setConnection(result.connection); setItems(result.connection ? result.items : SAMPLE_ITEMS);
    setWarnings([...(result.warnings ?? []), ...(result.truncated ? ['최대 300개 문서·3,000개 항목까지만 조회했습니다. 설정에서 폴더 범위를 좁혀주세요.'] : [])]);
    if (result.connection) { setVaultPath(result.connection.root); setFolderScope(result.connection.folders.join(', ')); setWriteAllowed(result.connection.writable); }
    setSelected(null); setRemoved(null); setReadBusy(false); readGeneration.current += 1;
  }
  useEffect(() => {
    let mounted = true;
    vaultRequest().then(result => { if (mounted) acceptListing(result); }).catch(error => { if (mounted) setServerError(error.message); }).finally(() => { if (mounted) setConnectionBusy(false); });
    return () => { mounted = false; };
  }, []);
  async function refreshVault() {
    if (connectionBusy || busyRef.current) return;
    setConnectionBusy(true); setServerError('');
    try { acceptListing(await vaultRequest()); setNotice('보관함의 현재 파일을 다시 읽었습니다.'); }
    catch (error) { setServerError((error as Error).message); }
    finally { setConnectionBusy(false); }
  }
  async function configureVault(action: 'connect' | 'demo' | 'disconnect') {
    if (connectionBusy || busyRef.current) return;
    if (mine.some(item => !item.persisted)) { setServerError('아직 저장하지 않은 탭 자료가 있습니다. 먼저 다운로드하거나 목록에서 빼주세요.'); return; }
    setConnectionBusy(true); setServerError('');
    try {
      // Refresh the local session after a service restart before attempting a write.
      try { await vaultRequest(); } catch { /* A stale path can still be replaced after bootstrap. */ }
      acceptListing(await vaultRequest({ action, root: vaultPath, folders: folderScope.split(',').map(value => value.trim()).filter(Boolean), writable: writeAllowed }));
      setQuery(''); setFilter('all'); setNotice(action === 'disconnect' ? '연결만 해제했습니다. 파일은 그대로 있습니다.' : '보관함을 연결했습니다. 자료실에서 저장된 문서를 읽을 수 있습니다.');
      if (action !== 'disconnect') setSection('library');
    } catch (error) { setServerError((error as Error).message); }
    finally { setConnectionBusy(false); }
  }

  useEffect(() => { if (addOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [addOpen]);
  useEffect(() => { if (selected) reader.current?.focus(); }, [selected]);
  useEffect(() => {
    if (!mine.some(item => !item.persisted)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [mine.length]);

  function openAdd() { setError(''); setNotice(''); setAddOpen(true); }
  async function openItem(item: LibraryItem) {
    setReaderMode('read'); setServerError('');
    const generation = ++readGeneration.current;
    if (!item.persisted) { setSelected(item); return; }
    setReadBusy(true);
    try { const result = await vaultRequest(undefined, item.id, connection?.id); if (generation === readGeneration.current) setSelected(result.item); }
    catch (error) { if (generation === readGeneration.current) setServerError((error as Error).message); }
    finally { if (generation === readGeneration.current) setReadBusy(false); }
  }
  function navigate(next: string) { readGeneration.current += 1; setReadBusy(false); setSection(next); setSelected(null); setNotice(''); }

  async function importFiles(files: File[]) {
    if (busyRef.current) return;
    setError('');
    if (!files.length) return;
    if (connectionBusy) { setError('연결 확인이 끝난 뒤 다시 추가해주세요.'); return; }
    if (connection && !connection.writable) { setError(API_ERRORS['vault-read-only']); return; }
    if ((connection ? 0 : mine.length) + files.length > MAX_SESSION_FILES) { setError(connection ? '한 번에 최대 20개까지 저장할 수 있습니다.' : '한 탭에 최대 20개까지 추가할 수 있습니다. 파일 수를 줄여주세요.'); return; }
    if (files.reduce((sum, file) => sum + file.size, 0) + (connection ? 0 : mine.reduce((sum, item) => sum + byteSize(item.body), 0)) > MAX_SESSION_BYTES) {
      setError(connection ? '한 번에 합계 10 MB까지 저장할 수 있습니다.' : '한 탭의 자료는 합계 10 MB까지 미리볼 수 있습니다.'); return;
    }
    busyRef.current = true; setBusy(true);
    const added: LibraryItem[] = [], errors: string[] = [];
    try {
      for (const file of files) {
        const invalid = validateFile(file.name, file.size);
        if (invalid) { errors.push(`${file.name}: ${invalid}`); continue; }
        try {
          const content = decodeSource(await file.arrayBuffer());
          if ([...(connection ? [] : items), ...added].some(item => item.body === content)) { errors.push(`${file.name}: 같은 내용의 자료가 이미 있습니다.`); continue; }
          if (connection) {
            const result = await vaultRequest({ action: 'save', connectionId: connection.id, title: fileTitle(file.name), body: content });
            added.push(result.item);
          } else added.push({ id: crypto.randomUUID(), title: fileTitle(file.name), body: content, kind: inferKind(content), source: file.name, tags: ['직접 추가'], sample: false, addedAt: Date.now() });
        } catch (error) { errors.push(`${file.name}: ${error instanceof TypeError ? 'UTF-8 텍스트 파일인지 확인해주세요.' : (error as Error).message}`); }
      }
      if (added.length) {
        setItems(current => [...added, ...current.filter(item => !added.some(saved => saved.id === item.id))]); setFilter('mine'); setQuery(''); setSection('library');
        setNotice(connection ? `${added.length}개 자료를 보관함에 원문으로 저장했습니다. 같은 원문은 기존 파일을 재사용합니다.` : `${added.length}개 자료를 이 탭에 추가했습니다. Vault에는 아직 저장되지 않았습니다.`);
        if (!errors.length) setAddOpen(false);
      }
      setError(errors.join('\n'));
    } finally { busyRef.current = false; setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  async function addText() {
    if (busyRef.current || connectionBusy) return;
    if (connection && !connection.writable) { setError(API_ERRORS['vault-read-only']); return; }
    setError('');
    if (!title.trim() || !body.trim()) { setError('제목과 본문을 입력해주세요.'); return; }
    if (body.includes('\0')) { setError('읽을 수 있는 텍스트를 입력해주세요.'); return; }
    if (byteSize(body) > MAX_FILE_BYTES || (!connection && mine.length >= MAX_SESSION_FILES) || byteSize(body) + (connection ? 0 : mine.reduce((sum, item) => sum + byteSize(item.body), 0)) > MAX_SESSION_BYTES) {
      setError('자료 한 개 2 MB, 한 탭 20개·합계 10 MB 이내로 추가해주세요.'); return;
    }
    if (!connection && items.some(item => item.body === body)) { setError('같은 내용의 자료가 이미 있습니다.'); return; }
    busyRef.current = true; setBusy(true);
    try {
    const item: LibraryItem = connection ? (await vaultRequest({ action: 'save', connectionId: connection.id, title: title.trim(), body })).item : { id: crypto.randomUUID(), title: title.trim(), body, kind: inferKind(body), source: '본문 붙여넣기', tags: ['직접 추가'], sample: false, addedAt: Date.now() };
    setItems(current => [item, ...current.filter(existing => existing.id !== item.id)]); setTitle(''); setBody(''); setAddOpen(false); setFilter('mine'); setQuery(''); setSection('library');
    setNotice(connection ? '보관함에 원문을 저장했습니다. 새로고침 후에도 같은 파일을 읽을 수 있습니다.' : '이 탭에 자료를 추가했습니다. Vault에는 아직 저장되지 않았습니다.');
    } catch (error) { setError((error as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function updateDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.sample || selected.persisted) return;
    const values = new FormData(event.currentTarget);
    const nextTitle = String(values.get('title') ?? '').trim();
    if (!nextTitle) return;
    const updated = { ...selected, title: nextTitle.slice(0, 180), tags: [...new Set(String(values.get('tags') ?? '').split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 8) };
    setItems(current => current.map(item => item.id === updated.id ? updated : item)); setSelected(updated);
    setNotice('이 탭의 제목과 태그를 변경했습니다. 원본 파일은 그대로입니다.');
  }
  function removeItem() {
    if (!selected || selected.sample || selected.persisted) return;
    setRemoved(selected); setItems(current => current.filter(item => item.id !== selected.id)); setSelected(null);
    setNotice('이 탭의 목록에서 제외했습니다. 원본 파일은 삭제하지 않았습니다.');
  }
  function undoRemove() {
    if (!removed) return;
    if ((!connection && mine.length >= MAX_SESSION_FILES) || byteSize(removed.body) + (connection ? 0 : mine.reduce((sum, item) => sum + byteSize(item.body), 0)) > MAX_SESSION_BYTES) {
      setNotice('자료 수 또는 용량 한도에 도달했습니다. 다른 자료를 제외한 뒤 원본을 다시 추가해주세요.'); return;
    }
    setItems(current => [removed, ...current]); setRemoved(null); setNotice('목록에 다시 추가했습니다.');
  }

  function download(item: LibraryItem) {
    const url = URL.createObjectURL(new Blob([item.body], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${item.title.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').slice(0, 100) || 'document'}.md`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className={`kw-app ${comfortable ? '' : 'kw-compact'}`}>
    <a className="kw-skip" href="#workspace-main">본문으로 이동</a>
    <aside className="kw-sidebar">
      <a href="/" className="kw-brand"><span className="kw-logo">b<span>o</span></span><span>Business OS<small>YOUR KNOWLEDGE, CONNECTED</small></span></a>
      <div className="kw-space"><span className="kw-avatar">W</span><div>{connection?.name ?? '내 작업 공간'}<small>{connection ? '연결된 Markdown Vault' : '로컬 미리보기'}</small></div><span className="kw-live" /></div>
      <button className="kw-button kw-primary kw-add" onClick={openAdd}><Icon name="plus" />자료 추가</button>
      <p className="kw-nav-label">WORKSPACE</p>
      <nav aria-label="주요 메뉴">
        <button className={section === 'library' ? 'active' : ''} onClick={() => navigate('library')} aria-current={section === 'library' ? 'page' : undefined}><Icon name="library" />자료실<span>{items.length}</span></button>
        <button className={section === 'activity' ? 'active' : ''} onClick={() => navigate('activity')} aria-current={section === 'activity' ? 'page' : undefined}><Icon name="clock" />작업·검토</button>
        <button className={section === 'settings' ? 'active' : ''} onClick={() => navigate('settings')} aria-current={section === 'settings' ? 'page' : undefined}><Icon name="settings" />설정</button>
      </nav>
      <div className="kw-connection"><span className="kw-vault-icon"><Icon name="folder" /></span><strong>Obsidian과 같은 공간</strong><p>하나의 보관함에서<br />읽고, 정리하고, 연결하세요.</p><button onClick={() => navigate('settings')}>연결 준비 확인 <Icon name="arrow" size={16} /></button></div>
      <div className="kw-sidebar-bottom"><span className="kw-dot" />{connection ? (connection.writable ? '읽기·원문 저장' : '읽기 전용') : 'Vault 연결 전'}<a href="/operations">운영 데모 <Icon name="external" size={13} /></a></div>
    </aside>

    <div className="kw-main-wrap">
      <header className="kw-topbar"><span>작업 공간 <span className="kw-slash">/</span> <strong>{section === 'library' ? '자료실' : section === 'activity' ? '작업·검토' : '설정'}</strong></span><span className="kw-preview-label">{connection ? 'CONNECTED' : 'PREVIEW'} <span>웹 자료실</span></span></header>
      <main id="workspace-main" className="kw-main">
        <div className="kw-page-heading"><div><p className="kw-eyebrow">{section === 'library' ? 'A SPACE FOR YOUR IDEAS' : 'YOUR WORKSPACE'}</p><h1>{section === 'library' ? '자료가 지식이 되는 곳' : section === 'activity' ? '작업·검토' : '내 작업 공간 설정'}</h1><p>{section === 'library' ? '흩어진 자료를 모으고, 읽고, 다음 생각으로 연결하세요.' : section === 'activity' ? '처리한 자료와 확인이 필요한 내용을 한곳에서 살펴보세요.' : '보관함과 도구의 연결 상태를 확인하세요.'}</p></div>{section === 'library' && <button className="kw-button kw-secondary" onClick={() => searchInput.current?.focus()}><Icon name="search" size={17} />자료 찾기</button>}</div>
        <div className="kw-session-note"><span className="kw-dot" /><span>{connection ? <>현재 <strong>{connection.name}</strong> 보관함을 읽고 있습니다. {connection.writable ? '추가한 자료는 원문 Markdown으로 저장됩니다.' : '읽기 전용입니다. 저장은 설정에서 허용할 수 있습니다.'} AI는 자동 실행하지 않습니다.</> : <>연결 전 미리보기입니다. 추가한 자료는 <strong>이 탭에서만 유지</strong>되며 새로고침하면 사라집니다. 설정에서 보관함을 연결하면 원문을 저장할 수 있습니다.</>}</span></div>
        {serverError && <p className="kw-error" role="alert">{serverError}</p>}
        {warnings.length > 0 && <details className="kw-list-warnings"><summary>조회 안내 {warnings.length}개</summary>{warnings.map((warning, i) => <p key={i}>{warning}</p>)}</details>}
        {readBusy && <p role="status">문서 본문을 읽고 있습니다…</p>}
        {notice && <p className="kw-feedback" role="status"><Icon name="check" size={17} />{notice}{removed && <button className="kw-text-button" onClick={undoRemove}>제외한 자료 되돌리기</button>}</p>}

        {section === 'library' && <>
          <div className="kw-intro-grid">
            <button className="kw-drop-card" onClick={openAdd} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); setAddMode('file'); setAddOpen(true); void importFiles(Array.from(event.dataTransfer.files)); }} data-dragging={dragging}>
              <span className="kw-upload-icon"><Icon name="upload" size={27} /></span><div><strong>새로운 자료를 가져오세요</strong><p>파일을 끌어놓거나 클릭해서 시작하세요.</p><span>.md · .txt <i /> 파일당 최대 2 MB</span></div><span className="kw-round-arrow"><Icon name="arrow" /></span>
            </button>
            <div className="kw-tip-card"><span className="kw-tip-number">01 <span>/ START HERE</span></span><h2>모으는 것 다음은,<br />다시 꺼내 쓰는 것.</h2><button onClick={() => openItem(SAMPLE_ITEMS[0])}>자료실 시작 가이드 <Icon name="arrow" size={16} /></button></div>
          </div>
          <section className="kw-library" aria-label="자료 목록">
            <div className="kw-library-heading"><h2>{connection ? '보관함 자료' : '내 자료'} <span>{visible.length}</span></h2><span>{connection ? <button className="kw-text-button" disabled={connectionBusy || busy} onClick={refreshVault}>{connectionBusy ? '확인 중…' : '자료 새로고침'}</button> : <>샘플 {items.filter(item => item.sample).length} · 직접 추가 {mine.length}</>}</span></div>
            <div className="kw-tools"><label className="kw-search"><Icon name="search" size={18} /><input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder={connection ? '제목, 태그, 미리보기 내용 검색' : '제목, 내용, 태그로 검색'} aria-label="자료 검색" />{query && <button onClick={() => setQuery('')} aria-label="검색 초기화"><Icon name="close" size={15} /></button>}</label><label className="kw-sort"><span className="kw-sr-only">정렬</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">최근 추가순</option><option value="title">제목순</option></select></label><div className="kw-view"><button aria-label="카드 보기" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Icon name="grid" size={17} /></button><button aria-label="목록 보기" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={18} /></button></div></div>
            <div className="kw-filters" aria-label="자료 분류">{[['all', '전체 자료'], ['mine', connection ? '보관함' : '직접 추가'], ['note', '노트'], ['code', '코드'], ['document', '문서']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
            <div className={`kw-reading-layout ${selected ? 'has-reader' : ''}`}>
              <div className={`kw-items ${view === 'list' ? 'is-list' : ''}`}>
                {visible.map(item => <button className={`kw-document ${selected?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => openItem(item)}>
                  <span className="kw-document-top"><span className={`kw-type-icon ${item.kind}`}><Icon name={item.kind === 'code' ? 'code' : 'file'} size={22} /></span><span className={`kw-badge ${item.sample ? '' : 'local'}`}>{item.sample ? '샘플' : item.persisted ? 'Vault 저장됨' : '이 탭의 자료'}</span></span>
                  <strong>{item.title}</strong><p>{item.body.replace(/^#+\s.*$/gm, '').replace(/[`#*]/g, '').trim().slice(0, 105)}</p><span className="kw-tags">{item.tags.map(tag => <span key={tag}>#{tag}</span>)}</span><span className="kw-document-footer"><span>{KIND_LABELS[item.kind]}</span><span>{item.persisted ? '문서 읽기' : `${item.body.length.toLocaleString()}자`} <span aria-hidden="true">↗</span></span></span>
                </button>)}
                {!visible.length && <div className="kw-empty"><Icon name="search" size={32} /><h3>{query ? '검색 결과가 없습니다' : '아직 자료가 없습니다'}</h3><p>{query ? '다른 검색어나 분류로 찾아보세요.' : '파일이나 본문을 추가해 첫 자료를 읽어보세요.'}</p><button className="kw-button kw-secondary" onClick={query ? () => { setQuery(''); setFilter('all'); } : openAdd}>{query ? '검색 초기화' : '자료 추가'}</button></div>}
              </div>
              {selected && <aside className="kw-reader" ref={reader} tabIndex={-1} aria-label="자료 읽기"><div className="kw-reader-head"><span><Icon name="file" size={16} />{selected.sample ? '샘플 자료' : selected.persisted ? 'Vault 문서' : '이 탭의 자료'}</span><button onClick={() => setSelected(null)} aria-label="자료 닫기"><Icon name="close" /></button></div><h2>{selected.title}</h2><p className="kw-reader-meta">{selected.source} · {selected.body.length.toLocaleString()}자</p><div className="kw-reader-actions"><div className="kw-filters"><button aria-pressed={readerMode === 'read'} onClick={() => setReaderMode('read')}>읽기</button><button aria-pressed={readerMode === 'source'} onClick={() => setReaderMode('source')}>원문</button></div><button className="kw-text-button" onClick={() => download(selected)}>다운로드 ↓</button></div>{readerMode === 'read' ? <MarkdownPreview body={selected.body} /> : <><pre className="kw-source">{selected.body.slice(0, 50_000)}</pre>{selected.body.length > 50_000 && <p>앞 50,000자만 표시합니다. 전체 원문은 다운로드하세요.</p>}</>}{!selected.sample && !selected.persisted && <details className="kw-edit-details" key={selected.id}><summary>제목·태그 관리</summary><form onSubmit={updateDetails}><label>자료 제목<input name="title" defaultValue={selected.title} maxLength={180} required /></label><label>태그 <span>쉼표로 구분 · 최대 8개</span><input name="tags" defaultValue={selected.tags.join(', ')} maxLength={200} /></label><div><button className="kw-button kw-secondary" type="submit">이 탭에 적용</button><button className="kw-text-button" type="button" onClick={removeItem}>이 탭에서 빼기</button></div></form></details>}<div className="kw-reader-bottom">{selected.persisted && selected.obsidianUrl ? <><span>{selected.path}</span><a className="kw-button kw-secondary" href={selected.obsidianUrl}>Obsidian에서 열기 <Icon name="external" size={15} /></a><span>같은 폴더를 Obsidian에서 먼저 보관함으로 열어주세요. 편집 후 자료 새로고침으로 변경을 확인합니다. 앱이 열리지 않으면 현재 웹 주소를 Safari 또는 Chrome에서 열고 외부 앱 실행을 허용해주세요.</span></> : <><span>Vault 연결 후 같은 문서를 Obsidian에서 열 수 있습니다.</span><button className="kw-text-button" onClick={() => navigate('settings')}>연결 상태 확인 <Icon name="arrow" size={15} /></button></>}</div></aside>}
            </div>
          </section>
        </>}

        {section === 'activity' && <section className="kw-settings-panel"><div className="kw-section-icon"><Icon name="clock" size={28} /></div><h2>아직 실행된 작업이 없습니다</h2><p>파일 저장은 자료실에서 확인할 수 있습니다. AI 작업과 승인·복구 이력은 아직 웹에 연결되지 않았습니다.</p><div className="kw-status-row"><span>{connection ? '현재 조회된 보관함 자료' : '이 탭에서 읽을 수 있는 내 자료'}</span><strong>{mine.length}개</strong></div><div className="kw-status-row"><span>AI 작업 서비스</span><span className="kw-badge">연결 전</span></div><button className="kw-button kw-secondary" onClick={() => navigate('library')}>자료실로 돌아가기 <Icon name="arrow" size={17} /></button></section>}
        {section === 'settings' && <div className="kw-settings-grid"><section className="kw-settings-panel kw-vault-setup"><div className="kw-section-icon"><Icon name="folder" size={26} /></div><h2>Obsidian 보관함 연결</h2><p>기존 폴더를 연결하거나, 합성 자료만 있는 테스트 보관함으로 먼저 사용해보세요.</p><form className="kw-paste-form" onSubmit={event => { event.preventDefault(); void configureVault('connect'); }}><label>보관함 절대 경로<input value={vaultPath} onChange={event => setVaultPath(event.target.value)} placeholder="/Users/you/Documents/MyVault" required /></label><label>읽을 폴더 · 쉼표로 구분<input value={folderScope} onChange={event => setFolderScope(event.target.value)} placeholder="30_wiki, 80_outputs/articles" required /><span className="kw-small">. 은 보관함 전체입니다. 숨김 폴더·심볼릭 링크는 제외하며 최대 300개 문서를 조회합니다.</span></label><label className="kw-write-permission"><input type="checkbox" checked={writeAllowed} onChange={event => setWriteAllowed(event.target.checked)} />새 자료를 20_raw/document에 원문으로 저장하도록 허용</label><div><button type="submit" className="kw-button kw-primary" disabled={connectionBusy || busy}>{connectionBusy ? '연결 확인 중…' : '보관함 연결'}</button>{connection && <button className="kw-text-button" type="button" disabled={connectionBusy || busy} onClick={() => void configureVault('disconnect')}>연결 해제</button>}</div></form><div className="kw-demo-setup"><strong>먼저 사용해보고 싶다면</strong><p>개인 자료와 별개인 로컬 테스트 보관함을 만들고 샘플 3개를 넣습니다. 원문 저장도 바로 시험할 수 있습니다.</p><button className="kw-button kw-secondary" disabled={connectionBusy || busy} onClick={() => void configureVault('demo')}>테스트 보관함으로 시작</button></div></section><section className="kw-settings-panel"><div className="kw-section-icon"><Icon name="settings" size={26} /></div><h2>AI와 처리 설정</h2><p>자료 읽기와 원문 저장에는 API 키가 필요하지 않습니다.</p><div className="kw-status-row"><span>웹에서 AI 실행</span><span className="kw-badge">아직 미지원</span></div><p className="kw-small">기존 CLI 설정은 유지합니다. 이 화면은 키를 조회하거나 저장하지 않으며 모델을 호출하지 않습니다.</p><hr /><h2>읽기 환경</h2><label className="kw-checkbox"><input type="checkbox" checked={comfortable} onChange={event => setComfortable(event.target.checked)} />여유로운 본문 간격</label></section></div>}
        <footer className="kw-footer"><span>Business OS <span>·</span> 생각을 쌓고, 연결하는 공간</span><span>내 자료는 내가 선택한 곳에.</span></footer>
      </main>
    </div>

    <dialog ref={dialog} className="kw-dialog" aria-labelledby="add-dialog-title" onClose={() => setAddOpen(false)} onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="kw-dialog-header"><div><p className="kw-eyebrow">ADD TO YOUR LIBRARY</p><h2 id="add-dialog-title">자료 추가</h2></div><button aria-label="자료 추가 닫기" onClick={() => setAddOpen(false)} disabled={busy}><Icon name="close" /></button></div><p className="kw-dialog-subtitle">지금 읽고 싶은 자료를 가져오세요.</p>
      <div className="kw-modal-tabs">{[['file', '파일 업로드'], ['text', '본문 붙여넣기'], ['url', '웹 링크']].map(([value, label]) => <button key={value} aria-pressed={addMode === value} disabled={busy} onClick={() => { setAddMode(value); setError(''); }}>{label}</button>)}</div>
      {addMode === 'file' && <div className="kw-modal-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void importFiles(Array.from(event.dataTransfer.files)); }}><Icon name="upload" size={34} /><h3>파일을 여기에 놓아주세요</h3><p>Markdown · 텍스트 / 파일당 2 MB<br />{connection ? '한 번에' : '한 탭에서'} 최대 20개 · 합계 10 MB</p><button className="kw-button kw-primary" disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? '파일을 읽는 중…' : '파일 선택'}</button><input ref={fileInput} type="file" accept=".md,.txt" multiple hidden onChange={event => void importFiles(Array.from(event.target.files ?? []))} /></div>}
      {addMode === 'text' && <form className="kw-paste-form" onSubmit={event => { event.preventDefault(); addText(); }}><label>제목<input maxLength={180} value={title} onChange={event => setTitle(event.target.value)} placeholder="나중에 다시 찾기 좋은 제목" required /></label><label>본문<textarea value={body} onChange={event => setBody(event.target.value)} placeholder="자료의 본문을 그대로 붙여넣으세요." rows={8} required /></label><div><span>{body.length.toLocaleString()}자</span><button className="kw-button kw-primary" type="submit" disabled={busy || connectionBusy}>자료 추가 <Icon name="plus" size={17} /></button></div></form>}
      {addMode === 'url' && <div className="kw-modal-drop"><Icon name="external" size={30} /><h3>웹 본문 가져오기는 준비 중입니다</h3><p>지금은 웹페이지의 본문을 복사해 붙여넣어 주세요.<br />링크만으로 내용을 읽거나 AI에 전송하지 않습니다.</p><button className="kw-button kw-secondary" onClick={() => setAddMode('text')}>본문 붙여넣기</button></div>}
      {error && <p className="kw-error" role="alert">{error}</p>}
      <p className="kw-modal-note"><Icon name="folder" size={16} />{connection ? (connection.writable ? '이 보관함의 20_raw/document에 원문을 저장합니다. AI는 호출하지 않습니다.' : '읽기 전용 보관함입니다. 설정에서 원문 저장을 허용해주세요.') : '이 탭에만 보관됩니다. 새로고침 전에 필요한 원문을 다운로드하세요.'}</p>
    </dialog>
  </div>;
}
