import { logger } from "../utils/loggerUtil";
export interface ExtractionJobData {
  artifact_id: string;
  filename: string;
  format: string;
  storage_path: string;
  user_id: string;
  extraction_version: string;
}
export async function enqueueExtraction(
  data: ExtractionJobData,
): Promise<void> {
  logger.info({ artifactId: data.artifact_id }, "Iniciando extração inline");
  const { extractionService } = await import("../services/extraction.service.js");
  await extractionService.processExtraction(data.artifact_id);
}
export async function closeQueue(): Promise<void> {
  logger.info("Queue closed (inline mode)");
}
