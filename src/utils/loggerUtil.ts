import pino from "pino";
const level = process.env.LOG_LEVEL ?? "info";
export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: { ...req.headers, authorization: "[REDACTED]" },
    }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: pino.stdSerializers.err,
  },
});
