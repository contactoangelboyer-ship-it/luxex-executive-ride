import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, driversTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  GetMyDriverProfileResponse,
  UpdateMyDriverProfileBody,
  UpdateMyDriverProfileResponse,
  ListAvailableDriversResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/me/driver", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const driver = await db.select().from(driversTable).where(eq(driversTable.userId, user.id)).then(r => r[0]);
  if (!driver) {
    res.status(404).json({ error: "Driver profile not found" });
    return;
  }

  res.json(GetMyDriverProfileResponse.parse({
    ...driver,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }));
});

router.patch("/users/me/driver", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = UpdateMyDriverProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let driver = await db.select().from(driversTable).where(eq(driversTable.userId, user.id)).then(r => r[0]);

  if (!driver) {
    const [created] = await db.insert(driversTable).values({
      userId: user.id,
      ...parsed.data,
    }).returning();
    driver = created;
  } else {
    const [updated] = await db.update(driversTable)
      .set(parsed.data)
      .where(eq(driversTable.userId, user.id))
      .returning();
    driver = updated;
  }

  res.json(UpdateMyDriverProfileResponse.parse({
    ...driver,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }));
});

router.get("/drivers/available", async (_req, res): Promise<void> => {
  const drivers = await db
    .select({
      id: driversTable.id,
      userId: driversTable.userId,
      vehicleMake: driversTable.vehicleMake,
      vehicleModel: driversTable.vehicleModel,
      vehicleYear: driversTable.vehicleYear,
      vehiclePlate: driversTable.vehiclePlate,
      vehicleColor: driversTable.vehicleColor,
      isAvailable: driversTable.isAvailable,
      rating: driversTable.rating,
      totalTrips: driversTable.totalTrips,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(driversTable)
    .innerJoin(usersTable, eq(driversTable.userId, usersTable.id))
    .where(eq(driversTable.isAvailable, true));

  res.json(ListAvailableDriversResponse.parse(drivers));
});

export default router;
