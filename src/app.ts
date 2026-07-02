import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fs from "fs/promises";
import path from "path";
import { logger } from "./utils/loggerUtil";
import { registerCors } from "./middleware/cors.middleware";
import { registerErrorHandler } from "./middleware/error.middleware";
import { registerLogging } from "./middleware/logging.middleware";
import { registerAuth } from "./middleware/auth.middleware";
import { registerUploadRoutes } from "./routes/uploads.routes";
import { registerExtractionRoutes } from "./routes/extractions.routes";
import { registerComplianceRoutes } from "./routes/compliance.routes";
import { registerAuthRoutes } from "./routes/auth.routes";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 10485760,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "request_id",
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10485760,
      files: 10,
    },
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    if (typeof body === "string") {
      if (body.trim() === "") {
        done(null, {});
      } else {
        try {
          done(null, JSON.parse(body));
        } catch (err) {
          done(err as Error);
        }
      }
    } else {
      done(null, {});
    }
  });

  await registerCors(app);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
  await registerLogging(app);
  await registerErrorHandler(app);
  await registerAuth(app);

  app.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
      database: "supabase",
    };
  });

  await app.register(
    async (instance) => {
      await registerUploadRoutes(instance);
      await registerExtractionRoutes(instance);
      await registerComplianceRoutes(instance);
      await registerAuthRoutes(instance);
    },
    { prefix: "/api/v1" },
  );

  const isProduction = process.env.NODE_ENV === "production";
  const publicDir =
    process.env.PUBLIC_DIR || path.resolve(__dirname, "../../../../frontend/dist");

  app.setNotFoundHandler(async (request, reply) => {
    if (!isProduction) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    const apiPattern = /^\/api\//;
    if (apiPattern.test(request.url)) {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
      });
    }

    const safePath = request.url.split("?")[0].replace(/\.\./g, "");
    const filePath = path.join(publicDir, safePath);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = await fs.readFile(filePath);
        return reply.status(200).headers({ "content-type": contentType }).send(content);
      }
    } catch {
      // file not found, fall through to SPA
    }

    const indexPath = path.join(publicDir, "index.html");
    try {
      const content = await fs.readFile(indexPath);
      return reply.status(200).headers({ "content-type": "text/html; charset=UTF-8" }).send(content);
    } catch {
      return reply.status(404).send({
        error: "NOT_FOUND",
        message: "Resource not found",
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (isProduction) {
    logger.info({ publicDir }, "Production mode: serving static files");
  }

  return app;
}

async function start(): Promise<void> {
  try {
    const uploadDir = process.env.STORAGE_UPLOAD_DIR || path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    logger.info({ uploadDir }, "Upload directory ready");

    const app = await buildApp();
    const port = parseInt(process.env.PORT ?? "3000", 10);
    const host = process.env.HOST ?? "0.0.0.0";

    await app.listen({ port, host });
    logger.info({ port, host }, "Server started");

    const { closeQueue } = await import("./queues/extractionQueue");

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Shutting down gracefully");
      await app.close();
      await closeQueue();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

start();
