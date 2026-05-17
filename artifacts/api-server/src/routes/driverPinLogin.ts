import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, adminDrivers } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

router.post("/drivers/pin-login", async (req, res) => {
  try {
    const { pin } = req.body ?? {};

    if (!pin || typeof pin !== "string" || !/^\d{4,10}$/.test(pin)) {
      res.status(400).json({ error: "PIN inválido. Debe tener entre 4 y 10 dígitos." });
      return;
    }

    const [driver] = await db
      .select()
      .from(adminDrivers)
      .where(eq(adminDrivers.accessPin, pin));

    if (!driver) {
      res.status(401).json({ error: "PIN incorrecto. Verifica con tu administrador." });
      return;
    }

    const nameParts = (driver.name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? driver.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    res.json({
      id: `pin_${driver.id}`,
      driverDbId: driver.id,
      firstName,
      lastName,
      email: driver.email ?? "",
      phone: driver.phone ?? "",
      role: "driver" as const,
      createdAt: driver.createdAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Driver PIN login failed");
    res.status(500).json({ error: "Error al iniciar sesión. Intenta de nuevo." });
  }
});

export default router;
