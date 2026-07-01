import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { formatErrorResponse } from "../utils/errorHandlerUtil";
import { logger } from "../utils/loggerUtil";
export async function registerErrorHandler(
  app: FastifyInstance,
): Promise<void> {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers["x-request-id"] as string) ?? "";
    if ("validation" in error && error.validation) {
      logger.warn(
        { validation: error.validation, url: request.url },
        "Request validation failed",
      );
      return reply
        .status(400)
        .send({
          error: "VALIDATION_ERROR",
          message: "Dados inválidos. Verifique os campos enviados.",
          timestamp: new Date().toISOString(),
          request_id: requestId,
        });
    }
    return formatErrorResponse(reply, error, requestId);
  });
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers["x-request-id"] as string) ?? "";
    logger.warn(
      { method: request.method, url: request.url, requestId },
      "Route not found",
    );
    reply
      .status(404)
      .send({
        error: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      });
  });
}
