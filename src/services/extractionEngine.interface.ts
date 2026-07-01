import { FieldType } from "../../shared/types/apiContracts.types";
export interface ExtractedFieldResult {
  field_type: FieldType;
  extracted_value: string;
  confidence_score: number;
  source_evidence: string;
  source_line_number?: number;
  is_ambiguous?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}
export interface ExtractionOutput {
  extracted_fields: ExtractedFieldResult[];
  processing_notes?: string;
  overall_confidence?: number;
}
export interface ExtractionEngine {
  extract(
    content: string,
    filename: string,
    format: string,
  ): Promise<ExtractionOutput>;
  getEngineName(): string;
  getEngineVersion(): string;
}
