import { KnowledgeError, type ArticleDraft, type ArticleGenerator, type SourceInput } from './article-types.ts';
import { digest, type MarkdownVault } from './markdown-vault.ts';
import { processSource, sourceRequest } from './source-article.ts';
import type { ProcessingJob, ProcessingJobStore } from './job-types.ts';
import type { RecoveryJournal } from './recovery-types.ts';

/** One synchronous attempt. Explicit, fenced recovery; no background worker. */
export async function processSourceJob(input: SourceInput, options: {
  vault: MarkdownVault; generator: ArticleGenerator; jobs: ProcessingJobStore; workspaceId: string;
  maxAttempts?: number; retry?: boolean; resume?: boolean; signal?: AbortSignal;
  boundary?: (name: string) => Promise<void>;
}): Promise<ProcessingJob> {
  const { requestHash } = sourceRequest(input, options.generator.fingerprint);
  const { jobs, workspaceId } = options;
  const requested = await jobs.request({ workspaceId, vaultId: digest(options.vault.root), requestHash, maxAttempts: options.maxAttempts ?? 3 });
  if (options.signal?.aborted) return (await jobs.cancel(workspaceId, requested.id))!;
  const execution = await jobs.withVaultLock(requested.vaultId, async lockSignal => {
    const claimed = await jobs.claim(workspaceId, requested.id, options.retry ?? false, options.resume ?? false);
    if (!claimed) return (await jobs.get(workspaceId, requested.id))!;
    const { attemptId, previousAttemptIds } = claimed;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, lockSignal, ...(options.signal ? [options.signal] : [])]);
    let storeFailed = false;
    const pendingCalls = new Set<number>();
    let unknownUsage = false;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polling: Promise<void> = Promise.resolve();
    const checkCancelled = async (finishPublication = false) => {
      try {
        if (lockSignal.aborted || !await jobs.heartbeat(workspaceId, requested.id, attemptId)) { storeFailed = true; controller.abort(); }
        const current = await jobs.get(workspaceId, requested.id);
        if (!current || current.status !== 'running') { storeFailed = true; controller.abort(); }
        else if (current.cancelRequested && !finishPublication) controller.abort();
      } catch { storeFailed = true; controller.abort(); }
      if (storeFailed || lockSignal.aborted || !finishPublication) signal.throwIfAborted();
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
      const recovery: RecoveryJournal = {
        attemptId, previousAttemptIds, guard: checkCancelled, boundary: options.boundary,
        load: <T>(key: string) => jobs.loadRecovery<T>(workspaceId, requested.id, key),
        keys: (prefix: string) => jobs.recoveryKeys(workspaceId, requested.id, prefix),
        async save(key, payload) {
          try { await jobs.saveRecovery(workspaceId, requested.id, attemptId, key, payload); }
          catch (error) {
            if (error instanceof Error && error.message === 'recovery-conflict') throw new KnowledgeError('recovery-state-conflict');
            if (error instanceof Error && error.message === 'invalid-recovery-payload') throw new KnowledgeError('recovery-record-too-large');
            storeFailed = true; throw new KnowledgeError('job-store-unavailable');
          }
        },
      };
      let plan = await recovery.load<{ now: string }>('plan');
      if (!plan) { plan = { now: new Date().toISOString() }; await recovery.save('plan', plan); }
      const generator: ArticleGenerator = {
        fingerprint: options.generator.fingerprint,
        async generate(source, signal, observer) {
          const existing = await recovery.load<ArticleDraft>('draft');
          if (existing) return existing;
          const draft = await options.generator.generate(source, signal, observer);
          await recovery.save('draft', draft);
          await options.boundary?.('draft:saved');
          return draft;
        },
      };
      const result = await processSource(input, { vault: options.vault.withRecovery(recovery), generator, now: new Date(plan.now), signal, checkCancelled,
        observer: {
          boundary: options.boundary,
          checkpoint: {
            load: sequence => recovery.load('segment:' + sequence),
            async save(sequence, value) { await recovery.save('segment:' + sequence, value); },
          },
          async onCall(call) {
            if (call.status === 'started') await checkCancelled();
            try {
              await jobs.recordCall(workspaceId, requested.id, attemptId, call);
              if (call.status === 'started') pendingCalls.add(call.sequence);
              else { pendingCalls.delete(call.sequence); if (call.status === 'unknown') unknownUsage = true; }
            } catch { storeFailed = true; throw new KnowledgeError('job-store-unavailable'); }
          },
        },
      });
      outcome = result.status === 'needs-input' ? { status: 'needs-input', reason: result.reason, result }
        : { status: 'succeeded', result };
    } catch (error) {
      // DB uncertainty is not a cancelled/failed attempt that may safely be rerun.
      if (storeFailed) throw new KnowledgeError('job-store-unavailable');
      const reason = error instanceof KnowledgeError ? error.code : 'processing-failed';
      outcome = signal.aborted ? { status: 'cancelled', reason: 'request-cancelled' }
        : reason.startsWith('recovery-') || reason === 'partial-log-needs-review' || pendingCalls.size > 0 || unknownUsage || reason === 'openai-network-or-response-error' || reason === 'openai-usage-missing'
          ? { status: 'needs-review', reason }
          : { status: 'failed', reason, retryable: ['processing-failed', 'vault-busy-or-interrupted', 'openai-http-429', 'openai-http-503'].includes(reason) };
    } finally {
      stopped = true;
      clearTimeout(timer);
      await polling;
    }
    // Publication may already have completed when cancellation arrives; preserve success.
    await options.boundary?.('job:before-finish');
    return jobs.finish(workspaceId, requested.id, attemptId, outcome);
  });
  return execution ?? (await jobs.get(workspaceId, requested.id))!;
}
