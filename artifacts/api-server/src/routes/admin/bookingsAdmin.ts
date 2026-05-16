import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, adminDrivers } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  sendDriverAssignment,
  sendStatusUpdate,
  sendCustomerConfirmation,
  sendAdminNotification,
  sendPostTripSummary,
} from "../../lib/mailer";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/bookings", requireAdmin, async (req, res) => {
  try {
    const { status, date, service, limit = "50", offset = "0" } = req.query as Record<string, string>;
    let query = db.select().from(bookings).$dynamic();
    const conditions: any[] = [];
    if (status) conditions.push(eq(bookings.status, status));
    if (date) conditions.push(eq(bookings.date, date));
    if (service) conditions.push(eq(bookings.service, service));
    if (conditions.length > 0) query = query.where(sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`);
    const data = await query.orderBy(desc(bookings.createdAt)).limit(Number(limit)).offset(Number(offset));
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
    const { status, driverId, adminNotes, vehicleType } = req.body;

    const [current] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (driverId !== undefined) updates.driverId = driverId;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (vehicleType !== undefined) updates.vehicleType = vehicleType;

    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, bookingId)).returning();
    res.json(updated);

    const driverChanged = driverId !== undefined && driverId !== current.driverId && driverId !== null;
    const statusChanged = status !== undefined && status !== current.status;

    if (driverChanged) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(driverId)));
      if (driver?.email) {
        sendDriverAssignment(updated, driver).catch(() => {});
      }
    }

    if (statusChanged) {
      if (status === "completed") {
        sendPostTripSummary(updated).catch(() => {});
      } else {
        sendStatusUpdate(updated, status).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to update booking");
    res.status(500).json({ error: "Failed to update booking" });
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
    res.status(201).json(booking);

    sendCustomerConfirmation(booking).catch(() => {});
    sendAdminNotification(booking).catch(() => {});

    if (booking.driverId) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, booking.driverId));
      if (driver?.email) {
        sendDriverAssignment(booking, driver).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to create booking (admin)");
    res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
