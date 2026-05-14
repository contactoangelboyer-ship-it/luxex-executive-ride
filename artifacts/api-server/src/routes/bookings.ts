import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, pricingConfig, adminDrivers, vehicles, zones, promotions } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sendCustomerConfirmation, sendAdminNotification } from "../lib/mailer";

const router = Router();

function generateCode(): string {
  return "LX" + Math.random().toString(36).toUpperCase().slice(2, 8);
}

router.get("/pricing", async (_req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const configs = await db.select().from(pricingConfig);
    res.json(configs);
  } catch {
    res.json([]);
  }
});

router.get("/vehicles", async (_req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const rows = await db.select().from(vehicles).where(eq(vehicles.status, "active"));
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.get("/zones", async (_req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const rows = await db.select().from(zones).where(eq(zones.active, true));
    res.json(rows);
  } catch {
    res.json([]);
  }
});

router.get("/promotions/validate", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const code = (req.query.code as string)?.toUpperCase();
    if (!code) { res.status(400).json({ error: "code required" }); return; }
    const now = new Date();
    const [promo] = await db.select().from(promotions).where(eq(promotions.code, code));
    if (!promo || !promo.active) { res.status(404).json({ error: "Invalid promo code" }); return; }
    if (promo.expiresAt && promo.expiresAt < now) { res.status(400).json({ error: "Promo code expired" }); return; }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) { res.status(400).json({ error: "Promo code exhausted" }); return; }
    res.json({ valid: true, type: promo.type, value: promo.value, description: promo.description });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to validate promo" });
  }
});

router.get("/bookings/passenger", async (req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const result = await db.select().from(bookings)
      .where(eq(bookings.passengerEmail, email));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.json([]);
  }
});

router.get("/bookings/driver", async (req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.email, email));
    if (!driver) { res.json([]); return; }
    const result = await db.select().from(bookings).where(eq(bookings.driverId, driver.id));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.json([]);
  }
});

router.get("/bookings/confirm/:code", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const [booking] = await db.select().from(bookings).where(eq(bookings.confirmationCode, req.params.code));
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    res.json(booking);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const id = Number(req.params.id);
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    if (booking.passengerEmail !== email) { res.status(403).json({ error: "Unauthorized" }); return; }
    if (!["pending", "confirmed"].includes(booking.status)) {
      res.status(400).json({ error: "Cannot cancel this booking" }); return;
    }
    const [updated] = await db.update(bookings).set({ status: "cancelled" })
      .where(eq(bookings.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

router.patch("/bookings/:id/driver-status", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const id = Number(req.params.id);
    const { email, status } = req.body;
    if (!email || !status) { res.status(400).json({ error: "email and status required" }); return; }
    const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.email, email));
    if (!driver) { res.status(403).json({ error: "Driver not found" }); return; }
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    if (booking.driverId !== driver.id) { res.status(403).json({ error: "Unauthorized" }); return; }
    const ALLOWED: Record<string, string[]> = {
      assigned: ["in_progress"],
      in_progress: ["completed"],
    };
    if (!ALLOWED[booking.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from ${booking.status} to ${status}` }); return;
    }
    const [updated] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const {
      service, pickupAddress, pickupLat, pickupLon, dropoffAddress,
      dropoffLat, dropoffLon, date, time, passengers, bags, hours,
      vehicleType, flightNumber, flightType, passengerName, passengerPhone,
      passengerEmail, notes, meetAndGreet, childSeat,
      baseAmount, mileageAmount, surchargesAmount, tollsAmount, totalAmount,
      distanceMiles, promoCode, promoDiscount,
    } = req.body;

    if (!service || !pickupAddress || !date || !time || !passengerName || !passengerPhone || !passengerEmail) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const confirmationCode = generateCode();

    const [booking] = await db.insert(bookings).values({
      confirmationCode, service, status: "pending",
      pickupAddress, pickupLat, pickupLon,
      dropoffAddress, dropoffLat, dropoffLon,
      date, time, passengers: passengers ?? 1, bags: bags ?? 1, hours,
      vehicleType, flightNumber, flightType,
      passengerName, passengerPhone, passengerEmail,
      notes, meetAndGreet: !!meetAndGreet, childSeat: !!childSeat,
      baseAmount: baseAmount ?? 0, mileageAmount: mileageAmount ?? 0,
      surchargesAmount: surchargesAmount ?? 0, tollsAmount: tollsAmount ?? 0,
      totalAmount: totalAmount ?? 0, distanceMiles: distanceMiles ?? 0,
      promoCode, promoDiscount: promoDiscount ?? 0,
    }).returning();

    res.status(201).json({ booking, confirmationCode });

    // Fire-and-forget emails
    sendCustomerConfirmation(booking).catch(() => {});
    sendAdminNotification(booking).catch(() => {});
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
