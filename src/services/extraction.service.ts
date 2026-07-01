import fs from "fs/promises";
import path from "path";
import { extractionRepository } from "../repositories/extraction.repository";
import { artifactRepository } from "../repositories/artifact.repository";
import {
  GroqExtractionAdapter,
  isGroqAvailable,
} from "./groqExtraction.adapter";
import { MockExtractionAdapter } from "./mockExtraction.adapter";
import { ExtractionEngine } from "./extractionEngine.interface";
import { confidenceScorerService } from "./confidenceScorer.service";
import { complianceService } from "./compliance.service";
import { logger } from "../utils/loggerUtil";
import { NotFoundError } from "../utils/errorHandlerUtil";
import { Artifact } from "../models/artifact.model";
import {
  ExtractionResult,
  UpdateExtractionResultInput,
} from "../models/extraction-result.model";
import { ExtractedField } from "../models/extracted-field.model";
import pdfParse from "pdf-parse";
const UPLOAD_DIR =
  process.env.STORAGE_UPLOAD_DIR || path.join(process.cwd(), "uploads");
export class ExtractionService {
  private engine: ExtractionEngine | null = null;
  private async getEngine(): Promise<ExtractionEngine> {
    if (this.engine) return this.engine;
    if (isGroqAvailable()) {
      logger.info("Usando Groq para extração");
      this.engine = new GroqExtractionAdapter();
    } else {
      logger.info(
        "Groq não disponível, usando extrator mock para desenvolvimento",
      );
      this.engine = new MockExtractionAdapter();
    }
    return this.engine;
  }
  async processExtraction(artifactId: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const artifact = await artifactRepository.findById(artifactId);
    if (!artifact) {
      throw new NotFoundError("Artifact", artifactId);
    }
    const engine = await this.getEngine();
    const result = await extractionRepository.createResult({
      artifact_id: artifactId,
      extraction_version: engine.getEngineVersion(),
      extracted_by: engine.getEngineName(),
    });
    try {
      const content = await this.readArtifactContent(artifact);
      const extractionOutput = await engine.extract(
        content,
        artifact.filename,
        artifact.format,
      );
      const calibratedFields = confidenceScorerService.calibrateFields(
        extractionOutput.extracted_fields,
      );
      const fieldInputs = calibratedFields.map((field) => ({
        result_id: result.id,
        field_type: field.field_type,
        extracted_value: field.extracted_value,
        confidence_score: field.confidence_score,
        source_evidence: field.source_evidence,
        source_line_number: field.source_line_number,
        metadata: field.metadata,
      }));
      const createdFields =
        await extractionRepository.createFields(fieldInputs);
      const overallConfidence =
        extractionOutput.overall_confidence ??
        Math.round(
          createdFields.reduce((s, f) => s + f.confidence_score, 0) /
            createdFields.length,
        );
      const flaggedCount = createdFields.filter((f) => f.is_flagged).length;
      const needsReview = createdFields.some((f) => f.requires_human_review);
      const duration = Date.now() - startTime;
      const updateInput: UpdateExtractionResultInput = {
        overall_confidence: overallConfidence,
        flagged_count: flaggedCount,
        completion_status: needsReview ? "needs_review" : "completed",
        extraction_completed_at: new Date(),
        extraction_duration_ms: duration,
        processing_notes: extractionOutput.processing_notes,
      };
      const updatedResult = await extractionRepository.updateResult(
        result.id,
        updateInput,
      );
      if (!updatedResult) {
        throw new Error("Failed to update extraction result");
      }
      await artifactRepository.update(artifactId, {
        status: "completed",
        extraction_model_version: engine.getEngineVersion(),
      });
      logger.info(
        {
          artifactId,
          extractionId: result.id,
          duration,
          fieldCount: createdFields.length,
          flaggedCount,
          overallConfidence,
        },
        "Extração concluída",
      );
      try {
        await complianceService.runComplianceCheck(result.id);
      } catch (err) {
        logger.error(
          { err, extractionId: result.id },
          "Análise de conformidade falhou",
        );
      }
      return updatedResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      await extractionRepository.updateResult(result.id, {
        completion_status: "failed",
        extraction_completed_at: new Date(),
        extraction_duration_ms: duration,
        processing_notes: `Extração falhou: ${(error as Error).message}`,
      });
      await artifactRepository.update(artifactId, {
        status: "failed",
        error_message: (error as Error).message,
      });
      logger.error({ err: error, artifactId, duration }, "Extração falhou");
      throw error;
    }
  }
  async getExtractionResult(
    extractionId: string,
  ): Promise<{ result: ExtractionResult; fields: ExtractedField[] }> {
    const result = await extractionRepository.findResultById(extractionId);
    if (!result) {
      throw new NotFoundError("Resultado de extração", extractionId);
    }
    const fields =
      await extractionRepository.findFieldsByResultId(extractionId);
    return { result, fields };
  }
  async getExtractionsList(
    page: number,
    pageSize: number,
    status?: string,
    artifactId?: string,
  ): Promise<{
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    extractions: Array<{
      extraction_id: string;
      artifact_id: string;
      artifact_filename: string;
      artifact_format: string;
      overall_confidence: number;
      flagged_count: number;
      completion_status: string;
      extraction_timestamp: string;
      extracted_by: string;
    }>;
  }> {
    const { rows, total } = await extractionRepository.findAll({
      page,
      page_size: pageSize,
      status,
      artifact_id: artifactId,
    });
    const artifactIds = [...new Set(rows.map((r) => r.artifact_id))];
    const artifacts = await Promise.all(
      artifactIds.map((id) => artifactRepository.findById(id)),
    );
    const artifactMap = new Map(
      artifacts.filter((a): a is Artifact => a !== null).map((a) => [a.id, a]),
    );
    return {
      page,
      page_size: pageSize,
      total_count: total,
      total_pages: Math.ceil(total / pageSize),
      extractions: rows.map((r) => {
        const artifact = artifactMap.get(r.artifact_id);
        return {
          extraction_id: r.id,
          artifact_id: r.artifact_id,
          artifact_filename: artifact?.filename ?? "Desconhecido",
          artifact_format: artifact?.format ?? "",
          overall_confidence: r.overall_confidence,
          flagged_count: r.flagged_count,
          completion_status: r.completion_status,
          extraction_timestamp:
            typeof r.extraction_timestamp === "string"
              ? r.extraction_timestamp
              : r.extraction_timestamp.toISOString(),
          extracted_by: r.extracted_by,
        };
      }),
    };
  }
  async getExtractionByArtifact(
    artifactId: string,
  ): Promise<{ result: ExtractionResult; fields: ExtractedField[] } | null> {
    const result =
      await extractionRepository.findResultByArtifactId(artifactId);
    if (!result) return null;
    const fields = await extractionRepository.findFieldsByResultId(result.id);
    return { result, fields };
  }
  async getFlaggedFields(
    extractionId: string,
  ): Promise<{ result: ExtractionResult; flaggedFields: ExtractedField[] }> {
    const result = await extractionRepository.findResultById(extractionId);
    if (!result) {
      throw new NotFoundError("Resultado de extração", extractionId);
    }
    const flaggedFields =
      await extractionRepository.findFlaggedFieldsByResultId(extractionId);
    return { result, flaggedFields };
  }
  private async readArtifactContent(artifact: Artifact): Promise<string> {
    const filePath = path.resolve(UPLOAD_DIR, artifact.storage_path);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError(`Arquivo não encontrado: ${filePath}`);
    }
    const textFormats = [
      "MARKDOWN",
      "TXT",
      "PY",
      "JS",
      "TS",
      "JAVA",
      "CS",
      "GO",
      "RUST",
      "JSON",
      "YAML",
    ];
    if (textFormats.includes(artifact.format)) {
      return await fs.readFile(filePath, "utf-8");
    }
    if (artifact.format === "PDF") {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }
    if (artifact.format === "DOCX") {
      const buffer = await fs.readFile(filePath);
      return await this.extractDocxText(buffer);
    }
    return `[Formato não suportado para leitura: ${artifact.format}]`;
  }
  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const docFile = zip.file("word/document.xml");
      if (!docFile) {
        return "[DOCX: document.xml não encontrado]";
      }
      const docXml: string = await docFile.async("string");
      const textMatches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const texts = textMatches.map((m: string) =>
        m.replace(/<\/?w:t[^>]*>/g, ""),
      );
      return texts.join("").trim() || "[DOCX: Nenhum texto encontrado]";
    } catch (err) {
      logger.error({ err }, "Falha ao extrair texto do DOCX");
      return `[Erro ao extrair texto do DOCX: ${(err as Error).message}]`;
    }
  }
}
export const extractionService = new ExtractionService();
