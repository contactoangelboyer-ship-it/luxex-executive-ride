import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run migration in background after server is up — never blocks startup
function runMigrationsInBackground() {
  if (!db) return;
  const timeout = setTimeout(() => {
    logger.warn("Startup migration timed out (non-fatal)");
  }, 10_000);
  db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)`)
    .then(() => { clearTimeout(timeout); logger.info("Startup migration: trip_type ensured"); })
    .catch((err) => { clearTimeout(timeout); logger.warn({ err }, "Startup migration warning (non-fatal)"); });
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startScheduler();
  runMigrationsInBackground();
});
