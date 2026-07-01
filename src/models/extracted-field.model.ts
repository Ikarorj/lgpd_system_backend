import { FieldType, FlagReason } from "../../shared/types/apiContracts.types";
export interface ExtractedField {
  id: string;
  result_id: string;
  field_type: FieldType;
  extracted_value: string;
  confidence_score: number;
  confidence_calibrated: boolean;
  source_evidence: string;
  source_line_number: number | null;
  is_flagged: boolean;
  flag_reason: FlagReason | null;
  requires_human_review: boolean;
  human_override_by: string | null;
  human_override_timestamp: Date | null;
  human_override_value: string | null;
  human_override_rationale: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}
export interface CreateExtractedFieldInput {
  result_id: string;
  field_type: FieldType;
  extracted_value: string;
  confidence_score: number;
  source_evidence: string;
  source_line_number?: number;
  metadata?: Record<string, unknown>;
}
export interface OverrideFieldInput {
  human_override_by: string;
  human_override_value: string;
  human_override_rationale: string;
}
