import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { supabaseAdmin } from "../utils/supabaseAdminClient";
import { artifactRepository } from "../repositories/artifact.repository";
import { fileValidatorService } from "./fileValidator.service";
import { enqueueExtraction } from "../queues/extractionQueue";
import { logger } from "../utils/loggerUtil";
import { BadRequestError } from "../utils/errorHandlerUtil";
import { Artifact } from "../models/artifact.model";
import { ArtifactFormat } from "../../shared/types/apiContracts.types";

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "artifacts";
export interface UploadFileInput {
  filename: string;
  mimetype: string;
  data: Buffer;
  size: number;
}
export interface UploadSession {
  session_id: string;
  batch_id: string;
  files: UploadFileStatus[];
  total_files: number;
  total_size_bytes: number;
  overall_status: "uploading" | "completed" | "completed_with_errors";
  completed_at?: string;
}
interface UploadFileStatus {
  artifact_id: string;
  filename: string;
  format: string;
  status: string;
  progress_percent: number;
  size_bytes?: number;
  content_hash?: string;
  validation_status?: string;
  error?: string;
  error_message?: string;
}
const uploadSessions = new Map<string, UploadSession>();
export class ArtifactService {
  async uploadFiles(
    files: UploadFileInput[],
    userId: string,
    batchId?: string,
  ): Promise<UploadSession> {
    const validation = await fileValidatorService.validateFiles(files);
    if (!validation.valid) {
      throw new BadRequestError("File validation failed", {
        errors: validation.errors,
      });
    }
    const sessionId = uuidv4();
    const batch = batchId ?? `batch_${Date.now()}`;
    const fileStatuses: UploadFileStatus[] = [];
    const artifacts: Artifact[] = [];
    for (const validatedFile of validation.validatedFiles) {
      const contentHash = await this.calculateHash(validatedFile.data);
      const safeFilename = this.sanitizeFilename(validatedFile.filename);
      const storagePath = `${sessionId}/${safeFilename}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, validatedFile.data, {
          contentType: validatedFile.mimetype,
          upsert: false,
        });
      if (uploadError) {
        throw new BadRequestError("Falha ao salvar arquivo no storage", {
          error: uploadError.message,
        });
      }
      const artifact = await artifactRepository.create({
        filename: validatedFile.filename,
        format: validatedFile.format as ArtifactFormat,
        size_bytes: validatedFile.size_bytes,
        uploaded_by: userId,
        content_hash: contentHash,
        storage_path: storagePath,
      });
      artifacts.push(artifact);
      fileStatuses.push({
        artifact_id: artifact.id,
        filename: validatedFile.filename,
        format: validatedFile.format,
        status: "completed",
        progress_percent: 100,
        size_bytes: validatedFile.size_bytes,
        content_hash: contentHash,
        validation_status: "valid",
      });
    }
    const session: UploadSession = {
      session_id: sessionId,
      batch_id: batch,
      files: fileStatuses,
      total_files: fileStatuses.length,
      total_size_bytes: fileStatuses.reduce(
        (s, f) => s + (f.size_bytes ?? 0),
        0,
      ),
      overall_status: "completed",
      completed_at: new Date().toISOString(),
    };
    uploadSessions.set(sessionId, session);
    for (const artifact of artifacts) {
      await artifactRepository.update(artifact.id, { status: "processing" });
      enqueueExtraction({
        artifact_id: artifact.id,
        filename: artifact.filename,
        format: artifact.format,
        storage_path: artifact.storage_path,
        user_id: userId,
        extraction_version: "1.0.0",
      }).catch((err) => {
        logger.error(
          { err, artifactId: artifact.id },
          "Extraction failed, upload continued",
        );
        artifactRepository.update(artifact.id, {
          status: "failed",
          error_message: (err as Error).message,
        });
      });
    }
    logger.info(
      { sessionId, fileCount: artifacts.length, userId },
      "Upload completed",
    );
    return session;
  }
  async getUploadStatus(sessionId: string): Promise<UploadSession | null> {
    return uploadSessions.get(sessionId) ?? null;
  }
  async getArtifact(artifactId: string): Promise<Artifact | null> {
    return artifactRepository.findById(artifactId);
  }
  private sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    const ext = path.extname(base);
    const name = path.basename(base, ext);
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 64);
    return `${safe}_${uuidv4().slice(0, 8)}${ext}`;
  }
  private async calculateHash(data: Buffer): Promise<string> {
    return createHash("sha256").update(data).digest("hex");
  }
}
export const artifactService = new ArtifactService();
