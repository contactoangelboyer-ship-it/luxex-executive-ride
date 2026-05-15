// Debug step 2: app middleware imports only (no router)
  import express from "express";
  import cors from "cors";
  import pinoHttp from "pino-http";
  import { logger } from "./lib/logger";

  const app = express();
  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json());

  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok-step2", ts: new Date().toISOString() });
  });

  export default app;
  