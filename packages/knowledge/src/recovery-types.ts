export interface RecoveryJournal {
  load<T>(key: string): Promise<T | null>;
  save(key: string, payload: unknown): Promise<void>;
  keys(prefix: string): Promise<string[]>;
  guard(finishPublication?: boolean): Promise<void>;
  attemptId: string;
  previousAttemptIds: string[];
  /** Test injection only; no environment-triggered fault hooks in production. */
  boundary?(name: string): Promise<void>;
}
export interface SegmentCheckpoint { body: string; inputTokens: number; outputTokens: number }
