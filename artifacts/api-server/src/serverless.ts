import express from "express";
  import cors from "cors";
  import router from "./routes";

  // Serverless entry point for Vercel.
  // Intentionally does NOT use pino-http request logging middleware to keep
  // the cold-start path free of pino worker-thread / eval dependencies.
  // Individual routes that need structured logging use the pino logger directly.

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  export default app;
  