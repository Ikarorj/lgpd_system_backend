-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_artifacts_status_timestamp
  ON artifacts(status, upload_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_extraction_results_artifact_status
  ON extraction_results(artifact_id, completion_status);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_result_flag
  ON extracted_fields(result_id, is_flagged)
  WHERE is_flagged = true;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_timestamp
  ON audit_log(action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action
  ON audit_log(user_id, action, timestamp DESC);
