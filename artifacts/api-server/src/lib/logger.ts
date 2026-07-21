import pino from "pino";

  const isProduction = process.env.NODE_ENV === "production";

  // NOTE: do NOT add a `redact` option here — pino's redaction uses new Function() (fast-redact)
  // which is blocked in some serverless environments (Vercel Node.js 22).
  // Sensitive fields are kept out of logs at the route level instead.
  export const logger = pino({
    level: process.env.LOG_LEVEL ?? "info",
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  });
  