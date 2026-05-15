// Diagnostic serverless — minimal express app to isolate crash cause
  process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT]", err?.stack ?? err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[UNHANDLED REJECTION]", reason);
  });

  import express from "express";

  const app = express();

  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  export default app;
  