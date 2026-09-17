BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  owner_id text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  summary text NOT NULL,
  preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'preview', 'approved', 'executed', 'verified', 'rejected', 'failed')),
  requested_by text NOT NULL,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  approval_id text NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operating_loop_runs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  pack_id text,
  phase text NOT NULL DEFAULT 'observe' CHECK (phase IN ('observe', 'analyze', 'plan', 'approve', 'execute', 'measure', 'learn')),
  cycle integer NOT NULL DEFAULT 1 CHECK (cycle > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  scorecard_metric text,
  scorecard_value numeric,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operating_loop_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loop_run_id text NOT NULL REFERENCES operating_loop_runs(id) ON DELETE CASCADE,
  from_phase text,
  to_phase text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metric_definitions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'count',
  display_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (workspace_id, metric_key)
);

CREATE TABLE IF NOT EXISTS metric_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  metric_id text NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  delta_percentage numeric,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS recommendations (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  rationale text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'completed')),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_items (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text NOT NULL CHECK (destination IN ('wiki', 'sop', 'rule', 'none')),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'promoted', 'rejected')),
  source_run_id text REFERENCES operating_loop_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  promoted_at timestamptz
);

CREATE TABLE IF NOT EXISTS activity_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_workspace_status ON approval_requests(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loops_workspace_status ON operating_loop_runs(workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_latest ON metric_observations(metric_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_workspace_time ON activity_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_workspace_status ON recommendations(workspace_id, status, priority);

COMMIT;
