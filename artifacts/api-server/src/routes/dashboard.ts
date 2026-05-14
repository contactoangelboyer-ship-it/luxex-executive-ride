import { Router, type IRouter } from "express";
import { eq, and, or, count, sum } from "drizzle-orm";
import { db, usersTable, ridesTable, driversTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  GetPassengerDashboardResponse,
  GetDriverDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichRide(ride: any) {
  const passenger = await db.select().from(usersTable).where(eq(usersTable.id, ride.passengerId)).then(r => r[0]);
  let driverName: string | null = null;
  if (ride.driverId) {
    const driver = await db.select().from(usersTable).where(eq(usersTable.id, ride.driverId)).then(r => r[0]);
    if (driver) driverName = `${driver.firstName} ${driver.lastName}`;
  }
  return {
    ...ride,
    passengerName: passenger ? `${passenger.firstName} ${passenger.lastName}` : "Unknown",
    driverName,
  };
}

router.get("/dashboard/passenger", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    res.json(GetPassengerDashboardResponse.parse({
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      upcomingRides: 0,
      recentRides: [],
    }));
    return;
  }

  const allRides = await db.select().from(ridesTable).where(eq(ridesTable.passengerId, user.id));
  const totalRides = allRides.length;
  const completedRides = allRides.filter(r => r.status === "completed").length;
  const cancelledRides = allRides.filter(r => r.status === "cancelled").length;
  const upcomingRides = allRides.filter(r => r.status === "pending" || r.status === "confirmed").length;

  const recent = allRides.slice(-5).reverse();
  const recentRides = await Promise.all(recent.map(enrichRide));

  res.json(GetPassengerDashboardResponse.parse({
    totalRides,
    completedRides,
    cancelledRides,
    upcomingRides,
    recentRides,
  }));
});

router.get("/dashboard/driver", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    res.json(GetDriverDashboardResponse.parse({
      totalTrips: 0,
      completedTrips: 0,
      earnings: 0,
      rating: null,
      isAvailable: false,
      pendingRequests: 0,
      recentTrips: [],
    }));
    return;
  }

  const driver = await db.select().from(driversTable).where(eq(driversTable.userId, user.id)).then(r => r[0]);

  const myRides = await db.select().from(ridesTable).where(eq(ridesTable.driverId, user.id));
  const completedRides = myRides.filter(r => r.status === "completed");
  const earnings = completedRides.reduce((sum, r) => sum + (r.finalPrice || 0), 0);

  const pendingRequests = await db.select().from(ridesTable)
    .where(eq(ridesTable.status, "pending"))
    .then(r => r.length);

  const recent = myRides.slice(-5).reverse();
  const recentTrips = await Promise.all(recent.map(enrichRide));

  res.json(GetDriverDashboardResponse.parse({
    totalTrips: myRides.length,
    completedTrips: completedRides.length,
    earnings,
    rating: driver?.rating ?? null,
    isAvailable: driver?.isAvailable ?? false,
    pendingRequests,
    recentTrips,
  }));
});

export default router;
