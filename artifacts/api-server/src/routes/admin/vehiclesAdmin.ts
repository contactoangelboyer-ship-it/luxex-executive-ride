import { Router } from "express";
import { db } from "@workspace/db";
import { vehicles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/vehicles", requireAdmin, async (req, res) => {
  try {
    const data = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
    res.json(data);
  } catch (err) { logger.error({ err }, "Failed to list vehicles"); res.status(500).json({ error: "Failed" }); }
});

router.post("/vehicles", requireAdmin, async (req, res) => {
  try {
    const [v] = await db.insert(vehicles).values(req.body).returning();
    res.status(201).json(v);
  } catch (err) { logger.error({ err }, "Failed to create vehicle"); res.status(500).json({ error: "Failed to create" }); }
});

router.patch("/vehicles/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(vehicles).set({ ...req.body, updatedAt: new Date() }).where(eq(vehicles.id, Number(req.params.id))).returning();
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update vehicle"); res.status(500).json({ error: "Failed to update" }); }
});

router.delete("/vehicles/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(vehicles).where(eq(vehicles.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) { logger.error({ err }, "Failed to delete vehicle"); res.status(500).json({ error: "Failed to delete" }); }
});

export default router;
