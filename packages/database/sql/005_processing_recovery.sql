ALTER TABLE processing_jobs ADD COLUMN lease_until timestamptz;
ALTER TABLE processing_jobs ADD COLUMN active_attempt_id text;
ALTER TABLE processing_jobs ADD CONSTRAINT processing_jobs_active_attempt_fk
  FOREIGN KEY (workspace_id, id, active_attempt_id) REFERENCES processing_attempts(workspace_id, job_id, id);
CREATE TABLE processing_recovery (
  workspace_id text NOT NULL,
  job_id text NOT NULL,
  key text NOT NULL CHECK (length(key) BETWEEN 1 AND 512),
  payload jsonb NOT NULL CHECK (pg_column_size(payload) <= 5000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, job_id, key),
  FOREIGN KEY (workspace_id, job_id) REFERENCES processing_jobs(workspace_id, id)
);
