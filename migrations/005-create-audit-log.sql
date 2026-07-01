DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'uploaded', 'extraction_started', 'extraction_completed',
    'extraction_failed', 'field_reviewed', 'field_overridden',
    'result_exported', 'result_archived', 'artifact_deleted',
    'confidence_calibrated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details JSONB,
  ip_address INET,
  user_agent VARCHAR(500),
  CONSTRAINT resource_id_not_empty CHECK (resource_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
