import fs from "fs/promises";
import path from "path";
import { FastifyRequest, FastifyReply } from "fastify";
import { extractionService } from "../services/extraction.service";
import { complianceService } from "../services/compliance.service";
import { opinionService } from "../services/opinion.service";
import { artifactRepository } from "../repositories/artifact.repository";
import { NotFoundError } from "../utils/errorHandlerUtil";
import { logger } from "../utils/loggerUtil";
const UPLOAD_DIR =
  process.env.STORAGE_UPLOAD_DIR || path.join(process.cwd(), "uploads");
async function readArtifactContent(artifactId: string): Promise<string> {
  const artifact = await artifactRepository.findById(artifactId);
  if (!artifact || !artifact.storage_path) return "";
  try {
    const filePath = path.join(UPLOAD_DIR, artifact.storage_path);
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}
export async function generateOpinion(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { extractionId } = request.params as { extractionId: string };
  try {
    const { result, fields } =
      await extractionService.getExtractionResult(extractionId);
    let report;
    try {
      report = await complianceService.getComplianceReport(extractionId);
    } catch {
      try {
        report = await complianceService.runComplianceCheck(extractionId);
      } catch {
        report = null;
      }
    }
    const content = await readArtifactContent(result.artifact_id);
    const artifact = await artifactRepository.findById(result.artifact_id);
    const input = {
      filename: artifact?.filename ?? "documento",
      format: artifact?.format ?? "unknown",
      content,
      fields: fields.map(
        (f: {
          field_type: string;
          extracted_value: string;
          confidence_score: number;
        }) => ({
          field_type: f.field_type,
          extracted_value: f.extracted_value,
          confidence_score: f.confidence_score,
        }),
      ),
      compliance: report ? {
        score: report.report.compliance_score,
        status: report.report.compliance_status,
        violations: report.violations.map((v) => ({
          type: v.violation_type,
          severity: v.severity,
          article: v.lgpd_article,
          value: v.extracted_value ?? "",
          remediation: v.remediation_guidance,
        })),
      } : {
        score: 0,
        status: "INSUFFICIENT_DATA",
        violations: [],
      },
    };
    const opinion = await opinionService.generate(input);
    reply.send(opinion);
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
    logger.error({ err, extractionId }, "Opinion generation failed");
    reply
      .status(500)
      .send({
        error: "OPINION_FAILED",
        message:
          "Erro ao gerar parecer. Verifique se a extração foi concluída.",
        timestamp: new Date().toISOString(),
      });
  }
}
