import { Router } from "express";
import { db } from "@workspace/db";
import { siteVisits } from "@workspace/db/schema";
import { updateOnline } from "../lib/onlineUsers";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/analytics/visit
 * Called by the frontend on every page navigation.
 * Records the visit and marks the session as online.
 */
router.post("/analytics/visit", async (req, res) => {
  const { sessionId, page } = req.body ?? {};
  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  updateOnline(sessionId);

  if (db) {
    try {
      await db.insert(siteVisits).values({
        sessionId,
        page: (page as string) ?? "/",
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      });
    } catch (err) {
      logger.warn({ err }, "Failed to record site visit");
    }
  }

  res.json({ ok: true });
});

/**
 * POST /api/analytics/ping
 * Heartbeat to keep the session counted as "online".
 */
router.post("/analytics/ping", (req, res) => {
  const { sessionId } = req.body ?? {};
  if (sessionId) updateOnline(sessionId as string);
  res.json({ ok: true });
});

export default router;
