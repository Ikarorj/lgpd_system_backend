import {
  ViolationType,
  ViolationSeverity,
  ViolationCategory,
  RemediationStatus,
} from "../../shared/types/apiContracts.types";
export interface ComplianceViolation {
  id: string;
  extraction_result_id: string;
  violation_type: ViolationType;
  lgpd_article: string;
  severity: ViolationSeverity;
  violation_category: ViolationCategory;
  affected_field_type: string | null;
  extracted_value: string | null;
  remediation_guidance: string;
  remediation_status: RemediationStatus;
  remediation_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
export interface CreateComplianceViolationInput {
  extraction_result_id: string;
  violation_type: ViolationType;
  lgpd_article: string;
  severity: ViolationSeverity;
  violation_category: ViolationCategory;
  affected_field_type?: string;
  extracted_value?: string;
  remediation_guidance: string;
}
export interface UpdateViolationInput {
  remediation_status?: RemediationStatus;
  remediation_notes?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
}
