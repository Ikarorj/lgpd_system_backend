import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../utils/supabaseAdminClient";
import {
  ComplianceViolation,
  CreateComplianceViolationInput,
  UpdateViolationInput,
} from "../models/compliance-violation.model";
import {
  ComplianceReport,
  CreateComplianceReportInput,
} from "../models/compliance-report.model";
export class ComplianceRepository {
  async createViolation(
    input: CreateComplianceViolationInput,
  ): Promise<ComplianceViolation> {
    const id = uuidv4();
    const { data, error } = await supabaseAdmin
      .from("compliance_violations")
      .insert({
        id,
        extraction_result_id: input.extraction_result_id,
        violation_type: input.violation_type,
        lgpd_article: input.lgpd_article,
        severity: input.severity,
        violation_category: input.violation_category,
        affected_field_type: input.affected_field_type ?? null,
        extracted_value: input.extracted_value ?? null,
        remediation_guidance: input.remediation_guidance,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async createViolations(
    inputs: CreateComplianceViolationInput[],
  ): Promise<ComplianceViolation[]> {
    const rows = inputs.map((input) => ({
      id: uuidv4(),
      extraction_result_id: input.extraction_result_id,
      violation_type: input.violation_type,
      lgpd_article: input.lgpd_article,
      severity: input.severity,
      violation_category: input.violation_category,
      affected_field_type: input.affected_field_type ?? null,
      extracted_value: input.extracted_value ?? null,
      remediation_guidance: input.remediation_guidance,
    }));
    const { data, error } = await supabaseAdmin
      .from("compliance_violations")
      .insert(rows)
      .select();
    if (error) throw error;
    return data ?? [];
  }
  async findViolationsByResultId(
    resultId: string,
  ): Promise<ComplianceViolation[]> {
    const { data, error } = await supabaseAdmin
      .from("compliance_violations")
      .select("*")
      .eq("extraction_result_id", resultId)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
  async findViolationById(id: string): Promise<ComplianceViolation | null> {
    const { data, error } = await supabaseAdmin
      .from("compliance_violations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async updateViolation(
    id: string,
    input: UpdateViolationInput,
  ): Promise<ComplianceViolation | null> {
    const updateData: Record<string, unknown> = {};
    if (input.remediation_status !== undefined)
      updateData.remediation_status = input.remediation_status;
    if (input.remediation_notes !== undefined)
      updateData.remediation_notes = input.remediation_notes;
    if (input.reviewed_by !== undefined)
      updateData.reviewed_by = input.reviewed_by;
    if (input.reviewed_at !== undefined)
      updateData.reviewed_at = input.reviewed_at;
    updateData.updated_at = new Date().toISOString();
    if (Object.keys(updateData).length === 0) return this.findViolationById(id);
    const { data, error } = await supabaseAdmin
      .from("compliance_violations")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async createReport(
    input: CreateComplianceReportInput,
  ): Promise<ComplianceReport> {
    const id = uuidv4();
    const { data, error } = await supabaseAdmin
      .from("compliance_reports")
      .insert({
        id,
        extraction_result_id: input.extraction_result_id,
        compliance_score: input.compliance_score,
        compliance_status: input.compliance_status,
        total_violations: input.total_violations,
        violations_by_severity: input.violations_by_severity,
        articles_checked: input.articles_checked,
        previous_report_id: input.previous_report_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async findReportByResultId(
    resultId: string,
  ): Promise<ComplianceReport | null> {
    const { data, error } = await supabaseAdmin
      .from("compliance_reports")
      .select("*")
      .eq("extraction_result_id", resultId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  async findPreviousReportByResultId(
    resultId: string,
  ): Promise<ComplianceReport | null> {
    const { data: currentResult } = await supabaseAdmin
      .from("extraction_results")
      .select("artifact_id")
      .eq("id", resultId)
      .maybeSingle();
    if (!currentResult) return null;
    const { data: prevResult } = await supabaseAdmin
      .from("extraction_results")
      .select("id")
      .eq("artifact_id", currentResult.artifact_id)
      .neq("id", resultId)
      .order("extraction_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prevResult) return null;
    const { data } = await supabaseAdmin
      .from("compliance_reports")
      .select("*")
      .eq("extraction_result_id", prevResult.id)
      .maybeSingle();
    return data;
  }
  async deleteViolationsByResultId(resultId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("compliance_violations")
      .delete()
      .eq("extraction_result_id", resultId);
    if (error) throw error;
  }
}
export const complianceRepository = new ComplianceRepository();
