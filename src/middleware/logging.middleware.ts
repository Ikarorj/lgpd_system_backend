import { FastifyInstance } from "fastify";
import { logger } from "../utils/loggerUtil";
export async function registerLogging(app: FastifyInstance): Promise<void> {
  app.addHook("onResponse", async (request, reply) => {
    const duration = reply.elapsedTime;
    const childLogger = logger.child({
      requestId: request.id,
      method: request.method,
      url: request.url,
    });
    childLogger.info(
      {
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
        contentType: reply.getHeader("content-type"),
      },
      "Request completed",
    );
  });
}
