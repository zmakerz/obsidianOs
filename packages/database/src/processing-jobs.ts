import { randomUUID } from 'node:crypto';
import type { ModelCall } from '../../knowledge/src/article-types.ts';
import type { JobCompletion, JobRequest, ProcessingJob, ProcessingJobStore } from '../../knowledge/src/job-types.ts';
import type { QueryExecutor, TransactionalDatabase } from './types.ts';

function job(row: Record<string, unknown>): ProcessingJob {
  return { id: String(row.id), workspaceId: String(row.workspace_id), vaultId: String(row.vault_id), requestHash: String(row.request_hash),
    status: row.status as ProcessingJob['status'], attemptCount: Number(row.attempt_count), maxAttempts: Number(row.max_attempts),
    cancelRequested: Boolean(row.cancel_requested), retryable: Boolean(row.retryable), reason: row.reason as string | null,
    result: row.result as ProcessingJob['result'] };
}
async function select(tx: QueryExecutor, workspaceId: string, id: string, lock = false) {
  const result = await tx.query(`SELECT * FROM processing_jobs WHERE workspace_id = $1 AND id = $2${lock ? ' FOR UPDATE' : ''}`, [workspaceId, id]);
  return result.rows[0] ? job(result.rows[0]) : null;
}
async function event(tx: QueryExecutor, workspaceId: string, id: string, type: string, attemptId: string | null = null, reason: string | null = null) {
  await tx.query('INSERT INTO processing_events (workspace_id, job_id, attempt_id, event_type, reason) VALUES ($1,$2,$3,$4,$5)', [workspaceId, id, attemptId, type, reason]);
}

export class ProcessingJobRepository implements ProcessingJobStore {
  private readonly database: TransactionalDatabase;
  constructor(database: TransactionalDatabase) { this.database = database; }

  async request(input: JobRequest): Promise<ProcessingJob> {
    if (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 5) throw new Error('invalid-attempt-limit');
    return this.database.transaction(async tx => {
      const inserted = await tx.query(`INSERT INTO processing_jobs (id, workspace_id, vault_id, request_hash, max_attempts)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT (workspace_id, vault_id, request_hash) DO NOTHING RETURNING *`,
      [randomUUID(), input.workspaceId, input.vaultId, input.requestHash, input.maxAttempts]);
      if (inserted.rows[0]) {
        const created = job(inserted.rows[0]);
        await event(tx, input.workspaceId, created.id, 'queued');
        return created;
      }
      const existing = await tx.query('SELECT * FROM processing_jobs WHERE workspace_id=$1 AND vault_id=$2 AND request_hash=$3',
        [input.workspaceId, input.vaultId, input.requestHash]);
      return job(existing.rows[0]);
    });
  }

  get(workspaceId: string, id: string) { return select(this.database, workspaceId, id); }

  async list(workspaceId: string): Promise<ProcessingJob[]> {
    const result = await this.database.query('SELECT * FROM processing_jobs WHERE workspace_id=$1 ORDER BY created_at DESC, id LIMIT 50', [workspaceId]);
    return result.rows.map(job);
  }

  async claim(workspaceId: string, id: string, retry: boolean) {
    return this.database.transaction(async tx => {
      const current = await select(tx, workspaceId, id, true);
      if (!current || current.cancelRequested || current.attemptCount >= current.maxAttempts ||
        !(current.status === 'queued' || (retry && current.status === 'failed' && current.retryable))) return null;
      const attemptId = randomUUID();
      const next = await tx.query(`UPDATE processing_jobs SET status='running', attempt_count=attempt_count+1,
        reason=NULL, retryable=false, updated_at=now() WHERE workspace_id=$1 AND id=$2 RETURNING *`, [workspaceId, id]);
      await tx.query(`INSERT INTO processing_attempts (id, workspace_id, job_id, number, status) VALUES ($1,$2,$3,$4,'running')`,
        [attemptId, workspaceId, id, current.attemptCount + 1]);
      await event(tx, workspaceId, id, 'running', attemptId);
      return { job: job(next.rows[0]), attemptId };
    });
  }

