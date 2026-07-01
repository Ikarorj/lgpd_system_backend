import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
export async function registerCors(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin:
      process.env.CORS_ORIGIN?.split(",") ??
      (process.env.NODE_ENV === "development"
        ? true
        : ["http://localhost:5173"]),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    credentials: true,
    maxAge: 86400,
  });
}
