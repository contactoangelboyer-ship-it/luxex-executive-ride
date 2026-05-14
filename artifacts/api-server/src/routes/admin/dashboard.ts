import { Router } from "express";
import { db } from "@workspace/db";
import { bookings, drivers, vehicles } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

router.get("/dashboard", requireAdmin, async (req, res) => {
  if (!db) {
    res.json({
      dbConfigured: false,
      stats: {
        totalBookings: 0,
        todayBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        availableDrivers: 0,
        totalDrivers: 0,
        activeVehicles: 0,
        totalRevenue: 0,
        todayRevenue: 0,
      },
      recentBookings: [],
    });
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    const [todayResult] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.date, today));
    const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "pending"));
    const [confirmedResult] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(eq(bookings.status, "confirmed"));
    const [activeDriversResult] = await db.select({ count: sql<number>`count(*)` }).from(drivers).where(eq(drivers.status, "available"));
    const [totalDriversResult] = await db.select({ count: sql<number>`count(*)` }).from(drivers);
    const [totalVehiclesResult] = await db.select({ count: sql<number>`count(*)` }).from(vehicles).where(eq(vehicles.status, "active"));

    const revenueResult = await db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(bookings)
      .where(sql`status NOT IN ('cancelled', 'pending')`);
    const todayRevenueResult = await db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(bookings)
      .where(sql`date = ${today} AND status NOT IN ('cancelled', 'pending')`);

    const recentBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(10);

    res.json({
      dbConfigured: true,
      stats: {
        totalBookings: Number(totalResult.count),
        todayBookings: Number(todayResult.count),
        pendingBookings: Number(pendingResult.count),
        confirmedBookings: Number(confirmedResult.count),
        availableDrivers: Number(activeDriversResult.count),
        totalDrivers: Number(totalDriversResult.count),
        activeVehicles: Number(totalVehiclesResult.count),
        totalRevenue: Number(revenueResult[0]?.total ?? 0),
        todayRevenue: Number(todayRevenueResult[0]?.total ?? 0),
      },
      recentBookings,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;
