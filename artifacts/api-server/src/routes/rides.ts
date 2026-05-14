import { Router, type IRouter } from "express";
import { eq, and, or, isNull } from "drizzle-orm";
import { db, usersTable, ridesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  ListRidesQueryParams,
  ListRidesResponse,
  CreateRideBody,
  GetRideParams,
  GetRideResponse,
  UpdateRideStatusParams,
  UpdateRideStatusBody,
  UpdateRideStatusResponse,
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

router.get("/rides", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const queryParsed = ListRidesQueryParams.safeParse(req.query);
  const params = queryParsed.success ? queryParsed.data : {};

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    res.json([]);
    return;
  }

  let query = db.select().from(ridesTable).$dynamic();

  if (params.role === "driver") {
    query = query.where(
      params.status
        ? and(eq(ridesTable.driverId, user.id), eq(ridesTable.status, params.status))
        : or(
            eq(ridesTable.driverId, user.id),
            and(eq(ridesTable.status, "pending"), isNull(ridesTable.driverId))
          )
    );
  } else if (params.role === "passenger") {
    query = query.where(
      params.status
        ? and(eq(ridesTable.passengerId, user.id), eq(ridesTable.status, params.status))
        : eq(ridesTable.passengerId, user.id)
    );
  } else {
    const conditions = params.status
      ? and(or(eq(ridesTable.passengerId, user.id), eq(ridesTable.driverId, user.id)), eq(ridesTable.status, params.status))
      : or(eq(ridesTable.passengerId, user.id), eq(ridesTable.driverId, user.id));
    query = query.where(conditions);
  }

  const rides = await query;
  const enriched = await Promise.all(rides.map(enrichRide));
  res.json(ListRidesResponse.parse(enriched));
});

router.post("/rides", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = CreateRideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId,
      firstName: "User",
      lastName: "",
      email: `${clerkId}@placeholder.com`,
      role: "passenger",
    }).returning();
    user = created;
  }

  const [ride] = await db.insert(ridesTable).values({
    passengerId: user.id,
    pickupAddress: parsed.data.pickupAddress,
    dropoffAddress: parsed.data.dropoffAddress,
    pickupTime: new Date(parsed.data.pickupTime),
    notes: parsed.data.notes,
    estimatedPrice: parsed.data.estimatedPrice,
    status: "pending",
  }).returning();

  const enriched = await enrichRide(ride);
  res.status(201).json(GetRideResponse.parse(enriched));
});

router.get("/rides/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRideParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const ride = await db.select().from(ridesTable).where(eq(ridesTable.id, params.data.id)).then(r => r[0]);
  if (!ride) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }

  const enriched = await enrichRide(ride);
  res.json(GetRideResponse.parse(enriched));
});

router.patch("/rides/:id/status", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateRideStatusParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRideStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clerkId = (req as any).clerkUserId;
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.finalPrice !== undefined) updateData.finalPrice = parsed.data.finalPrice;

  if (parsed.data.status === "confirmed" && user) {
    updateData.driverId = user.id;
  }

  const [updated] = await db.update(ridesTable)
    .set(updateData)
    .where(eq(ridesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Ride not found" });
    return;
  }

  const enriched = await enrichRide(updated);
  res.json(UpdateRideStatusResponse.parse(enriched));
});

export default router;
