import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string, req: any) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing) return existing;

  const { getAuth } = await import("@clerk/express");
  const auth = getAuth(req);
  const firstName = (req as any).auth?.firstName || "User";
  const lastName = (req as any).auth?.lastName || "";
  const email = (req as any).auth?.email || `${clerkId}@unknown.com`;

  const [created] = await db.insert(usersTable).values({
    clerkId,
    firstName,
    lastName,
    email,
    role: "passenger",
  }).returning();
  return created;
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);

  if (!user) {
    const { getAuth } = await import("@clerk/express");
    const auth = getAuth(req);
    req.log.info({ clerkId, auth }, "Creating user from Clerk session");
    const [created] = await db.insert(usersTable).values({
      clerkId,
      firstName: "User",
      lastName: "",
      email: `${clerkId}@placeholder.com`,
      role: "passenger",
    }).returning();
    user = created;
  }

  res.json(GetMeResponse.parse(user));
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).then(r => r[0]);

  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId,
      firstName: parsed.data.firstName || "User",
      lastName: parsed.data.lastName || "",
      email: `${clerkId}@placeholder.com`,
      role: parsed.data.role || "passenger",
    }).returning();
    user = created;
  } else {
    const updateData: Record<string, unknown> = {};
    if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;

    const [updated] = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    user = updated;
  }

  res.json(UpdateMeResponse.parse(user));
});

export default router;
