// Debug step 3: only pino logger, no pino-http
  import express from "express";
  import { logger } from "./lib/logger";

  const app = express();
  app.use(express.json());

  app.get("/api/healthz", (_req, res) => {
    logger.info("[test] health check");
    res.json({ status: "ok-step3-logger", ts: new Date().toISOString() });
  });

  export default app;
  