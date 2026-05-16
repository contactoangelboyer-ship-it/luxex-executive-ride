import { Router } from "express";
  import crypto from "crypto";
  import { db, bookings, adminDrivers, vehicles, pricingConfig, zones, promotions, adminUsers } from "@workspace/db";
  import { eq, desc } from "drizzle-orm";
  import { requireAdmin, signToken } from "../../middlewares/adminAuth";
  import {
    sendCustomerConfirmation,
    sendAdminNotification,
    sendDriverAssignment,
    sendStatusUpdate,
  } from "../../lib/mailer";

  const router = Router();

  function hashPassword(pw: string): string {
    return crypto.createHmac("sha256", "luxex-salt").update(pw).digest("hex");
  }

  // Lazy initialization — runs once on the first admin request, not at module load.
  // Avoids crashing the serverless function when the DB host is unreachable at cold start.
  let defaultsInitialized = false;
  async function ensureDefaults(): Promise<void> {
    if (defaultsInitialized) return;
    defaultsInitialized = true;
    try {
      const existing = await db.select().from(adminUsers).limit(1);
      if (!existing.length) {
        await db.insert(adminUsers).values({
          username: "admin",
          passwordHash: hashPassword("luxex2024!"),
        });
      }
    } catch {}
    try {
      const existing = await db.select().from(pricingConfig).limit(1);
      if (!existing.length) {
        await db.insert(pricingConfig).values([
          { vehicleType: "sedan", baseRate: 75,  perMile: 3.75, hourlyRate: 90,  minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15 },
          { vehicleType: "suv",   baseRate: 95,  perMile: 4.75, hourlyRate: 115, minMiles: 15, airportFee: 45, afterHoursPct: 25, weekendPct: 15 },
          { vehicleType: "van",   baseRate: 135, perMile: 5.75, hourlyRate: 150, minMiles: 15, airportFee: 55, afterHoursPct: 25, weekendPct: 15 },
          { vehicleType: "limo",  baseRate: 200, perMile: 6.50, hourlyRate: 200, minMiles: 20, airportFee: 65, afterHoursPct: 30, weekendPct: 20 },
        ]);
      }
    } catch {}
  }

  router.post("/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        res.status(400).json({ error: "username and password required" });
        return;
      }
      await ensureDefaults().catch(() => {});
      const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
      if (!user || user.passwordHash !== hashPassword(password)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const token = signToken({ id: user.id, username: user.username, role: "admin" });
      res.json({ token });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Login failed" });
    }
  });

  router.use(requireAdmin);

  router.get("/dashboard", async (_req, res) => {
    try {
      await ensureDefaults().catch(() => {});
      const today = new Date().toISOString().slice(0, 10);
      const [allBookings, allDrivers, allVehicles] = await Promise.all([
        db.select().from(bookings).orderBy(desc(bookings.createdAt)),
        db.select().from(adminDrivers),
        db.select().from(vehicles),
      ]);
      const todayBookings   = allBookings.filter(b => b.date === today);
      const todayRevenue    = todayBookings.filter(b => b.status === "completed").reduce((s, b) => s + b.totalAmount, 0);
      const totalRevenue    = allBookings.filter(b => b.status === "completed").reduce((s, b) => s + b.totalAmount, 0);
      const pendingBookings = allBookings.filter(b => b.status === "pending").length;
      const availableDrivers = allDrivers.filter(d => d.status === "available").length;
      const activeVehicles   = allVehicles.filter(v => v.status === "active").length;
      res.json({
        dbConfigured: true,
        stats: { todayBookings: todayBookings.length, todayRevenue, totalBookings: allBookings.length, totalRevenue, pendingBookings, availableDrivers, totalDrivers: allDrivers.length, activeVehicles },
        recentBookings: allBookings.slice(0, 10),
      });
    } catch {
      res.json({ dbConfigured: false, stats: {}, recentBookings: [] });
    }
  });

  router.get("/bookings", async (req, res) => {
    try {
      const { status } = req.query;
      const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
      const filtered = status ? rows.filter(b => b.status === status) : rows;
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Failed to load bookings" });
    }
  });

  router.get("/bookings/:id", async (req, res) => {
    try {
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, Number(req.params.id)));
      if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
      res.json(booking);
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Failed to load booking" });
    }
  });

  router.patch("/bookings/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, driverId, adminNotes } = req.body;
      const [current] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!current) { res.status(404).json({ error: "Booking not found" }); return; }
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;
      if (driverId !== undefined) {
        updates.driverId = driverId;
        if (status === undefined) {
          if (driverId !== null && (current.status === "pending" || current.status === "confirmed")) { updates.status = "assigned"; }
          else if (driverId === null && current.status === "assigned") { updates.status = "confirmed"; }
        }
      }
      if (status !== undefined) updates.status = status;
      const [updated] = await db.update(bookings).set(updates as any).where(eq(bookings.id, id)).returning();
      res.json(updated);
      const driverChanged = driverId !== undefined && driverId !== current.driverId && driverId !== null;
      const statusChanged = status !== undefined && status !== current.status;
      if (driverChanged) {
        const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(driverId)));
        if (driver?.email) { sendDriverAssignment(updated, driver).catch(() => {}); }
      }
      if (statusChanged) { sendStatusUpdate(updated, status).catch(() => {}); }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Failed to update booking" });
    }
  });

  router.post("/bookings", async (req, res) => {
    try {
      const body = req.body;
      const code = "LX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const [booking] = await db.insert(bookings).values({ ...body, confirmationCode: code, status: body.status ?? "pending" }).returning();
      res.status(201).json(booking);
      sendCustomerConfirmation(booking).catch(() => {});
      sendAdminNotification(booking).catch(() => {});
      if (booking.driverId) {
        const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, booking.driverId));
        if (driver?.email) { sendDriverAssignment(booking, driver).catch(() => {}); }
      }
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Failed to create booking" });
    }
  });

  router.get("/drivers", async (_req, res) => {
    try {
      const rows = await db.select().from(adminDrivers).orderBy(desc(adminDrivers.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load drivers" }); }
  });

  router.post("/drivers", async (req, res) => {
    try {
      const [driver] = await db.insert(adminDrivers).values(req.body).returning();
      res.status(201).json(driver);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to create driver" }); }
  });

  router.patch("/drivers/:id", async (req, res) => {
    try {
      const [updated] = await db.update(adminDrivers).set({ ...req.body, updatedAt: new Date() }).where(eq(adminDrivers.id, Number(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Driver not found" }); return; }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update driver" }); }
  });

  router.delete("/drivers/:id", async (req, res) => {
    try {
      await db.delete(adminDrivers).where(eq(adminDrivers.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to delete driver" }); }
  });

  router.get("/vehicles", async (_req, res) => {
    try {
      const rows = await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load vehicles" }); }
  });

  router.post("/vehicles", async (req, res) => {
    try {
      const [vehicle] = await db.insert(vehicles).values(req.body).returning();
      res.status(201).json(vehicle);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to create vehicle" }); }
  });

  router.patch("/vehicles/:id", async (req, res) => {
    try {
      const [updated] = await db.update(vehicles).set({ ...req.body, updatedAt: new Date() }).where(eq(vehicles.id, Number(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Vehicle not found" }); return; }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update vehicle" }); }
  });

  router.delete("/vehicles/:id", async (req, res) => {
    try {
      await db.delete(vehicles).where(eq(vehicles.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to delete vehicle" }); }
  });

  router.get("/pricing", async (_req, res) => {
    try {
      const rows = await db.select().from(pricingConfig);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load pricing" }); }
  });

  router.patch("/pricing/:vehicleType", async (req, res) => {
    try {
      const [existing] = await db.select().from(pricingConfig).where(eq(pricingConfig.vehicleType, req.params.vehicleType));
      if (!existing) { res.status(404).json({ error: "Pricing config not found" }); return; }
      const [updated] = await db.update(pricingConfig).set({ ...req.body, updatedAt: new Date() }).where(eq(pricingConfig.vehicleType, req.params.vehicleType)).returning();
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update pricing" }); }
  });

  router.get("/zones", async (_req, res) => {
    try {
      const rows = await db.select().from(zones).orderBy(desc(zones.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load zones" }); }
  });

  router.post("/zones", async (req, res) => {
    try {
      const [zone] = await db.insert(zones).values(req.body).returning();
      res.status(201).json(zone);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to create zone" }); }
  });

  router.patch("/zones/:id", async (req, res) => {
    try {
      const [updated] = await db.update(zones).set({ ...req.body, updatedAt: new Date() }).where(eq(zones.id, Number(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Zone not found" }); return; }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update zone" }); }
  });

  router.delete("/zones/:id", async (req, res) => {
    try {
      await db.delete(zones).where(eq(zones.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to delete zone" }); }
  });

  router.get("/promotions", async (_req, res) => {
    try {
      const rows = await db.select().from(promotions).orderBy(desc(promotions.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load promotions" }); }
  });

  router.post("/promotions", async (req, res) => {
    try {
      const [promo] = await db.insert(promotions).values(req.body).returning();
      res.status(201).json(promo);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to create promotion" }); }
  });

  router.patch("/promotions/:id", async (req, res) => {
    try {
      const [updated] = await db.update(promotions).set(req.body).where(eq(promotions.id, Number(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Promotion not found" }); return; }
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update promotion" }); }
  });

  router.delete("/promotions/:id", async (req, res) => {
    try {
      await db.delete(promotions).where(eq(promotions.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to delete promotion" }); }
  });

  // ── Email diagnostic ─────────────────────────────────────────────────────
  router.get("/email-status", requireAdmin, async (_req, res) => {
    const hasKey = !!process.env.RESEND_API_KEY;
    res.json({ resend_configured: hasKey, key_prefix: hasKey ? process.env.RESEND_API_KEY!.slice(0, 8) + "..." : null });
  });

  // ── Resend booking confirmation to passenger ─────────────────────────────
  router.post("/bookings/:id/resend-confirmation", requireAdmin, async (req, res) => {
    try {
      const booking = await db.select().from(bookings).where(eq(bookings.id, Number(req.params.id))).then(r => r[0]);
      if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
      const { sendCustomerConfirmation } = await import("../../lib/mailer");
      await sendCustomerConfirmation(booking);
      res.json({ ok: true, to: booking.passengerEmail });
    } catch (err: any) {
      res.status(500).json({ error: err?.message ?? "Failed to resend confirmation" });
    }
  });

  export default router;
  