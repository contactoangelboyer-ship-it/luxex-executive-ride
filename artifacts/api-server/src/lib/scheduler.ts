import cron from "node-cron";
import { db } from "@workspace/db";
import { bookings, adminDrivers } from "@workspace/db/schema";
import { eq, isNull, inArray, and } from "drizzle-orm";
import {
  sendPassengerReminder24h,
  sendDriverReminder24h,
  sendPassengerReminder2h,
  sendDriverReminder2h,
} from "./mailer";
import { logger } from "./logger";

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

const WINDOW_MS = 35 * 60 * 1000; // ±35 min window to catch each run
const H24_MS    = 24 * 60 * 60 * 1000;
const H2_MS     =  2 * 60 * 60 * 1000;

async function runReminderJob(): Promise<void> {
  if (!db) return;

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
      if (!tripDate) continue;
      if (!isWithinWindow(tripDate, H24_MS, WINDOW_MS)) continue;

      let driver: { name: string; phone?: string | null } | null = null;
      if (booking.driverId) {
        const [d] = await db
          .select({ name: adminDrivers.name, phone: adminDrivers.phone, email: adminDrivers.email })
          .from(adminDrivers)
          .where(eq(adminDrivers.id, booking.driverId));
        if (d) {
          driver = { name: d.name, phone: d.phone };
          await sendDriverReminder24h(booking, d).catch((err) =>
            logger.error({ err }, "[scheduler] 24h driver reminder failed")
          );
        }
      }

      await sendPassengerReminder24h(booking, driver).catch((err) =>
        logger.error({ err }, "[scheduler] 24h passenger reminder failed")
      );

      await db
        .update(bookings)
        .set({ reminder24hSentAt: new Date() })
        .where(eq(bookings.id, booking.id));

      logger.info({ code: booking.confirmationCode }, "[scheduler] 24h reminders sent");
    }

    for (const booking of pending2h) {
      const tripDate = parseTripDateTime(booking.date, booking.time);
      if (!tripDate) continue;
      if (!isWithinWindow(tripDate, H2_MS, WINDOW_MS)) continue;

      let driver: { name: string; phone?: string | null } | null = null;
      if (booking.driverId) {
        const [d] = await db
          .select({ name: adminDrivers.name, phone: adminDrivers.phone, email: adminDrivers.email })
          .from(adminDrivers)
          .where(eq(adminDrivers.id, booking.driverId));
        if (d) {
          driver = { name: d.name, phone: d.phone };
          await sendDriverReminder2h(booking, d).catch((err) =>
            logger.error({ err }, "[scheduler] 2h driver reminder failed")
          );
        }
      }

      await sendPassengerReminder2h(booking, driver).catch((err) =>
        logger.error({ err }, "[scheduler] 2h passenger reminder failed")
      );

      await db
        .update(bookings)
        .set({ reminder2hSentAt: new Date() })
        .where(eq(bookings.id, booking.id));

      logger.info({ code: booking.confirmationCode }, "[scheduler] 2h reminders sent");
    }
  } catch (err) {
    logger.error({ err }, "[scheduler] reminder job error");
  }
}

export function startScheduler(): void {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", () => {
    runReminderJob().catch((err) => logger.error({ err }, "[scheduler] unhandled error"));
  });

  logger.info("[scheduler] Reminder scheduler started (every 30 min)");
}
