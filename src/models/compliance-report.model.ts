import { ComplianceStatus } from "../../shared/types/apiContracts.types";
export interface ComplianceReport {
  id: string;
  extraction_result_id: string;
  compliance_score: number;
  compliance_status: ComplianceStatus;
  total_violations: number;
  violations_by_severity: Record<string, number>;
  articles_checked: string[];
  previous_report_id: string | null;
  created_at: Date;
  updated_at: Date;
}
export interface CreateComplianceReportInput {
  extraction_result_id: string;
  compliance_score: number;
  compliance_status: ComplianceStatus;
  total_violations: number;
  violations_by_severity: Record<string, number>;
  articles_checked: string[];
  previous_report_id?: string;
}
