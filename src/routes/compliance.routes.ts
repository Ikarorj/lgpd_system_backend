import { FastifyInstance } from "fastify";
import {
  getComplianceReport,
  runComplianceCheck,
  updateViolationStatus,
} from "../controllers/compliance.controller";
import { generateOpinion } from "../controllers/opinion.controller";
import { complianceSchemas, validate } from "../utils/requestValidator";
export async function registerComplianceRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/extractions/:extractionId/compliance",
    {
      preValidation: [app.authenticate],
      preHandler: validate(complianceSchemas.getReport),
    },
    getComplianceReport,
  );
  app.post(
    "/extractions/:extractionId/compliance/run",
    {
      preValidation: [app.authenticate],
      preHandler: validate(complianceSchemas.runCheck),
    },
    runComplianceCheck,
  );
  app.post(
    "/extractions/:extractionId/opinion",
    {
      preValidation: [app.authenticate],
      preHandler: validate(complianceSchemas.generateOpinion),
    },
    generateOpinion,
  );
  app.patch(
    "/compliance/violations/:violationId",
    {
      preValidation: [app.authenticate],
      preHandler: validate(complianceSchemas.updateViolation),
    },
    updateViolationStatus,
  );
}
