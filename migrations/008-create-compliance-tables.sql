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
