import { ArtifactService } from "../../../src/services/artifact.service";
import { artifactRepository } from "../../../src/repositories/artifact.repository";
import { fileValidatorService } from "../../../src/services/fileValidator.service";
jest.mock("../../../src/repositories/artifact.repository");
jest.mock("../../../src/services/fileValidator.service");
jest.mock("../../../src/queues/extractionQueue", () => ({
  enqueueExtraction: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));
const mockedRepo = jest.mocked(artifactRepository);
const mockedValidator = jest.mocked(fileValidatorService);
describe("ArtifactService", () => {
  let service: ArtifactService;
  beforeEach(() => {
    service = new ArtifactService();
    jest.resetAllMocks();
  });
  describe("uploadFiles", () => {
    const validFile = {
      filename: "test.pdf",
      mimetype: "application/pdf",
      data: Buffer.from("test content"),
      size: 100,
    };
    it("should upload valid files successfully", async () => {
      mockedValidator.validateFiles.mockReturnValue({
        valid: true,
        validatedFiles: [
          {
            filename: "test.pdf",
            format: "PDF",
            size_bytes: 100,
            data: Buffer.from("test content"),
          },
        ],
        errors: [],
      });
      mockedRepo.create.mockResolvedValue({
        id: "artifact-1",
        filename: "test.pdf",
        format: "PDF" as const,
        size_bytes: 100,
        upload_timestamp: new Date(),
        uploaded_by: "user-1",
        content_hash: "hash",
        storage_path: "uploads/session/test.pdf",
        status: "processing" as const,
        extraction_model_version: null,
        error_message: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockedRepo.update.mockResolvedValue(null as any);
      const result = await service.uploadFiles([validFile], "user-1");
      expect(result.total_files).toBe(1);
      expect(result.overall_status).toBe("completed");
      expect(result.files[0].status).toBe("completed");
      expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    });
    it("should throw on validation failure", async () => {
      mockedValidator.validateFiles.mockReturnValue({
        valid: false,
        validatedFiles: [],
        errors: ["test.pdf: Invalid format"],
      });
      await expect(service.uploadFiles([validFile], "user-1")).rejects.toThrow(
        "File validation failed",
      );
    });
    it("should handle empty file list", async () => {
      await expect(service.uploadFiles([], "user-1")).rejects.toThrow();
    });
  });
  describe("getUploadStatus", () => {
    it("should return null for unknown session", async () => {
      const result = await service.getUploadStatus("unknown");
      expect(result).toBeNull();
    });
  });
  describe("getArtifact", () => {
    it("should return artifact by id", async () => {
      const mockArtifact = {
        id: "artifact-1",
        filename: "test.pdf",
        format: "PDF" as const,
        size_bytes: 100,
        upload_timestamp: new Date(),
        uploaded_by: "user-1",
        content_hash: "hash",
        storage_path: "path",
        status: "completed" as const,
        extraction_model_version: null,
        error_message: null,
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockedRepo.findById.mockResolvedValue(mockArtifact);
      const result = await service.getArtifact("artifact-1");
      expect(result).toEqual(mockArtifact);
    });
    it("should return null when not found", async () => {
      mockedRepo.findById.mockResolvedValue(null);
      const result = await service.getArtifact("unknown");
      expect(result).toBeNull();
    });
  });
});
