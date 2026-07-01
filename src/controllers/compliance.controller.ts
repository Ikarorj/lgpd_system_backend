import { FastifyRequest, FastifyReply } from "fastify";
import { complianceService } from "../services/compliance.service";
import { NotFoundError } from "../utils/errorHandlerUtil";
import { RemediationStatus } from "../../shared/types/apiContracts.types";
import { JwtPayload } from "../middleware/auth.middleware";
export async function getComplianceReport(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { extractionId } = request.params as { extractionId: string };
  try {
    const { report, violations } =
      await complianceService.getComplianceReport(extractionId);
    reply.send({
      id: report.id,
      extraction_result_id: report.extraction_result_id,
      compliance_score: report.compliance_score,
      compliance_status: report.compliance_status,
      total_violations: report.total_violations,
      violations_by_severity: report.violations_by_severity,
      articles_checked: report.articles_checked,
      previous_report_id: report.previous_report_id,
      created_at: report.created_at,
      updated_at: report.updated_at,
      violations: violations.map((v) => ({
        id: v.id,
        extraction_result_id: v.extraction_result_id,
        violation_type: v.violation_type,
        lgpd_article: v.lgpd_article,
        severity: v.severity,
        violation_category: v.violation_category,
        affected_field_type: v.affected_field_type,
        extracted_value: v.extracted_value,
        remediation_guidance: v.remediation_guidance,
        remediation_status: v.remediation_status,
        remediation_notes: v.remediation_notes,
        reviewed_by: v.reviewed_by,
        reviewed_at: v.reviewed_at ?? null,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })),
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      reply
        .status(404)
        .send({
          error: "NOT_FOUND",
          message: err.message,
          timestamp: new Date().toISOString(),
        });
      return;
    }
    throw err;
  }
}
export async function runComplianceCheck(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { extractionId } = request.params as { extractionId: string };
  const { report, violations } =
    await complianceService.runComplianceCheck(extractionId);
  reply
    .status(201)
    .send({
      id: report.id,
      extraction_result_id: report.extraction_result_id,
      compliance_score: report.compliance_score,
      compliance_status: report.compliance_status,
      total_violations: report.total_violations,
      violations_by_severity: report.violations_by_severity,
      articles_checked: report.articles_checked,
      violations: violations.map((v) => ({
        id: v.id,
        violation_type: v.violation_type,
        lgpd_article: v.lgpd_article,
        severity: v.severity,
        violation_category: v.violation_category,
        extracted_value: v.extracted_value,
        remediation_guidance: v.remediation_guidance,
        remediation_status: v.remediation_status,
      })),
    });
}
export async function updateViolationStatus(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { violationId } = request.params as { violationId: string };
  const user = (request.user as JwtPayload | undefined) ?? null;
  const body = request.body as {
    remediation_status: RemediationStatus;
    remediation_notes?: string;
  };
  if (!user) {
    reply
      .status(401)
      .send({
        error: "UNAUTHORIZED",
        message: "User not authenticated",
        timestamp: new Date().toISOString(),
      });
    return;
  }
  const validStatuses = ["active", "acknowledged", "in_progress", "resolved"];
  if (!validStatuses.includes(body.remediation_status)) {
    reply
      .status(400)
      .send({
        error: "INVALID_STATUS",
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        timestamp: new Date().toISOString(),
      });
    return;
  }
  const updated = await complianceService.updateViolationStatus(
    violationId,
    body.remediation_status,
    body.remediation_notes,
    user.user_id,
  );
  reply.send({
    id: updated.id,
    remediation_status: updated.remediation_status,
    remediation_notes: updated.remediation_notes,
    reviewed_by: updated.reviewed_by,
    reviewed_at: updated.reviewed_at ?? null,
  });
}
