export class KnowledgeError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = 'KnowledgeError'; this.code = code; }
}
export interface SourceInput {
  title: string;
  body: string;
  sourceType: 'web' | 'youtube' | 'document' | 'code' | 'note' | 'other';
  sourceUrl?: string;
  domain?: string;
  contentMode?: 'full' | 'excerpt';
}
export interface ArticleUsage { inputTokens: number; outputTokens: number; calls: number }
export interface ModelCall {
  sequence: number; model: string; status: 'started' | 'reported' | 'unknown';
  inputTokens: number | null; outputTokens: number | null;
}
export interface GenerationObserver {
  onCall(call: ModelCall): Promise<void>;
  boundary?: (name: string) => Promise<void>;
  checkpoint?: {
    load(sequence: number): Promise<import('./recovery-types.ts').SegmentCheckpoint | null>;
    save(sequence: number, value: import('./recovery-types.ts').SegmentCheckpoint): Promise<void>;
  };
}
export interface ArticleDraft {
  body: string;
  mode: 'provided-draft' | 'ai';
  model?: string;
  usage?: ArticleUsage;
}
export interface ArticleGenerator {
  /** Include all output-affecting policy/model/options in this value. Never include credentials. */
  fingerprint: string;
  generate(source: SourceInput, signal?: AbortSignal, observer?: GenerationObserver): Promise<ArticleDraft>;
}
export interface StoredDocument {
  id: string;
  path: string;
  revisionHash: string;
}
export type ProcessResult =
  | { status: 'needs-input'; reason: 'source-body-required' }
  | { status: 'created' | 'existing'; raw: StoredDocument; article: StoredDocument; usage?: ArticleUsage };
