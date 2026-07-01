import { FastifyRequest, FastifyReply } from "fastify";
import { extractionService } from "../services/extraction.service";
import { getSuggestedAction } from "../utils/extractionFieldMapperUtil";
export async function getExtractionResult(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { extractionId } = request.params as { extractionId: string };
  const { result, fields } =
    await extractionService.getExtractionResult(extractionId);
  reply.send({
    extraction_id: result.id,
    artifact_id: result.artifact_id,
    extraction_timestamp: result.extraction_timestamp,
    extraction_version: result.extraction_version,
    extracted_by: result.extracted_by,
    overall_confidence: result.overall_confidence,
    completion_status: result.completion_status,
    extraction_duration_ms: result.extraction_duration_ms,
    flagged_count: result.flagged_count,
    human_override_count: result.human_override_count,
    extracted_fields: fields.map((f) => ({
      field_id: f.id,
      field_type: f.field_type,
      extracted_value: f.extracted_value,
      confidence_score: f.confidence_score,
      is_flagged: f.is_flagged,
      flag_reason: f.flag_reason,
      source_evidence: f.source_evidence,
      requires_human_review: f.requires_human_review,
    })),
  });
}
export async function getFlaggedFields(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { extractionId } = request.params as { extractionId: string };
  const { result, flaggedFields } =
    await extractionService.getFlaggedFields(extractionId);
  reply.send({
    extraction_id: result.id,
    artifact_id: result.artifact_id,
    flagged_count: flaggedFields.length,
    flagged_fields: flaggedFields.map((f) => ({
      field_id: f.id,
      field_type: f.field_type,
      extracted_value: f.extracted_value,
      confidence_score: f.confidence_score,
      flag_reason: f.flag_reason ?? "low_confidence",
      source_evidence: f.source_evidence,
      suggested_action: getSuggestedAction(f.field_type, f.confidence_score),
      human_override_available: f.human_override_by === null,
    })),
  });
}
export async function getExtractionByArtifact(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { artifactId } = request.params as { artifactId: string };
  const result = await extractionService.getExtractionByArtifact(artifactId);
  if (!result) {
    reply
      .status(404)
      .send({
        error: "NOT_FOUND",
        message: `No extraction found for artifact ${artifactId}`,
        timestamp: new Date().toISOString(),
      });
    return;
  }
  const { result: extraction, fields } = result;
  reply.send({
    extraction_id: extraction.id,
    artifact_id: extraction.artifact_id,
    extraction_timestamp: extraction.extraction_timestamp,
    extraction_version: extraction.extraction_version,
    extracted_by: extraction.extracted_by,
    overall_confidence: extraction.overall_confidence,
    completion_status: extraction.completion_status,
    extraction_duration_ms: extraction.extraction_duration_ms,
    flagged_count: extraction.flagged_count,
    human_override_count: extraction.human_override_count,
    extracted_fields: fields.map((f) => ({
      field_id: f.id,
      field_type: f.field_type,
      extracted_value: f.extracted_value,
      confidence_score: f.confidence_score,
      is_flagged: f.is_flagged,
      flag_reason: f.flag_reason,
      source_evidence: f.source_evidence,
      requires_human_review: f.requires_human_review,
    })),
  });
}
export async function getExtractionsList(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const queryParams = request.query as {
    artifact_id?: string;
    status?: string;
    page?: string;
    page_size?: string;
  };
  const page = Math.max(1, parseInt(queryParams.page ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(queryParams.page_size ?? "50", 10)),
  );
  const result = await extractionService.getExtractionsList(
    page,
    pageSize,
    queryParams.status,
    queryParams.artifact_id,
  );
  reply.send(result);
}
