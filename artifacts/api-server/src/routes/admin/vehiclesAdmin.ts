import { Router } from "express";
import { db } from "@workspace/db";
import { vehicles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

router.get("/vehicles", requireAdmin, async (req, res) => {
  try {
    const data = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
    res.json(data);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/vehicles", requireAdmin, async (req, res) => {
  try {
    const [v] = await db.insert(vehicles).values(req.body).returning();
    res.status(201).json(v);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to create" }); }
});

router.patch("/vehicles/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(vehicles).set({ ...req.body, updatedAt: new Date() }).where(eq(vehicles.id, Number(req.params.id))).returning();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to update" }); }
});

router.delete("/vehicles/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(vehicles).where(eq(vehicles.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to delete" }); }
});

export default router;
