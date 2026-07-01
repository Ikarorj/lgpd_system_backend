import { FastifyInstance } from "fastify";
import {
  getExtractionResult,
  getFlaggedFields,
  getExtractionByArtifact,
  getExtractionsList,
} from "../controllers/extraction.controller";
import { extractionSchemas, validate } from "../utils/requestValidator";
export async function registerExtractionRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/extractions/by-artifact/:artifactId",
    {
      preValidation: [app.authenticate],
      preHandler: validate(extractionSchemas.getByArtifact),
    },
    getExtractionByArtifact,
  );
  app.get(
    "/extractions",
    {
      preValidation: [app.authenticate],
      preHandler: validate(extractionSchemas.getList),
    },
    getExtractionsList,
  );
  app.get(
    "/extractions/:extractionId",
    {
      preValidation: [app.authenticate],
      preHandler: validate(extractionSchemas.getResult),
    },
    getExtractionResult,
  );
  app.get(
    "/extractions/:extractionId/flagged",
    {
      preValidation: [app.authenticate],
      preHandler: validate(extractionSchemas.getFlagged),
    },
    getFlaggedFields,
  );
}
