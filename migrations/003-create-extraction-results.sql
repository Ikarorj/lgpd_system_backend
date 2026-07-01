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
