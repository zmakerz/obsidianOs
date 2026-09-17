CREATE TABLE processing_jobs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  vault_id text NOT NULL CHECK (vault_id ~ '^[a-f0-9]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','needs-input','needs-review','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 5),
  cancel_requested boolean NOT NULL DEFAULT false,
  retryable boolean NOT NULL DEFAULT false,
  reason text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (attempt_count <= max_attempts),
  UNIQUE (workspace_id, vault_id, request_hash),
  UNIQUE (workspace_id, id)
);
CREATE TABLE processing_attempts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  job_id text NOT NULL,
  number integer NOT NULL CHECK (number > 0),
  status text NOT NULL CHECK (status IN ('running','succeeded','failed','needs-input','needs-review','cancelled')),
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  FOREIGN KEY (workspace_id, job_id) REFERENCES processing_jobs(workspace_id, id),
  UNIQUE (workspace_id, job_id, number),
  UNIQUE (workspace_id, job_id, id)
);
CREATE UNIQUE INDEX processing_attempts_one_running ON processing_attempts(workspace_id, job_id) WHERE status = 'running';
CREATE TABLE processing_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id text NOT NULL,
  job_id text NOT NULL,
  attempt_id text,
  event_type text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, job_id) REFERENCES processing_jobs(workspace_id, id),
  FOREIGN KEY (workspace_id, job_id, attempt_id) REFERENCES processing_attempts(workspace_id, job_id, id)
);
CREATE TABLE processing_model_calls (
  workspace_id text NOT NULL,
  job_id text NOT NULL,
  attempt_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','reported','unknown')),
  input_tokens bigint CHECK (input_tokens >= 0),
  output_tokens bigint CHECK (output_tokens >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, job_id, attempt_id, sequence),
  FOREIGN KEY (workspace_id, job_id, attempt_id) REFERENCES processing_attempts(workspace_id, job_id, id),
  CHECK ((status = 'reported' AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL)
    OR (status IN ('started','unknown') AND input_tokens IS NULL AND output_tokens IS NULL))
);
CREATE INDEX processing_jobs_workspace_time ON processing_jobs(workspace_id, created_at DESC);
CREATE INDEX processing_events_job_time ON processing_events(workspace_id, job_id, id);
