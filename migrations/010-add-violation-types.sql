DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_processing_purpose';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'invalid_consent';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'invalid_legitimate_interest';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_deletion_mechanism';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_governance_program';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_impact_report';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_incident_communication';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE violation_type ADD VALUE 'missing_privacy_by_design';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
