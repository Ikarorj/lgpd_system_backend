import { FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./loggerUtil";
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;
  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = "AppError";
  }
}
export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, "BAD_REQUEST", message, details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      "NOT_FOUND",
      `${resource} not found${id ? `: ${id}` : ""}`,
      id ? { resource, id } : { resource },
    );
  }
}
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, "CONFLICT", message, details);
  }
}
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  request_id: string;
}
export function formatErrorResponse(
  reply: FastifyReply,
  error: Error,
  requestId?: string,
): FastifyReply {
  const request_id = requestId ?? uuidv4();
  if (error instanceof AppError) {
    const body: ErrorResponse = {
      error: error.errorCode,
      message: error.message,
      timestamp: new Date().toISOString(),
      request_id,
    };
    if (error.details) {
      body.details = error.details;
    }
    return reply.status(error.statusCode).send(body);
  }
  logger.error(
    { err: error, request_id, stack: error.stack },
    "Unhandled error",
  );
  return reply
    .status(500)
    .send({
      error: "INTERNAL_ERROR",
      message: `Erro interno: ${error.message}`,
      timestamp: new Date().toISOString(),
      request_id,
    } satisfies ErrorResponse);
}
