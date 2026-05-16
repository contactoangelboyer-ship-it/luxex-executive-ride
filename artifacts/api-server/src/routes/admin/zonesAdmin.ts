import { Router } from "express";
import { db } from "@workspace/db";
import { zones, promotions } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/zones", requireAdmin, async (req, res) => {
  try { res.json(await db.select().from(zones).orderBy(desc(zones.createdAt))); }
  catch (err) { logger.error({ err }, "Failed to list zones"); res.status(500).json({ error: "Failed" }); }
});

router.post("/zones", requireAdmin, async (req, res) => {
  try { const [z] = await db.insert(zones).values(req.body).returning(); res.status(201).json(z); }
  catch (err) { logger.error({ err }, "Failed to create zone"); res.status(500).json({ error: "Failed" }); }
});

router.patch("/zones/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(zones).set(req.body).where(eq(zones.id, Number(req.params.id))).returning();
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update zone"); res.status(500).json({ error: "Failed" }); }
});

router.delete("/zones/:id", requireAdmin, async (req, res) => {
  try { await db.delete(zones).where(eq(zones.id, Number(req.params.id))); res.json({ success: true }); }
  catch (err) { logger.error({ err }, "Failed to delete zone"); res.status(500).json({ error: "Failed" }); }
});

router.get("/promotions", requireAdmin, async (req, res) => {
  try { res.json(await db.select().from(promotions).orderBy(desc(promotions.createdAt))); }
  catch (err) { logger.error({ err }, "Failed to list promotions"); res.status(500).json({ error: "Failed" }); }
});

router.post("/promotions", requireAdmin, async (req, res) => {
  try { const [p] = await db.insert(promotions).values(req.body).returning(); res.status(201).json(p); }
  catch (err) { logger.error({ err }, "Failed to create promotion"); res.status(500).json({ error: "Failed" }); }
});

router.patch("/promotions/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(promotions).set(req.body).where(eq(promotions.id, Number(req.params.id))).returning();
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update promotion"); res.status(500).json({ error: "Failed" }); }
});

router.delete("/promotions/:id", requireAdmin, async (req, res) => {
  try { await db.delete(promotions).where(eq(promotions.id, Number(req.params.id))); res.json({ success: true }); }
  catch (err) { logger.error({ err }, "Failed to delete promotion"); res.status(500).json({ error: "Failed" }); }
});

export default router;
