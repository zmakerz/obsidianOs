import { connectVault, listVault, readVaultEntry, saveVaultSource } from '../../../../../packages/knowledge/src/vault-library.ts';
import { KnowledgeError } from '../../../../../packages/knowledge/src/article-types.ts';
import { assertLocalRequest, demoConnection, limitedJson, loadConnection, sessionCookie, storeConnection } from '@/lib/vault-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200, cookie = false) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': sessionCookie } : {}) } });
function failure(error: unknown, bootstrap = false) {
  const reason = error instanceof KnowledgeError ? error.code : 'local-io-error';
  return json({ error: reason }, /local-access|local-session/.test(reason) ? 403 : 400, bootstrap && !/local-access/.test(reason));
}
export async function GET(request: Request) {
  try {
    assertLocalRequest(request);
    const connection = await loadConnection();
    if (!connection) return json({ connection: null, items: [], warnings: [], truncated: false }, 200, true);
    const id = new URL(request.url).searchParams.get('id');
    if (id && new URL(request.url).searchParams.get('connection') !== connection.id) throw new KnowledgeError('connection-changed');
    if (id) return json({ item: await readVaultEntry(connection, id) }, 200, true);
    return json({ connection, ...await listVault(connection) }, 200, true);
  } catch (error) { return failure(error, true); }
}
export async function POST(request: Request) {
  try {
    assertLocalRequest(request, true);
    const data = await limitedJson(request);
    if (data.action === 'connect' || data.action === 'demo') {
      const connection = data.action === 'demo' ? await demoConnection() : await connectVault(String(data.root ?? ''), data.folders, data.writable === true);
      const listing = await listVault(connection);
      await storeConnection(connection);
      return json({ connection, ...listing });
    }
    if (data.action === 'disconnect') { await storeConnection(null); return json({ connection: null, items: [], warnings: [], truncated: false }); }
    const connection = await loadConnection();
    if (!connection) throw new KnowledgeError('vault-not-connected');
    if (data.action === 'save') {
      if (data.connectionId !== connection.id) throw new KnowledgeError('connection-changed');
      if (typeof data.title !== 'string' || typeof data.body !== 'string') throw new KnowledgeError('invalid-request');
      return json({ item: await saveVaultSource(connection, data.title, data.body) });
    }
    throw new KnowledgeError('invalid-request');
  } catch (error) { return failure(error); }
}
