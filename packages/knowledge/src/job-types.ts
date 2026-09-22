import type { ModelCall, ProcessResult } from './article-types.ts';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'needs-input' | 'needs-review' | 'cancelled';
export interface ProcessingJob {
  id: string; workspaceId: string; vaultId: string; requestHash: string;
  status: JobStatus; attemptCount: number; maxAttempts: number;
  cancelRequested: boolean; retryable: boolean; reason: string | null; result: ProcessResult | null;
  leaseUntil?: string | null;
}
export interface JobRequest { workspaceId: string; vaultId: string; requestHash: string; maxAttempts: number }
export interface JobCompletion {
  status: Exclude<JobStatus, 'queued' | 'running'>; reason?: string; retryable?: boolean; result?: ProcessResult;
}
export interface ProcessingJobStore {
  request(input: JobRequest): Promise<ProcessingJob>;
  get(workspaceId: string, id: string): Promise<ProcessingJob | null>;
  claim(workspaceId: string, id: string, retry: boolean, resume?: boolean): Promise<{ job: ProcessingJob; attemptId: string; previousAttemptIds: string[] } | null>;
  withVaultLock<T>(vaultId: string, work: (signal: AbortSignal) => Promise<T>): Promise<T | null>;
  heartbeat(workspaceId: string, id: string, attemptId: string): Promise<boolean>;
  loadRecovery<T>(workspaceId: string, id: string, key: string): Promise<T | null>;
  saveRecovery(workspaceId: string, id: string, attemptId: string, key: string, payload: unknown): Promise<void>;
  recoveryKeys(workspaceId: string, id: string, prefix: string): Promise<string[]>;
  finish(workspaceId: string, id: string, attemptId: string, outcome: JobCompletion): Promise<ProcessingJob>;
  cancel(workspaceId: string, id: string): Promise<ProcessingJob | null>;
  recordCall(workspaceId: string, id: string, attemptId: string, call: ModelCall): Promise<void>;
}
