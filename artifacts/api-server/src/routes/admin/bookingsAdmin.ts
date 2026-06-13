import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, adminDrivers } from "@workspace/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  sendDriverAssignment,
  sendStatusUpdate,
  sendCustomerConfirmation,
  sendAdminNotification,
  sendPostTripSummary,
} from "../../lib/mailer";
import { logger } from "../../lib/logger";

// Module-level migration — starts when this module is first imported.
// Awaited by middleware below so ALL routes execute only after the column exists.
const _tripTypeReady: Promise<void> = (() => {
  if (!db) return Promise.resolve();
  return db
    .execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)`)
    .then(() => {})
    .catch(() => {});
})();

const router = Router();

// Ensure trip_type column exists before handling any request in this router
router.use(async (_req, _res, next) => { await _tripTypeReady; next(); });

router.get("/bookings", requireAdmin, async (req, res) => {
  try {
    const { status, date, service, limit = "50", offset = "0" } = req.query as Record<string, string>;
    let query = db.select().from(bookings).$dynamic();
    const conditions: any[] = [];
    if (status) conditions.push(eq(bookings.status, status));
    if (date) conditions.push(eq(bookings.date, date));
    if (service) conditions.push(eq(bookings.service, service));
    if (conditions.length > 0) query = query.where(sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`);
    const statusPriority = sql`CASE
      WHEN ${bookings.status} = 'in_progress' THEN 1
      WHEN ${bookings.status} = 'assigned'    THEN 2
      WHEN ${bookings.status} = 'confirmed'   THEN 3
      WHEN ${bookings.status} = 'pending'     THEN 4
      WHEN ${bookings.status} = 'completed'   THEN 5
      WHEN ${bookings.status} = 'cancelled'   THEN 6
      ELSE 7 END`;
    const data = await query
      .orderBy(statusPriority, asc(bookings.date), asc(bookings.time))
      .limit(Number(limit)).offset(Number(offset));
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to list bookings");
    res.status(500).json({ error: "Failed to list bookings" });
  }
});

router.get("/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    res.json(booking);
  } catch (err) {
    logger.error({ err }, "Failed to get booking");
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/bookings/:id", requireAdmin, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const {
      status, driverId, adminNotes, vehicleType, totalAmount: adminPrice,
      passengerName, passengerPhone, passengerEmail,
      service, tripType, date, time,
      pickupAddress, pickupLat, pickupLon,
      dropoffAddress, dropoffLat, dropoffLon,
      passengers, bags, hours,
      flightNumber, flightType,
      notes, meetAndGreet, childSeat,
      baseAmount, mileageAmount, surchargesAmount, tollsAmount,
      promoCode, promoDiscount, distanceMiles,
    } = req.body;

    const [current] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (driverId !== undefined) updates.driverId = driverId;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (vehicleType !== undefined) updates.vehicleType = vehicleType;
    if (adminPrice !== undefined && !isNaN(Number(adminPrice))) updates.totalAmount = Number(adminPrice);
    if (passengerName !== undefined) updates.passengerName = passengerName;
    if (passengerPhone !== undefined) updates.passengerPhone = passengerPhone;
    if (passengerEmail !== undefined) updates.passengerEmail = passengerEmail;
    if (service !== undefined) updates.service = service;
    if (tripType !== undefined) updates.tripType = tripType;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (pickupAddress !== undefined) updates.pickupAddress = pickupAddress;
    if (pickupLat !== undefined) updates.pickupLat = pickupLat;
    if (pickupLon !== undefined) updates.pickupLon = pickupLon;
    if (dropoffAddress !== undefined) updates.dropoffAddress = dropoffAddress;
    if (dropoffLat !== undefined) updates.dropoffLat = dropoffLat;
    if (dropoffLon !== undefined) updates.dropoffLon = dropoffLon;
    if (passengers !== undefined) updates.passengers = Number(passengers);
    if (bags !== undefined) updates.bags = Number(bags);
    if (hours !== undefined) updates.hours = hours !== null ? Number(hours) : null;
    if (flightNumber !== undefined) updates.flightNumber = flightNumber;
    if (flightType !== undefined) updates.flightType = flightType;
    if (notes !== undefined) updates.notes = notes;
    if (meetAndGreet !== undefined) updates.meetAndGreet = meetAndGreet;
    if (childSeat !== undefined) updates.childSeat = childSeat;
    if (baseAmount !== undefined) updates.baseAmount = Number(baseAmount);
    if (mileageAmount !== undefined) updates.mileageAmount = Number(mileageAmount);
    if (surchargesAmount !== undefined) updates.surchargesAmount = Number(surchargesAmount);
    if (tollsAmount !== undefined) updates.tollsAmount = Number(tollsAmount);
    if (promoCode !== undefined) updates.promoCode = promoCode;
    if (promoDiscount !== undefined) updates.promoDiscount = Number(promoDiscount);
    if (distanceMiles !== undefined) updates.distanceMiles = distanceMiles;

    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, bookingId)).returning();

    const driverChanged = driverId !== undefined && driverId !== current.driverId && driverId !== null;
    const statusChanged = status !== undefined && status !== current.status;

    const patchEmailTasks: Promise<unknown>[] = [];
    let assignedDriver: { name: string; phone?: string | null } | null = null;
    if (driverChanged) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(driverId)));
      if (driver) {
        assignedDriver = { name: driver.name, phone: driver.phone };
        if (driver.email) { patchEmailTasks.push(sendDriverAssignment(updated, driver).catch(() => {})); }
      }
    }
    if (statusChanged) {
      patchEmailTasks.push(
        status === "completed"
          ? sendPostTripSummary(updated).catch(() => {})
          : sendStatusUpdate(updated, status, assignedDriver ?? undefined).catch(() => {}),
      );
    }
    await Promise.allSettled(patchEmailTasks);

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update booking");
    res.status(500).json({ error: "Failed to update booking" });
  }
});

router.post("/bookings/:id/resend-confirmation", requireAdmin, async (req, res) => {
  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (!booking.passengerEmail) { res.status(400).json({ error: "Booking has no passenger email" }); return; }
    await sendCustomerConfirmation(booking);
    res.json({ ok: true, to: booking.passengerEmail });
  } catch (err) {
    logger.error({ err }, "Failed to resend confirmation email");
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.post("/bookings", requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const confirmationCode = "LX" + Math.random().toString(36).toUpperCase().slice(2, 8);
    const [booking] = await db.insert(bookings).values({
      ...body,
      confirmationCode,
      status: body.status ?? "pending",
    }).returning();
    const adminCreateTasks: Promise<unknown>[] = [
      sendCustomerConfirmation(booking).catch((err) => logger.error({ err }, "[mailer] customer confirmation failed (admin create)")),
      sendAdminNotification(booking).catch((err) => logger.error({ err }, "[mailer] admin notification failed (admin create)")),
    ];
    if (booking.driverId) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, booking.driverId));
      if (driver?.email) {
        adminCreateTasks.push(sendDriverAssignment(booking, driver).catch((err) => logger.error({ err }, "[mailer] driver assignment failed (admin create)")));
      }
    }
    await Promise.allSettled(adminCreateTasks);

    res.status(201).json(booking);
  } catch (err) {
    logger.error({ err }, "Failed to create booking (admin)");
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
