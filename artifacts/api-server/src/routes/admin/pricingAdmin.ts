import { Router } from "express";
import { db } from "@workspace/db";
import { pricingConfig } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { logger } from "../../lib/logger";

const DEFAULT_PRICING = [
  { vehicleType: "sedan",  baseRate: 75,  perMile: 3.75, hourlyRate: 90,  minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15 },
  { vehicleType: "suv",    baseRate: 95,  perMile: 4.75, hourlyRate: 115, minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15 },
  { vehicleType: "van",    baseRate: 135, perMile: 5.75, hourlyRate: 150, minMiles: 15, airportFee: 55, afterHoursPct: 25, weekendPct: 15 },
  { vehicleType: "limo",   baseRate: 200, perMile: 6.50, hourlyRate: 200, minMiles: 20, airportFee: 65, afterHoursPct: 30, weekendPct: 20 },
];

const router = Router();

router.get("/pricing", requireAdmin, async (req, res) => {
  try {
    const data = await db.select().from(pricingConfig);
    if (data.length === 0) {
      await db.insert(pricingConfig).values(DEFAULT_PRICING).onConflictDoNothing();
      const seeded = await db.select().from(pricingConfig);
      res.json(seeded);
    } else {
      res.json(data);
    }
  } catch (err) { logger.error({ err }, "Failed to get pricing"); res.status(500).json({ error: "Failed" }); }
});

router.patch("/pricing/:vehicleType", requireAdmin, async (req, res) => {
  try {
    const vt = String(req.params.vehicleType);
    const [updated] = await db.update(pricingConfig)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(pricingConfig.vehicleType, vt))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update pricing"); res.status(500).json({ error: "Failed" }); }
});

export default router;
