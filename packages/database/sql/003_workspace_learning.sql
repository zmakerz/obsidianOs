-- A learning item may reference only a loop in its own workspace.
ALTER TABLE operating_loop_runs ADD CONSTRAINT operating_loop_runs_workspace_id_id_key UNIQUE (workspace_id, id);
ALTER TABLE learning_items DROP CONSTRAINT learning_items_source_run_id_fkey;
ALTER TABLE learning_items ADD CONSTRAINT learning_items_workspace_source_run_fkey
  FOREIGN KEY (workspace_id, source_run_id) REFERENCES operating_loop_runs(workspace_id, id)
  ON DELETE SET NULL (source_run_id);
