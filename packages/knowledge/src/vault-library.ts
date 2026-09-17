import { constants } from 'node:fs';
import { open, readdir, lstat } from 'node:fs/promises';
import { basename, isAbsolute, dirname } from 'node:path';
import { parseDocument } from 'yaml';
import { MarkdownVault, digest } from './markdown-vault.ts';
import { captureSource } from './source-article.ts';
import { KnowledgeError } from './article-types.ts';

export interface VaultConnection { id: string; root: string; folders: string[]; writable: boolean; name: string }
export interface VaultEntry {
  id: string; title: string; body: string; source: string; tags: string[];
  kind: 'note' | 'code' | 'document'; sample: false; addedAt: number;
  path: string; revision?: string; persisted: true; obsidianUrl: string;
}
const skipped = new Set(['node_modules', 'dist', 'coverage']);
const blocked = (name: string) => name.startsWith('.') || skipped.has(name);
export function validateFolders(folders: unknown): string[] {
  if (!Array.isArray(folders) || !folders.length || folders.length > 12) throw new KnowledgeError('invalid-folders');
  return [...new Set(folders.map(value => {
    if (typeof value !== 'string' || !value || value.length > 500 || value.includes('\\') || value.includes(':') || /[\x00-\x1f]/.test(value)) throw new KnowledgeError('invalid-folders');
    if (value !== '.' && value.split('/').some(part => !part || part === '..' || part === '.' || blocked(part))) throw new KnowledgeError('invalid-folders');
    return value;
  }))];
}
export async function connectVault(root: string, folders: unknown, writable = false): Promise<VaultConnection> {
  if (typeof root !== 'string' || !isAbsolute(root) || root === dirname(root) || root.length > 4096) throw new KnowledgeError('invalid-vault-path');
  const vault = await MarkdownVault.connect(root);
  const scope = validateFolders(folders);
  for (const folder of scope) if (folder !== '.' && !(await lstat(await vault.safePath(folder))).isDirectory()) throw new KnowledgeError('folder-not-directory');
  // Imported originals are always visible when write access is enabled.
  return { id: digest(JSON.stringify([vault.root, scope, writable])), root: vault.root, folders: scope, writable, name: basename(vault.root) };
}
function view(content: string, path: string) {
  let title = basename(path).replace(/\.(md|txt)$/i, ''), body = content, tags: string[] = [];
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (header && header[1].length <= 65536) {
    try {
      const parsed = parseDocument(header[1], { uniqueKeys: true, version: '1.2' });
      if (parsed.errors.length || parsed.warnings.length) throw new Error();
      const metadata = parsed.toJS({ maxAliasCount: 25 });
      if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        if (typeof metadata.title === 'string') title = metadata.title.slice(0, 200);
        if (Array.isArray(metadata.tags)) tags = metadata.tags.filter((v: unknown) => typeof v === 'string').slice(0, 12).map((v: string) => v.slice(0, 100));
        body = content.slice(header[0].length);
      }
    } catch { /* Legacy/malformed YAML is shown as original text, never rewritten. */ }
  }
  return { title, body, tags };
}
async function readBounded(vault: MarkdownVault, path: string, max: number) {
  const handle = await open(await vault.safePath(path), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 2_100_000) throw new KnowledgeError('document-too-large');
    const buffer = Buffer.alloc(Math.min(stat.size, max));
    let offset = 0;
    while (offset < buffer.length) {
      const result = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (!result.bytesRead) break;
      offset += result.bytesRead;
    }
    // Stream mode tolerates only a multibyte character cut off at a preview boundary.
    const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, offset), { stream: offset < stat.size });
    if (content.includes('\0')) throw new KnowledgeError('invalid-source-body');
    return { content, modified: stat.mtimeMs };
  } finally { await handle.close(); }
}
function entry(connection: VaultConnection, path: string, content: string, modified: number): VaultEntry {
  const parsed = view(content, path);
  return { ...parsed, id: digest(path), source: path, path, kind: /^\s*(`{3,}|~{3,})/m.test(parsed.body) ? 'code' : 'note', sample: false, addedAt: modified, persisted: true,
    obsidianUrl: 'obsidian://open?path=' + encodeURIComponent(connection.root + '/' + path) };
}
export async function listVault(connection: VaultConnection): Promise<{ items: VaultEntry[]; warnings: string[]; truncated: boolean }> {
  const vault = await MarkdownVault.connect(connection.root);
  const paths = new Set<string>(), warnings: string[] = [];
  let visited = 0, truncated = false;
  const walk = async (folder: string, depth: number) => {
    if (depth > 12 || visited >= 3000 || paths.size >= 300) { truncated = true; return; }
    let entries;
    try { entries = await readdir(folder === '.' ? vault.root : await vault.safePath(folder), { withFileTypes: true }); }
    catch { warnings.push(`${folder}: 폴더를 읽을 수 없습니다.`); return; }
    for (const item of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (++visited > 3000 || paths.size >= 300) { truncated = true; break; }
      if (blocked(item.name) || item.isSymbolicLink()) continue;
      const path = folder === '.' ? item.name : folder + '/' + item.name;
      if (item.isDirectory()) await walk(path, depth + 1);
      else if (item.isFile() && /\.(md|txt)$/i.test(item.name)) paths.add(path);
    }
  };
  const scope = [...connection.folders];
  if (connection.writable && !scope.includes('.') && !scope.some(p => p === '20_raw' || p === '20_raw/document')) scope.push('20_raw/document');
  for (const folder of scope) await walk(folder, 0);
  const items: VaultEntry[] = [];
  for (const path of paths) {
    try {
      const read = await readBounded(vault, path, 8192);
      const item = entry(connection, path, read.content, read.modified);
      item.body = item.body.slice(0, 1200);
      items.push(item);
    } catch { warnings.push(`${path}: 지원하지 않는 인코딩·크기 또는 접근 불가.`); }
  }
  return { items: items.sort((a, b) => b.addedAt - a.addedAt), warnings: warnings.slice(0, 20), truncated };
}
export async function readVaultEntry(connection: VaultConnection, id: string): Promise<VaultEntry> {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new KnowledgeError('invalid-document-id');
  // Resolve an opaque ID only inside the registered scope, never a client-supplied path.
  const found = (await listVault(connection)).items.find(item => item.id === id);
  if (!found) throw new KnowledgeError('document-not-found');
  const vault = await MarkdownVault.connect(connection.root);
  const read = await readBounded(vault, found.path, 2_100_000);
  return { ...entry(connection, found.path, read.content, read.modified), revision: digest(read.content) };
}
export async function saveVaultSource(connection: VaultConnection, title: string, body: string): Promise<VaultEntry> {
  if (!connection.writable) throw new KnowledgeError('vault-read-only');
  const vault = await MarkdownVault.connect(connection.root);
  const saved = await captureSource({ title, body, sourceType: 'document', domain: 'general', contentMode: 'full' }, { vault });
  // Return the saved result even when the bounded list is already full.
  const read = await readBounded(vault, saved.path, 2_100_000);
  return { ...entry(connection, saved.path, read.content, read.modified), revision: digest(read.content) };
}
