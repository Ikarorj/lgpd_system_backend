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
