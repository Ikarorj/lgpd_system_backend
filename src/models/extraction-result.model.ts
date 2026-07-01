import { ExtractionStatus } from "../../shared/types/apiContracts.types";
export interface ExtractionResult {
  id: string;
  artifact_id: string;
  extraction_timestamp: Date;
  extraction_version: string;
  extracted_by: string;
  overall_confidence: number;
  flagged_count: number;
  human_override_count: number;
  completion_status: ExtractionStatus;
  extraction_started_at: Date;
  extraction_completed_at: Date | null;
  extraction_duration_ms: number | null;
  processing_notes: string | null;
  created_at: Date;
  updated_at: Date;
}
export interface CreateExtractionResultInput {
  artifact_id: string;
  extraction_version: string;
  extracted_by?: string;
}
export interface UpdateExtractionResultInput {
  overall_confidence?: number;
  flagged_count?: number;
  human_override_count?: number;
  completion_status?: ExtractionStatus;
  extraction_completed_at?: Date;
  extraction_duration_ms?: number;
  processing_notes?: string;
}
