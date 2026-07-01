DO $$ BEGIN
  CREATE TYPE artifact_format AS ENUM (
    'PDF', 'DOCX', 'MARKDOWN', 'TXT',
    'PY', 'JS', 'TS', 'JAVA', 'CS', 'GO', 'RUST',
    'JSON', 'YAML'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE artifact_status AS ENUM (
    'uploaded', 'validating', 'processing', 'completed',
    'failed', 'deleted'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(500) NOT NULL,
  format artifact_format NOT NULL,
  size_bytes BIGINT NOT NULL,
  upload_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content_hash VARCHAR(64) NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  status artifact_status NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  extraction_model_version VARCHAR(50),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT positive_size CHECK (size_bytes > 0),
  CONSTRAINT file_not_empty CHECK (filename <> '')
);

CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_uploaded_by ON artifacts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_artifacts_upload_timestamp ON artifacts(upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at);
