import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readdir, realpath, unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { parseDocument, stringify } from 'yaml';
import { KnowledgeError } from './article-types.ts';

export const digest = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
export interface Note { path: string; metadata: Record<string, unknown>; body: string; revisionHash: string }
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';
export function renderNote(metadata: Record<string, unknown>, body: string): string {
  return '---\n' + stringify(metadata, { lineWidth: 0 }) + '---\n' + body;
}
export function parseNote(content: string, path: string): Note {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
  if (!match || Buffer.byteLength(match[1]) > 65536) throw new KnowledgeError('invalid-document-header');
  const document = parseDocument(match[1], { uniqueKeys: true, version: '1.2' });
  if (document.errors.length || document.warnings.length) throw new KnowledgeError('invalid-document-header');
  let metadata: unknown;
  try { metadata = document.toJS({ maxAliasCount: 25 }); }
  catch { throw new KnowledgeError('invalid-document-header'); }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new KnowledgeError('invalid-document-header');
  return { path, metadata: metadata as Record<string, unknown>, body: content.slice(match[0].length), revisionHash: digest(content) };
}

/** Local single-writer adapter. Never overwrites a document or removes an Inbox file. */
export class MarkdownVault {
  readonly root: string;
  private constructor(root: string) { this.root = root; }
  static async connect(path: string): Promise<MarkdownVault> {
    const root = await realpath(path);
    if (!(await lstat(root)).isDirectory()) throw new KnowledgeError('vault-not-directory');
    return new MarkdownVault(root);
  }
  async safePath(path: string, createParents = false): Promise<string> {
    const target = resolve(this.root, path);
    const local = relative(this.root, target);
    if (!local || local === '..' || local.startsWith('..' + sep) || isAbsolute(local)) throw new KnowledgeError('path-outside-vault');
    let current = this.root;
    const parts = local.split(sep);
    for (let i = 0; i < parts.length; i++) {
      current = resolve(current, parts[i]);
      try {
        const info = await lstat(current);
        if (info.isSymbolicLink()) throw new KnowledgeError('symlink-not-allowed');
        if (i < parts.length - 1 && !info.isDirectory()) throw new KnowledgeError('invalid-parent-directory');
      } catch (error) {
        if (!missing(error)) throw error;
        if (createParents && i < parts.length - 1) await mkdir(current);
      }
    }
    return target;
  }
  async read(path: string): Promise<string> {
    const target = await this.safePath(path);
    const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      if (!(await handle.stat()).isFile()) throw new KnowledgeError('not-a-file');
      return await handle.readFile('utf8');
    } finally { await handle.close(); }
  }
  private async metadata(path: string): Promise<Record<string, unknown> | null> {
    const handle = await open(await this.safePath(path), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      while (size < 66000) {
        const buffer = Buffer.alloc(256);
        const { bytesRead } = await handle.read(buffer);
        if (!bytesRead) break;
        chunks.push(buffer.subarray(0, bytesRead)); size += bytesRead;
        const content = Buffer.concat(chunks).toString('utf8');
        if (!content.startsWith('---\n')) return null;
        const end = content.indexOf('\n---\n', 4);
        if (end >= 0) return parseNote(content.slice(0, end + 5), path).metadata;
      }
      throw new KnowledgeError('invalid-document-header');
    } finally { await handle.close(); }
  }
  async find(folder: string, id: string): Promise<Note | null> {
    const found: Note[] = [];
    const walk = async (dir: string): Promise<void> => {
      const target = await this.safePath(dir);
      let entries;
      try { entries = await readdir(target, { withFileTypes: true }); }
      catch (error) { if (missing(error)) return; throw error; }
      for (const entry of entries) {
        if (entry.isSymbolicLink()) throw new KnowledgeError('symlink-not-allowed');
        const path = dir + '/' + entry.name;
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Scan bounded headers; only the selected document's full body is loaded.
          const metadata = await this.metadata(path);
          if (metadata?.id === id) {
            const note = parseNote(await this.read(path), path);
            if (note.metadata.id !== id) throw new KnowledgeError('document-changed-during-lookup');
            found.push(note);
          }
        }
      }
    };
    await walk(folder);
    if (found.length > 1) throw new KnowledgeError('duplicate-document-id');
    return found[0] ?? null;
  }
  async create(path: string, content: string): Promise<void> {
    const target = await this.safePath(path, true);
    // A hard link publishes a fully written inode without replacing an existing target.
    const temporary = target + '.' + randomUUID() + '.tmp';
    const handle = await open(temporary, 'wx', 0o600);
    try {
      try {
        await handle.writeFile(content, 'utf8');
        await handle.sync();
      } finally { await handle.close(); }
      await this.safePath(path);
      await link(temporary, target);
    } finally { await unlink(temporary); }
  }
  async exclusive<T>(work: () => Promise<T>): Promise<T> {
    const path = await this.safePath('.business-os-write.lock');
    let handle;
    try { handle = await open(path, 'wx', 0o600); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new KnowledgeError('vault-busy-or-interrupted');
      throw error;
    }
    try {
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      return await work();
    } finally { await handle.close(); await unlink(path); }
  }
  async appendEvent(day: string, eventId: string, rawId: string, articleId: string): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day
      || !/^article-[a-f0-9]{64}$/.test(eventId) || !/^raw-[a-f0-9]{64}$/.test(rawId) || articleId !== eventId) {
      throw new KnowledgeError('invalid-log-event');
    }
    const path = '90_logs/' + day + '.md';
    let current: string;
    try { current = await this.read(path); }
    catch (error) {
      if (!missing(error)) throw error;
      await this.create(path, renderNote({ kind: 'daily-log', status: 'active', created: day, updated: day }, '# ' + day + '\n'));
      current = await this.read(path);
    }
    const marker = '<!-- event:' + eventId + ' -->';
    if (current.includes(marker)) return;
    const handle = await open(await this.safePath(path), constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW);
    try {
      // This is a human-readable result summary, not the operational job-state store.
      await handle.writeFile('\n' + marker + '\n- Article 저장: `' + articleId + '` · Raw: `' + rawId + '`\n');
      await handle.sync();
    } finally { await handle.close(); }
  }
}