  async finish(workspaceId: string, id: string, attemptId: string, outcome: JobCompletion) {
    return this.database.transaction(async tx => {
      const current = await select(tx, workspaceId, id, true);
      if (!current || current.status !== 'running') throw new Error('job-not-running');
      const updated = await tx.query(`UPDATE processing_attempts SET status=$4, reason=$5, finished_at=now()
        WHERE workspace_id=$1 AND job_id=$2 AND id=$3 AND status='running' RETURNING id`,
      [workspaceId, id, attemptId, outcome.status, outcome.reason ?? null]);
      if (!updated.rows.length) throw new Error('attempt-not-running');
      const result = await tx.query(`UPDATE processing_jobs SET status=$3, reason=$4, retryable=$5, result=$6, updated_at=now()
        WHERE workspace_id=$1 AND id=$2 RETURNING *`, [workspaceId, id, outcome.status, outcome.reason ?? null,
        outcome.status === 'failed' && Boolean(outcome.retryable), outcome.result ? JSON.stringify(outcome.result) : null]);
      await event(tx, workspaceId, id, outcome.status, attemptId, outcome.reason ?? null);
      return job(result.rows[0]);
    });
  }

  async cancel(workspaceId: string, id: string) {
    return this.database.transaction(async tx => {
      const current = await select(tx, workspaceId, id, true);
      if (!current || current.cancelRequested || !['queued', 'running', 'failed'].includes(current.status)) return current;
      const status = current.status === 'running' ? 'running' : 'cancelled';
      const result = await tx.query(`UPDATE processing_jobs SET cancel_requested=true, status=$3, retryable=false, updated_at=now()
        WHERE workspace_id=$1 AND id=$2 RETURNING *`, [workspaceId, id, status]);
      await event(tx, workspaceId, id, status === 'running' ? 'cancel-requested' : 'cancelled');
      return job(result.rows[0]);
    });
  }

  async recordCall(workspaceId: string, id: string, attemptId: string, call: ModelCall) {
    await this.database.transaction(async tx => {
      const current = await select(tx, workspaceId, id, true);
      if (!current || current.status !== 'running') throw new Error('job-not-running');
      const attempt = await tx.query("SELECT 1 FROM processing_attempts WHERE workspace_id=$1 AND job_id=$2 AND id=$3 AND status='running'", [workspaceId, id, attemptId]);
      if (!attempt.rows.length) throw new Error('attempt-not-running');
      if (call.status === 'started') {
        await tx.query(`INSERT INTO processing_model_calls (workspace_id, job_id, attempt_id, sequence, model, status)
          VALUES ($1,$2,$3,$4,$5,'started')`, [workspaceId, id, attemptId, call.sequence, call.model]);
      } else {
        const result = await tx.query(`UPDATE processing_model_calls SET status=$5, input_tokens=$6, output_tokens=$7, updated_at=now()
          WHERE workspace_id=$1 AND job_id=$2 AND attempt_id=$3 AND sequence=$4 AND status='started' AND model=$8 RETURNING sequence`,
        [workspaceId, id, attemptId, call.sequence, call.status, call.inputTokens, call.outputTokens, call.model]);
        if (!result.rows.length) throw new Error('call-not-started');
      }
    });
  }

  async inspect(workspaceId: string, id: string) {
    return this.database.transaction(async tx => {
      const current = await select(tx, workspaceId, id, true);
      if (!current) return null;
      const attempts = await tx.query('SELECT id, number, status, reason, started_at, finished_at FROM processing_attempts WHERE workspace_id=$1 AND job_id=$2 ORDER BY number', [workspaceId, id]);
      const events = await tx.query('SELECT id, attempt_id, event_type, reason, created_at FROM processing_events WHERE workspace_id=$1 AND job_id=$2 ORDER BY id', [workspaceId, id]);
      const calls = await tx.query('SELECT attempt_id, sequence, model, status, input_tokens, output_tokens FROM processing_model_calls WHERE workspace_id=$1 AND job_id=$2 ORDER BY started_at, sequence', [workspaceId, id]);
      return { job: current, attempts: attempts.rows, events: events.rows, calls: calls.rows };
    });
  }
}
