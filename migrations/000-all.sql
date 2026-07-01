-- 001-create-users.sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'compliance_officer'
    CHECK (role IN ('admin', 'compliance_officer', 'reviewer', 'api_client')),
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'jwt',
  external_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);


-- 002-create-artifacts.sql
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


-- 003-create-extraction-results.sql
DO $$ BEGIN
  CREATE TYPE extraction_status AS ENUM (
    'processing', 'completed', 'failed',
    'needs_review', 'reviewed', 'exported', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  extraction_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  extraction_version VARCHAR(50) NOT NULL,
  extracted_by VARCHAR(50) NOT NULL DEFAULT 'openai-gpt4',
  overall_confidence INTEGER NOT NULL CHECK (overall_confidence >= 0 AND overall_confidence <= 100),
  flagged_count INTEGER NOT NULL DEFAULT 0,
  human_override_count INTEGER NOT NULL DEFAULT 0,
  completion_status extraction_status NOT NULL DEFAULT 'processing',
  extraction_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  extraction_completed_at TIMESTAMP,
  extraction_duration_ms INTEGER,
  processing_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_artifact_id ON extraction_results(artifact_id);
CREATE INDEX IF NOT EXISTS idx_extraction_results_completion_status ON extraction_results(completion_status);
CREATE INDEX IF NOT EXISTS idx_extraction_results_created_at ON extraction_results(created_at);


-- 004-create-extracted-fields.sql
DO $$ BEGIN
  CREATE TYPE field_type AS ENUM (
    'data_categories',
    'legal_basis',
    'retention_period',
    'processing_purpose',
    'third_party_sharing',
    'data_subject_rights',
    'storage_method',
    'encryption_status'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE flag_reason AS ENUM (
    'low_confidence',
    'ambiguous',
    'conflicting',
    'needs_verification',
    'manual_flag'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES extraction_results(id) ON DELETE CASCADE,
  field_type field_type NOT NULL,
  extracted_value TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  confidence_calibrated BOOLEAN NOT NULL DEFAULT false,
  source_evidence TEXT NOT NULL,
  source_line_number INTEGER,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason flag_reason,
  requires_human_review BOOLEAN NOT NULL DEFAULT false,
  human_override_by UUID REFERENCES users(id) ON DELETE SET NULL,
  human_override_timestamp TIMESTAMP,
  human_override_value TEXT,
  human_override_rationale TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT extracted_value_not_empty CHECK (extracted_value <> ''),
  CONSTRAINT confidence_threshold_check CHECK (
    (confidence_score >= 50 OR is_flagged = true)
  ),
  CONSTRAINT override_consistency CHECK (
    (human_override_by IS NULL AND human_override_value IS NULL) OR
    (human_override_by IS NOT NULL AND human_override_value IS NOT NULL AND human_override_timestamp IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_result_id ON extracted_fields(result_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_is_flagged ON extracted_fields(is_flagged);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_field_type ON extracted_fields(field_type);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_confidence ON extracted_fields(confidence_score)
  WHERE is_flagged = true;


-- 005-create-audit-log.sql
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


-- 006-create-indexes.sql
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


-- 008-create-compliance-tables.sql
DO $$ BEGIN
  CREATE TYPE violation_type AS ENUM (
    'missing_legal_basis',
    'missing_retention_period',
    'missing_data_subject_rights',
    'insufficient_security',
    'unsafe_third_party_sharing',
    'sensitive_data_without_consent',
    'missing_dpo_contact',
    'unsafe_international_transfer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_severity AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_category AS ENUM (
    'omission',
    'explicit'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE remediation_status AS ENUM (
    'active',
    'acknowledged',
    'in_progress',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE compliance_status AS ENUM (
    'COMPLIANT',
    'PARTIALLY_COMPLIANT',
    'NON_COMPLIANT',
    'INSUFFICIENT_DATA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_result_id UUID NOT NULL REFERENCES extraction_results(id) ON DELETE CASCADE,
  violation_type violation_type NOT NULL,
  lgpd_article TEXT NOT NULL,
  severity violation_severity NOT NULL,
  violation_category violation_category NOT NULL,
  affected_field_type field_type,
  extracted_value TEXT,
  remediation_guidance TEXT NOT NULL,
  remediation_status remediation_status NOT NULL DEFAULT 'active',
  remediation_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_result_id UUID NOT NULL REFERENCES extraction_results(id) ON DELETE CASCADE,
  compliance_score INTEGER NOT NULL CHECK (compliance_score >= 0 AND compliance_score <= 100),
  compliance_status compliance_status NOT NULL,
  total_violations INTEGER NOT NULL DEFAULT 0,
  violations_by_severity JSONB NOT NULL DEFAULT '{"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}',
  articles_checked TEXT[] NOT NULL DEFAULT '{}',
  previous_report_id UUID REFERENCES compliance_reports(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_extraction_report UNIQUE (extraction_result_id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_result_id ON compliance_violations(extraction_result_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON compliance_violations(remediation_status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_result_id ON compliance_reports(extraction_result_id);



