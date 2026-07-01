import { FastifyInstance } from "fastify";
import {
  uploadArtifacts,
  getUploadStatus,
  getArtifact,
} from "../controllers/upload.controller";
import { uploadSchemas, validate } from "../utils/requestValidator";
export async function registerUploadRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post(
    "/artifacts/upload",
    { preValidation: [app.authenticate] },
    uploadArtifacts,
  );
  app.get(
    "/artifacts/upload/:uploadSessionId",
    {
      preValidation: [app.authenticate],
      preHandler: validate(uploadSchemas.getUploadStatus),
    },
    getUploadStatus,
  );
  app.get(
    "/artifacts/:artifactId",
    {
      preValidation: [app.authenticate],
      preHandler: validate(uploadSchemas.getArtifact),
    },
    getArtifact,
  );
}
