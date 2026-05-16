import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, pricingConfig, adminDrivers, vehicles, zones, promotions } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendCustomerConfirmation, sendAdminNotification, sendStatusUpdate, sendAdminStatusUpdate, sendPostTripSummary } from "../lib/mailer";
import { logger } from "../lib/logger";

const router = Router();

function generateCode(): string {
  return "LX-" + Math.random().toString(36).toUpperCase().slice(2, 8);
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
    const rows = await db.select({ type: vehicles.type }).from(vehicles).where(eq(vehicles.status, "active"));
    const activeTypes = [...new Set(rows.map((r) => r.type))];
    res.json(activeTypes);
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
    logger.error({ err }, "Failed to validate promo");
    res.status(500).json({ error: "Failed to validate promo" });
  }
});

router.get("/bookings/track", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const code = String(req.query.code ?? "").toUpperCase().trim();
    if (!code) { res.status(400).json({ error: "Confirmation code required" }); return; }

    const [booking] = await db.select().from(bookings).where(eq(bookings.confirmationCode, code));
    if (!booking) { res.status(404).json({ error: "Booking not found. Please check your confirmation code." }); return; }

    let driverName: string | null = null;
    let driverPhone: string | null = null;
    if (booking.driverId) {
      const [driver] = await db
        .select({ name: adminDrivers.name, phone: adminDrivers.phone })
        .from(adminDrivers)
        .where(eq(adminDrivers.id, booking.driverId));
      if (driver) { driverName = driver.name; driverPhone = driver.phone; }
    }

    res.json({
      confirmationCode: booking.confirmationCode,
      status: booking.status,
      service: booking.service,
      date: booking.date,
      time: booking.time,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      vehicleType: booking.vehicleType,
      passengers: booking.passengers,
      flightNumber: booking.flightNumber ?? null,
      driverName,
      driverPhone,
    });
  } catch (err) {
    logger.error({ err }, "Failed to track booking");
    res.status(500).json({ error: "Failed to track booking" });
  }
});

router.get("/bookings/passenger", async (req, res) => {
  try {
    if (!db) { res.json([]); return; }
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const result = await db.select().from(bookings).where(eq(bookings.passengerEmail, email));
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to load passenger bookings");
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
    logger.error({ err }, "Failed to load driver bookings");
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
    logger.error({ err }, "Failed to get booking by confirmation code");
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
    const [updated] = await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, id)).returning();
    res.json(updated);

    sendStatusUpdate(updated, "cancelled").catch((err) => logger.error({ err }, "[mailer] cancellation email failed"));
  } catch (err) {
    logger.error({ err }, "Failed to cancel booking");
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ── Driver Status Update — full ride lifecycle ──────────────────────────────
//
// Valid transitions the driver can initiate:
//   assigned    → en_route   (driver heading to pickup)
//   en_route    → on_site    (driver arrived at pickup location)
//   on_site     → in_progress (passenger boarded, trip started)
//   in_progress → completed  (trip finished)
//
//   assigned | en_route | on_site | in_progress → cancelled (driver cancel)
//
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
      assigned:    ["en_route",    "cancelled"],
      en_route:    ["on_site",     "cancelled"],
      on_site:     ["in_progress", "cancelled"],
      in_progress: ["completed",   "cancelled"],
    };

    if (!ALLOWED[booking.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from "${booking.status}" to "${status}"` });
      return;
    }

    const [updated] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    res.json(updated);

    const driverInfo = { name: driver.name, phone: driver.phone };

    // Passenger email
    if (status === "completed") {
      sendPostTripSummary(updated).catch((err) => logger.error({ err }, "[mailer] post-trip summary failed"));
    } else {
      sendStatusUpdate(updated, status, driverInfo).catch((err) => logger.error({ err }, "[mailer] driver-status email failed"));
    }

    // Admin email for every status change (completed included)
    if (status === "completed") {
      sendAdminStatusUpdate(updated, status, driverInfo).catch((err) => logger.error({ err }, "[mailer] admin completed email failed"));
    }
  } catch (err) {
    logger.error({ err }, "Failed to update driver status");
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── Driver self-upload photo (by email, no admin auth) ───────────────────────
router.patch("/drivers/photo", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const { email, photoUrl } = req.body;
    if (!email || !photoUrl) { res.status(400).json({ error: "email and photoUrl are required" }); return; }
    const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.email, email));
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
    const [updated] = await db.update(adminDrivers).set({ photoUrl, updatedAt: new Date() }).where(eq(adminDrivers.email, email)).returning();
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update driver photo"); res.status(500).json({ error: "Failed" }); }
});

// ── Passenger photo after booking ─────────────────────────────────────────────
router.patch("/bookings/:id/passenger-photo", async (req, res) => {
  try {
    if (!db) { res.status(503).json({ error: "DB not configured" }); return; }
    const id = Number(req.params.id);
    const { photoUrl, confirmationCode } = req.body;
    if (!photoUrl || !confirmationCode) { res.status(400).json({ error: "photoUrl and confirmationCode are required" }); return; }
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.confirmationCode !== confirmationCode) { res.status(403).json({ error: "Invalid confirmation code" }); return; }
    const [updated] = await db.update(bookings).set({ passengerPhotoUrl: photoUrl, updatedAt: new Date() }).where(eq(bookings.id, id)).returning();
    res.json(updated);
  } catch (err) { logger.error({ err }, "Failed to update passenger photo"); res.status(500).json({ error: "Failed" }); }
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
      distanceMiles, promoCode, promoDiscount, additionalStops,
    } = req.body;

    if (!service || !pickupAddress || !date || !time || !passengerName || !passengerPhone || !passengerEmail) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Serialize stops as JSON string for storage
    let stopsJson: string | null = null;
    if (Array.isArray(additionalStops) && additionalStops.length > 0) {
      stopsJson = JSON.stringify(additionalStops.filter(Boolean));
    } else if (typeof additionalStops === "string" && additionalStops.trim()) {
      stopsJson = additionalStops;
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
      additionalStops: stopsJson,
    }).returning();

    res.status(201).json({ booking, confirmationCode });

    sendCustomerConfirmation(booking).catch((err) => logger.error({ err }, "[mailer] customer confirmation failed"));
    sendAdminNotification(booking).catch((err) => logger.error({ err }, "[mailer] admin notification failed"));
  } catch (err) {
    logger.error({ err }, "Failed to create booking");
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
