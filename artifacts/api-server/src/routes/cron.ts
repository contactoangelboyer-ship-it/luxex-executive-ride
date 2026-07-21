import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, adminDrivers } from "@workspace/db/schema";
import { eq, isNull, inArray, and } from "drizzle-orm";
import {
  sendPassengerReminder24h,
  sendDriverReminder24h,
  sendPassengerReminder2h,
  sendDriverReminder2h,
} from "../lib/mailer";
import { logger } from "../lib/logger";

const router = Router();

const CRON_SECRET = process.env.CRON_SECRET ?? "";

function parseTripDateTime(date: string, time: string): Date | null {
  try {
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if ([year, month, day, hour, minute].some(isNaN)) return null;
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  } catch {
    return null;
  }
}

function isWithinWindow(tripDate: Date, targetMs: number, windowMs: number): boolean {
  const diff = tripDate.getTime() - Date.now();
  return diff >= targetMs - windowMs && diff < targetMs + windowMs;
}

const WINDOW_MS = 35 * 60 * 1000;
const H24_MS    = 24 * 60 * 60 * 1000;
const H2_MS     =  2 * 60 * 60 * 1000;

// GET /api/cron/reminders
// Called by Vercel Cron every 30 minutes.
// Protected by CRON_SECRET env var — Vercel sends it as Authorization: Bearer <secret>.
router.get("/cron/reminders", async (req, res) => {
  if (CRON_SECRET) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${CRON_SECRET}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  if (!db) {
    res.status(503).json({ error: "DB not configured" });
    return;
  }

  const sent24h: string[] = [];
  const sent2h: string[] = [];
  const errors: string[] = [];

  try {
    const activeStatuses = ["pending", "confirmed", "assigned"];

    const pending24h = await db
      .select()
      .from(bookings)
      .where(and(isNull(bookings.reminder24hSentAt), inArray(bookings.status, activeStatuses)));

    const pending2h = await db
      .select()
      .from(bookings)
      .where(and(isNull(bookings.reminder2hSentAt), inArray(bookings.status, activeStatuses)));

    for (const booking of pending24h) {
      const tripDate = parseTripDateTime(booking.date, booking.time);
      if (!tripDate || !isWithinWindow(tripDate, H24_MS, WINDOW_MS)) continue;

      let driver: { name: string; phone?: string | null } | null = null;
      if (booking.driverId) {
        const [d] = await db
          .select({ name: adminDrivers.name, phone: adminDrivers.phone, email: adminDrivers.email })
          .from(adminDrivers)
          .where(eq(adminDrivers.id, booking.driverId));
        if (d) {
          driver = { name: d.name, phone: d.phone };
          await sendDriverReminder24h(booking, d).catch((err) => {
            errors.push(`24h driver ${booking.confirmationCode}: ${err.message}`);
          });
        }
      }

      await sendPassengerReminder24h(booking, driver).catch((err) => {
        errors.push(`24h passenger ${booking.confirmationCode}: ${err.message}`);
      });

      await db.update(bookings).set({ reminder24hSentAt: new Date() }).where(eq(bookings.id, booking.id));
      sent24h.push(booking.confirmationCode);
      logger.info({ code: booking.confirmationCode }, "[cron] 24h reminders sent");
    }

    for (const booking of pending2h) {
      const tripDate = parseTripDateTime(booking.date, booking.time);
      if (!tripDate || !isWithinWindow(tripDate, H2_MS, WINDOW_MS)) continue;

      let driver: { name: string; phone?: string | null } | null = null;
      if (booking.driverId) {
        const [d] = await db
          .select({ name: adminDrivers.name, phone: adminDrivers.phone, email: adminDrivers.email })
          .from(adminDrivers)
          .where(eq(adminDrivers.id, booking.driverId));
        if (d) {
          driver = { name: d.name, phone: d.phone };
          await sendDriverReminder2h(booking, d).catch((err) => {
            errors.push(`2h driver ${booking.confirmationCode}: ${err.message}`);
          });
        }
      }

      await sendPassengerReminder2h(booking, driver).catch((err) => {
        errors.push(`2h passenger ${booking.confirmationCode}: ${err.message}`);
      });

      await db.update(bookings).set({ reminder2hSentAt: new Date() }).where(eq(bookings.id, booking.id));
      sent2h.push(booking.confirmationCode);
      logger.info({ code: booking.confirmationCode }, "[cron] 2h reminders sent");
    }

    res.json({
      ok: true,
      sent24h,
      sent2h,
      errors: errors.length ? errors : undefined,
      processedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, "[cron] reminder job error");
    res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export default router;
