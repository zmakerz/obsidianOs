import { KnowledgeError, type ArticleGenerator, type GenerationObserver, type ProcessResult, type SourceInput, type StoredDocument } from './article-types.ts';
import { digest, MarkdownVault, renderNote, type Note } from './markdown-vault.ts';

function singleLine(value: string, limit: number): boolean {
  return typeof value === 'string' && !!value.trim() && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
}
function normalizeInput(input: SourceInput): SourceInput {
  if (!singleLine(input.title, 200)) throw new KnowledgeError('invalid-title');
  if (typeof input.body !== 'string' || Buffer.byteLength(input.body) > 2_000_000 || input.body.includes('\0')) throw new KnowledgeError('invalid-source-body');
  if (!['web', 'youtube', 'document', 'code', 'note', 'other'].includes(input.sourceType)) throw new KnowledgeError('invalid-source-type');
  const domain = input.domain ?? 'general';
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(domain)) throw new KnowledgeError('invalid-domain');
  if (input.contentMode && !['full', 'excerpt'].includes(input.contentMode)) throw new KnowledgeError('invalid-content-mode');
  let sourceUrl = input.sourceUrl;
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || sourceUrl.length > 4096) throw new Error();
      sourceUrl = url.href;
    } catch { throw new KnowledgeError('invalid-source-url'); }
  }
  return { ...input, title: input.title.trim(), domain, sourceUrl, contentMode: input.contentMode ?? 'full' };
}
const stored = (note: Note): StoredDocument => ({ id: String(note.metadata.id), path: note.path, revisionHash: note.revisionHash });
function slug(title: string): string {
  return title.normalize('NFC').replace(/[<>:"/\\|?*\[\]#^\u0000-\u001f]/g, '').replace(/\s+/g, '-').slice(0, 48).replace(/[. ]+$/g, '') || 'source';
}

export function providedDraft(body: string): ArticleGenerator {
  if (!body.trim()) throw new KnowledgeError('empty-article');
  return { fingerprint: 'provided-draft-v1:' + digest(body), async generate() { return { body, mode: 'provided-draft' }; } };
}

export function sourceRequest(input: SourceInput, fingerprint: string) {
  const source = normalizeInput(input);
  if (!singleLine(fingerprint, 1000)) throw new KnowledgeError('invalid-generator-policy');
  const contentHash = digest(source.body);
  const rawId = 'raw-' + digest(JSON.stringify([source.sourceType, source.sourceUrl ?? '', source.contentMode, contentHash]));
  return { source, rawId, requestHash: digest(JSON.stringify(['source-article-v1', rawId, source.domain, fingerprint])) };
}

async function preserveRaw(source: SourceInput, vault: MarkdownVault, now: Date, day: string): Promise<Note> {
  const contentHash = digest(source.body);
  const rawId = 'raw-' + digest(JSON.stringify([source.sourceType, source.sourceUrl ?? '', source.contentMode, contentHash]));
  let raw = await vault.find('20_raw', rawId);
  if (!raw) {
    const path = '20_raw/' + source.sourceType + '/' + day + '-' + slug(source.title) + '-' + rawId.slice(4, 16) + '.md';
    await vault.create(path, renderNote({
      id: rawId, kind: 'raw', title: source.title, status: 'active', domain: source.domain,
      created: day, updated: day, captured_at: now.toISOString(), capture_method: 'provided-text',
      source_type: source.sourceType, source_url: source.sourceUrl ?? null, content_mode: source.contentMode, content_hash: contentHash,
    }, source.body));
    raw = await vault.find('20_raw', rawId);
  }
  if (!raw || raw.metadata.kind !== 'raw' || digest(raw.body) !== contentHash || raw.metadata.content_hash !== contentHash) throw new KnowledgeError('raw-content-conflict');
  return raw;
}

/** Save only the original. No model call, Article or job-state file is created. */
export async function captureSource(input: SourceInput, options: { vault: MarkdownVault; now?: Date }): Promise<StoredDocument> {
  const source = normalizeInput(input);
  if (!source.body.trim() || /^https?:\/\/\S+$/.test(source.body.trim())) throw new KnowledgeError('source-body-required');
  const now = options.now ?? new Date();
  const day = now.toISOString().slice(0, 10);
  return options.vault.exclusive(async () => stored(await preserveRaw(source, options.vault, now, day)));
}

export async function processSource(input: SourceInput, options: {
  vault: MarkdownVault; generator: ArticleGenerator; now?: Date; timeZone?: string; signal?: AbortSignal;
  observer?: GenerationObserver; checkCancelled?: () => Promise<void>;
}): Promise<ProcessResult> {
  const source = normalizeInput(input);
  if (!source.body.trim() || /^https?:\/\/\S+$/.test(source.body.trim())) return { status: 'needs-input', reason: 'source-body-required' };
  const now = options.now ?? new Date();
  const day = now.toLocaleDateString('sv-SE', { timeZone: options.timeZone ?? 'Asia/Seoul' });
  if (Number.isNaN(now.valueOf())) throw new KnowledgeError('invalid-date');
  const fingerprint = options.generator.fingerprint;
  if (!singleLine(fingerprint, 1000)) throw new KnowledgeError('invalid-generator-policy');
  const { rawId, requestHash } = sourceRequest(source, fingerprint);
  const articleId = 'article-' + requestHash;
  const vault = options.vault;
  return vault.exclusive(async () => {
    options.signal?.throwIfAborted();
    await options.checkCancelled?.();
    const raw = await preserveRaw(source, vault, now, day);
    const existing = await vault.find('80_outputs/articles', articleId);
    if (existing) {
      if (existing.metadata.kind !== 'article' || existing.metadata.raw_id !== rawId || existing.metadata.request_hash !== requestHash
        || existing.metadata.content_hash !== digest(existing.body)) throw new KnowledgeError('article-edited-or-conflicting');
      const references = existing.metadata.source_refs;
      if (!Array.isArray(references) || !references.includes('[[' + raw.path.replace(/\.md$/, '') + ']]')) throw new KnowledgeError('lineage-link-needs-review');
      await vault.appendEvent(String(existing.metadata.created), articleId, rawId, articleId);
      return { status: 'existing', raw: stored(raw), article: stored(existing) };
    }
    // Use the immutable snapshot's title so a repeated capture's display-title change does not change model input.
    await options.checkCancelled?.();
    const draft = await options.generator.generate({ ...source, title: String(raw.metadata.title) }, options.signal, options.observer);
    options.signal?.throwIfAborted();
    await options.checkCancelled?.();
    if (!draft.body?.trim() || Buffer.byteLength(draft.body) > 2_000_000 || !['ai', 'provided-draft'].includes(draft.mode)) throw new KnowledgeError('invalid-article-result');
    // An external editor may have changed Raw while the model request was running.
    if (digest(await vault.read(raw.path)) !== raw.revisionHash) throw new KnowledgeError('raw-changed-during-processing');
    const path = '80_outputs/articles/' + day + '-' + slug(String(raw.metadata.title)) + '-' + requestHash.slice(0, 12) + '.md';
    const body = draft.body;
    await vault.create(path, renderNote({
      id: articleId, kind: 'article', title: raw.metadata.title, status: 'draft', domain: source.domain,
      created: day, updated: day, raw_id: rawId, request_hash: requestHash, content_hash: digest(body),
      source_refs: ['[[' + raw.path.replace(/\.md$/, '') + ']]'], generation_mode: draft.mode,
      generation_policy: fingerprint, model: draft.model ?? null, review: 'pending',
      ...(draft.usage ? { generation_usage: { inputTokens: draft.usage.inputTokens, outputTokens: draft.usage.outputTokens, calls: draft.usage.calls } } : {}),
    }, body));
    const article = await vault.find('80_outputs/articles', articleId);
    if (!article) throw new KnowledgeError('article-write-not-found');
    await vault.appendEvent(day, articleId, rawId, articleId);
    return { status: 'created', raw: stored(raw), article: stored(article), ...(draft.usage ? { usage: draft.usage } : {}) };
  });
}
