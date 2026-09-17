import { KnowledgeError, type ArticleGenerator, type SourceInput } from './article-types.ts';
import { digest, type MarkdownVault } from './markdown-vault.ts';
import { processSource, sourceRequest } from './source-article.ts';
import type { ProcessingJob, ProcessingJobStore } from './job-types.ts';

/** One synchronous attempt. Durable records, but no background worker or crash reclamation yet. */
export async function processSourceJob(input: SourceInput, options: {
  vault: MarkdownVault; generator: ArticleGenerator; jobs: ProcessingJobStore; workspaceId: string;
  maxAttempts?: number; retry?: boolean; signal?: AbortSignal;
}): Promise<ProcessingJob> {
  const { requestHash } = sourceRequest(input, options.generator.fingerprint);
  const { jobs, workspaceId } = options;
  const requested = await jobs.request({ workspaceId, vaultId: digest(options.vault.root), requestHash, maxAttempts: options.maxAttempts ?? 3 });
  if (options.signal?.aborted) return (await jobs.cancel(workspaceId, requested.id))!;
  const claimed = await jobs.claim(workspaceId, requested.id, options.retry ?? false);
  if (!claimed) return (await jobs.get(workspaceId, requested.id))!;
  const { attemptId } = claimed;
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let storeFailed = false;
  const pendingCalls = new Set<number>();
  let unknownUsage = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polling: Promise<void> = Promise.resolve();
  const checkCancelled = async () => {
    try {
      const current = await jobs.get(workspaceId, requested.id);
      if (!current || current.status !== 'running') { storeFailed = true; controller.abort(); }
      else if (current.cancelRequested) controller.abort();
    } catch { storeFailed = true; controller.abort(); }
    signal.throwIfAborted();
  };
  const poll = () => {
    timer = setTimeout(() => {
      polling = checkCancelled().catch(() => {}).finally(() => { if (!stopped) poll(); });
    }, 500);
    timer.unref();
  };
  poll();
  let outcome: Parameters<ProcessingJobStore['finish']>[3];
  try {
    const result = await processSource(input, { vault: options.vault, generator: options.generator, signal, checkCancelled,
      observer: { async onCall(call) {
        try {
          await jobs.recordCall(workspaceId, requested.id, attemptId, call);
          if (call.status === 'started') pendingCalls.add(call.sequence);
          else { pendingCalls.delete(call.sequence); if (call.status === 'unknown') unknownUsage = true; }
        }
        catch { storeFailed = true; throw new KnowledgeError('job-store-unavailable'); }
      } },
    });
    outcome = result.status === 'needs-input' ? { status: 'needs-input', reason: result.reason, result }
      : { status: 'succeeded', result };
  } catch (error) {
    // DB uncertainty is not a cancelled/failed attempt that may safely be rerun.
    if (storeFailed) throw new KnowledgeError('job-store-unavailable');
    const reason = error instanceof KnowledgeError ? error.code : 'processing-failed';
    outcome = signal.aborted ? { status: 'cancelled', reason: 'request-cancelled' }
      : pendingCalls.size > 0 || unknownUsage || reason === 'openai-network-or-response-error' || reason === 'openai-usage-missing'
        ? { status: 'needs-review', reason }
        : { status: 'failed', reason, retryable: ['processing-failed', 'vault-busy-or-interrupted', 'openai-http-429', 'openai-http-503'].includes(reason) };
  } finally {
    stopped = true;
    clearTimeout(timer);
    await polling;
  }
  // Publication may already have completed when cancellation arrives; preserve success.
  return jobs.finish(workspaceId, requested.id, attemptId, outcome);
}
