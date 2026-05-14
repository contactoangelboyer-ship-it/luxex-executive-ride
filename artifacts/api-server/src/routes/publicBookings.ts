import { Router } from "express";
import { db, bookingsTable, pricingConfigsTable } from "@workspace/db";
import { vehicles, zones, promotions, bookings, adminDrivers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendCustomerConfirmation, sendAdminNotification } from "../lib/mailer";

const router = Router();

function genCode(): string {
  return "LX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.get("/pricing", async (_req, res) => {
  try {
    const configs = await db.select().from(pricingConfigsTable);
    res.json(configs);
  } catch {
    res.status(500).json({ error: "Failed to load pricing" });
  }
});

// Public: returns which vehicle types have at least one active vehicle
router.get("/vehicles", async (_req, res) => {
  try {
    const rows = await db
      .select({ type: vehicles.type })
      .from(vehicles)
      .where(eq(vehicles.status, "active"));
    const activeTypes = [...new Set(rows.map((r) => r.type))];
    res.json(activeTypes);
  } catch {
    res.status(500).json({ error: "Failed to load vehicles" });
  }
});

// Public: returns active service zones for surcharge calculation
router.get("/zones", async (_req, res) => {
  try {
    const rows = await db.select().from(zones).where(eq(zones.active, true));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to load zones" });
  }
});

// Public: validate a promo code without exposing the full promo list
router.get("/promotions/validate", async (req, res) => {
  try {
    const code = String(req.query.code ?? "").toUpperCase().trim();
    if (!code) {
      res.status(400).json({ error: "Code required" });
      return;
    }
    const [promo] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.code, code));

    if (!promo || !promo.active) {
      res.status(404).json({ error: "Invalid promo code" });
      return;
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      res.status(410).json({ error: "This promo code has expired" });
      return;
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      res.status(410).json({ error: "This promo code has reached its usage limit" });
      return;
    }
    res.json({
      type: promo.type,
      value: promo.value,
      description: promo.description,
      minAmount: promo.minAmount,
    });
  } catch {
    res.status(500).json({ error: "Failed to validate promo" });
  }
});

// Public: track a booking by confirmation code
router.get("/bookings/track", async (req, res) => {
  try {
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

    // Return a safe public subset — no emails, no financial details
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
  } catch {
    res.status(500).json({ error: "Failed to track booking" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const body = req.body;
    if (!body.passengerName || !body.passengerPhone || !body.passengerEmail) {
      res.status(400).json({ error: "passenger_name, passenger_phone and passenger_email are required" });
      return;
    }
    if (!body.pickupAddress || !body.date || !body.time || !body.vehicleType) {
      res.status(400).json({ error: "pickup_address, date, time and vehicle_type are required" });
      return;
    }

    let code = genCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.select({ id: bookingsTable.id }).from(bookingsTable).where(eq(bookingsTable.confirmationCode, code));
      if (!existing.length) break;
      code = genCode();
      attempts++;
    }

    const [booking] = await db.insert(bookingsTable).values({
      confirmationCode: code,
      status: "pending",
      service:          body.service ?? "corporate",
      pickupAddress:    body.pickupAddress,
      pickupLat:        body.pickupLat ?? null,
      pickupLon:        body.pickupLon ?? null,
      dropoffAddress:   body.dropoffAddress ?? null,
      dropoffLat:       body.dropoffLat ?? null,
      dropoffLon:       body.dropoffLon ?? null,
      date:             body.date,
      time:             body.time,
      passengers:       body.passengers ?? 1,
      bags:             body.bags ?? 0,
      hours:            body.hours ?? null,
      vehicleType:      body.vehicleType,
      flightNumber:     body.flightNumber ?? null,
      flightType:       body.flightType ?? null,
      passengerName:    body.passengerName,
      passengerPhone:   body.passengerPhone,
      passengerEmail:   body.passengerEmail,
      notes:            body.notes ?? null,
      meetAndGreet:     body.meetAndGreet ?? false,
      childSeat:        body.childSeat ?? false,
      baseAmount:       body.baseAmount ?? 0,
      mileageAmount:    body.mileageAmount ?? 0,
      surchargesAmount: body.surchargesAmount ?? 0,
      tollsAmount:      body.tollsAmount ?? 0,
      totalAmount:      body.totalAmount ?? 0,
      distanceMiles:    body.distanceMiles ?? null,
    }).returning();

    res.status(201).json(booking);

    // Fire-and-forget emails — never block the booking response
    sendCustomerConfirmation(booking).catch(() => {});
    sendAdminNotification(booking).catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to create booking" });
  }
});

export default router;
