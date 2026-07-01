CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  extraction_ids UUID[] NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('json', 'html')),
  include_flagged BOOLEAN NOT NULL DEFAULT true,
  include_overrides BOOLEAN NOT NULL DEFAULT true,
  file_size_bytes BIGINT,
  storage_path VARCHAR(1000),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at);
CREATE INDEX IF NOT EXISTS idx_exports_format ON exports(format);
