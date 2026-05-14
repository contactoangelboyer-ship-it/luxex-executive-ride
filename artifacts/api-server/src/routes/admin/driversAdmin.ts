import { Router } from "express";
import { db } from "@workspace/db";
import { drivers } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

router.get("/drivers", requireAdmin, async (req, res) => {
  try {
    const data = await db.select().from(drivers).orderBy(desc(drivers.createdAt));
    res.json(data);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/drivers/:id", requireAdmin, async (req, res) => {
  try {
    const [d] = await db.select().from(drivers).where(eq(drivers.id, Number(req.params.id)));
    if (!d) { res.status(404).json({ error: "Not found" }); return; }
    res.json(d);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/drivers", requireAdmin, async (req, res) => {
  try {
    const [driver] = await db.insert(drivers).values(req.body).returning();
    res.status(201).json(driver);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to create driver" }); }
});

router.patch("/drivers/:id", requireAdmin, async (req, res) => {
  try {
    const [updated] = await db.update(drivers).set({ ...req.body, updatedAt: new Date() }).where(eq(drivers.id, Number(req.params.id))).returning();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to update" }); }
});

router.delete("/drivers/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(drivers).where(eq(drivers.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to delete" }); }
});

export default router;
