import { FastifyRequest, FastifyReply } from "fastify";
import { artifactService } from "../services/artifact.service";
import { BadRequestError, NotFoundError } from "../utils/errorHandlerUtil";
import { JwtPayload } from "../middleware/auth.middleware";
interface UploadFile {
  filename: string;
  mimetype: string;
  data: Buffer;
  size: number;
}
export async function uploadArtifacts(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = (request.user as JwtPayload | undefined) ?? null;
  if (!user) {
    throw new BadRequestError("User not authenticated");
  }
  const uploadedFiles: UploadFile[] = [];
  let batchId: string | undefined;
  if (request.isMultipart()) {
    for await (const part of request.files()) {
      if (part.type === "file") {
        const buffer = await part.toBuffer();
        uploadedFiles.push({
          filename: part.filename,
          mimetype: part.mimetype,
          data: buffer,
          size: buffer.length,
        });
      } else if (part.type === "field") {
        if (part.fieldname === "batch_id") {
          batchId = (part as unknown as { value: string }).value;
        }
      }
    }
  }
  if (uploadedFiles.length === 0) {
    throw new BadRequestError("No files provided");
  }
  const session = await artifactService.uploadFiles(
    uploadedFiles,
    user.user_id,
    batchId,
  );
  reply
    .status(202)
    .send({
      upload_session_id: session.session_id,
      batch_id: session.batch_id,
      files: session.files,
      total_files: session.total_files,
      total_size_bytes: session.total_size_bytes,
      next_step: "extraction_available",
    });
}
export async function getUploadStatus(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { uploadSessionId } = request.params as { uploadSessionId: string };
  const session = await artifactService.getUploadStatus(uploadSessionId);
  if (!session) {
    throw new NotFoundError("Upload session", uploadSessionId);
  }
  reply.send(session);
}
export async function getArtifact(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { artifactId } = request.params as { artifactId: string };
  const artifact = await artifactService.getArtifact(artifactId);
  if (!artifact) {
    throw new NotFoundError("Artifact", artifactId);
  }
  reply.send({
    artifact_id: artifact.id,
    filename: artifact.filename,
    format: artifact.format,
    size_bytes: artifact.size_bytes,
    upload_timestamp: artifact.upload_timestamp,
    uploaded_by: artifact.uploaded_by,
    status: artifact.status,
    extraction_status:
      artifact.status === "completed" ? "completed" : artifact.status,
    extraction_results_available: artifact.status === "completed",
  });
}
