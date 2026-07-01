import { FLAG_THRESHOLD } from "../../shared/constants/lgpdRules";
import { ExtractedFieldResult } from "./extractionEngine.interface";
interface CalibrationConfig {
  threshold: number;
  highConfidence: number;
  mediumConfidence: number;
}
const defaultConfig: CalibrationConfig = {
  threshold: FLAG_THRESHOLD,
  highConfidence: 80,
  mediumConfidence: 50,
};
export class ConfidenceScorerService {
  private config: CalibrationConfig;
  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  calibrateFields(fields: ExtractedFieldResult[]): ExtractedFieldResult[] {
    return fields.map((field) => ({
      ...field,
      confidence_score: this.calibrateScore(field.confidence_score, field),
      metadata: {
        ...field.metadata,
        original_confidence: field.confidence_score,
        calibrated: true,
        calibration_reason: this.getCalibrationReason(field),
      },
    }));
  }
  private calibrateScore(score: number, field: ExtractedFieldResult): number {
    let adjusted = Math.max(0, Math.min(100, score));
    if (field.is_ambiguous) {
      adjusted = Math.min(adjusted, this.config.mediumConfidence);
    }
    if (!field.source_evidence || field.source_evidence.trim().length < 10) {
      adjusted = Math.max(0, adjusted - 15);
    }
    if (
      field.extracted_value === "undefined" ||
      field.extracted_value === "not_declared"
    ) {
      adjusted = Math.min(adjusted, 10);
    }
    if (field.extracted_value === "conflicting") {
      adjusted = Math.min(adjusted, 5);
    }
    return Math.round(adjusted);
  }
  getCalibrationReason(field: ExtractedFieldResult): string {
    if (field.is_ambiguous) return "low_evidence_ambiguous";
    if (!field.source_evidence || field.source_evidence.trim().length < 10) {
      return "insufficient_evidence";
    }
    if (
      field.extracted_value === "undefined" ||
      field.extracted_value === "not_declared"
    ) {
      return "value_not_declared";
    }
    if (field.extracted_value === "conflicting") {
      return "conflicting_values";
    }
    return "standard_calibration";
  }
  shouldFlag(score: number): boolean {
    return score < this.config.threshold;
  }
  getConfidenceLevel(score: number): "high" | "medium" | "low" {
    if (score >= this.config.highConfidence) return "high";
    if (score >= this.config.mediumConfidence) return "medium";
    return "low";
  }
}
export const confidenceScorerService = new ConfidenceScorerService();
