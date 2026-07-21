import { Router } from "express";
import crypto from "crypto";
import { db, bookings, adminDrivers, vehicles, pricingConfig, zones, promotions, adminUsers } from "@workspace/db";
import { eq, desc, sql, getTableColumns } from "drizzle-orm";
import { requireAdmin, signToken } from "../../middlewares/adminAuth";
import {
  sendCustomerConfirmation,
  sendAdminNotification,
  sendDriverAssignment,
  sendStatusUpdate,
  sendPostTripSummary,
} from "../../lib/mailer";

// Module-level migration — runs on first import, before any request is handled.
// ALTER TABLE … IF NOT EXISTS is idempotent and fast (~1 ms) once the column exists.
const _tripTypeReady: Promise<void> = (() => {
  if (!db) return Promise.resolve();
  return db
    .execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)`)
    .then(() => {})
    .catch(() => {});
})();

const router = Router();

function hashPassword(pw: string): string {
  return crypto.createHmac("sha256", "luxex-salt").update(pw).digest("hex");
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const DEFAULT_ADMIN_PASSWORD = "LuxEx2026!";

let defaultsInitialized = false;
async function ensureDefaults(): Promise<void> {
  if (defaultsInitialized) return;
  defaultsInitialized = true;
  try {
    const existing = await db.select().from(adminUsers).limit(1);
    if (!existing.length) {
      await db.insert(adminUsers).values({
        username: "admin",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      });
    }
  } catch {
    // DB may not be ready yet; login handler will surface a clean error
  }
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
  } catch {
    // Pricing defaults are non-critical; continue
  }
}

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    // ── 1. ADMIN_PASSWORD env var override (emergency access) ────────────────
    const envPassword = process.env.ADMIN_PASSWORD;
    if (envPassword && username === "admin" && password === envPassword) {
      const token = signToken({ id: 0, username: "admin", role: "admin" });
      res.json({ token });
      return;
    }

    // ── 2. Ensure defaults are seeded ────────────────────────────────────────
    await ensureDefaults().catch(() => {});

    // ── 3. DB lookup ─────────────────────────────────────────────────────────
    let users: typeof adminUsers.$inferSelect[] = [];
    try {
      users = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    } catch {
      res.status(503).json({ error: "Database unavailable. Please try again shortly." });
      return;
    }

    const [user] = users;
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = signToken({ id: user.id, username: user.username, role: "admin" });
    res.json({ token });
  } catch {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── Password reset (requires ADMIN_RESET_SECRET env var) ─────────────────────
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { secret, username, newPassword } = req.body ?? {};
    const resetSecret = process.env.ADMIN_RESET_SECRET;
    if (!resetSecret || secret !== resetSecret) {
      res.status(403).json({ error: "Invalid reset secret" });
      return;
    }
    if (!username || !newPassword || String(newPassword).length < 8) {
      res.status(400).json({ error: "username and newPassword (min 8 chars) are required" });
      return;
    }
    const hash = hashPassword(String(newPassword));
    const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, String(username)));
    if (existing.length) {
      await db.update(adminUsers).set({ passwordHash: hash }).where(eq(adminUsers.username, String(username)));
      res.json({ ok: true, message: `Password updated for ${username}` });
    } else {
      await db.insert(adminUsers).values({ username: String(username), passwordHash: hash });
      res.json({ ok: true, message: `Admin user ${username} created` });
    }
  } catch {
    res.status(500).json({ error: "Reset failed" });
  }
});

router.use(requireAdmin);

// Await migration before any authenticated route executes
router.use(async (_req, _res, next) => { await _tripTypeReady; next(); });

// Use explicit column selection for bookings queries (future-proof for schema changes)
const bookingCols = getTableColumns(bookings);

router.get("/dashboard", async (_req, res) => {
  try {
    await ensureDefaults().catch(() => {});
    const today = new Date().toISOString().slice(0, 10);
    const [allBookings, allDrivers, allVehicles] = await Promise.all([
      db.select(bookingCols).from(bookings).orderBy(desc(bookings.createdAt)),
      db.select().from(adminDrivers),
      db.select().from(vehicles),
    ]);
    const todayBookings    = allBookings.filter(b => b.date === today);
    const todayRevenue     = todayBookings.filter(b => b.status === "completed").reduce((s, b) => s + b.totalAmount, 0);
    const totalRevenue     = allBookings.filter(b => b.status === "completed").reduce((s, b) => s + b.totalAmount, 0);
    const pendingBookings  = allBookings.filter(b => b.status === "pending").length;
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
    const rows = await db.select(bookingCols).from(bookings).orderBy(desc(bookings.createdAt));
    const filtered = status ? rows.filter(b => b.status === status) : rows;
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load bookings" });
  }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const [booking] = await db.select(bookingCols).from(bookings).where(eq(bookings.id, Number(req.params.id)));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load booking" });
  }
});

router.patch("/bookings/:id", async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const {
      status, driverId, adminNotes, vehicleType, totalAmount: adminPrice,
      passengerName, passengerPhone, passengerEmail,
      service, date, time,
      pickupAddress, pickupLat, pickupLon,
      dropoffAddress, dropoffLat, dropoffLon,
      passengers, bags, hours,
      flightNumber, flightType,
      notes, meetAndGreet, childSeat,
      baseAmount, mileageAmount, surchargesAmount, tollsAmount,
      promoCode, promoDiscount, distanceMiles,
    } = req.body;

    const [current] = await db.select(bookingCols).from(bookings).where(eq(bookings.id, bookingId));
    if (!current) { res.status(404).json({ error: "Booking not found" }); return; }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (driverId !== undefined) updates.driverId = driverId;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (vehicleType !== undefined) updates.vehicleType = vehicleType;
    if (adminPrice !== undefined && !isNaN(Number(adminPrice))) updates.totalAmount = Number(adminPrice);
    if (passengerName !== undefined) updates.passengerName = passengerName;
    if (passengerPhone !== undefined) updates.passengerPhone = passengerPhone;
    if (passengerEmail !== undefined) updates.passengerEmail = passengerEmail;
    if (service !== undefined) updates.service = service;
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (pickupAddress !== undefined) updates.pickupAddress = pickupAddress;
    if (pickupLat !== undefined) updates.pickupLat = pickupLat;
    if (pickupLon !== undefined) updates.pickupLon = pickupLon;
    if (dropoffAddress !== undefined) updates.dropoffAddress = dropoffAddress;
    if (dropoffLat !== undefined) updates.dropoffLat = dropoffLat;
    if (dropoffLon !== undefined) updates.dropoffLon = dropoffLon;
    if (passengers !== undefined) updates.passengers = Number(passengers);
    if (bags !== undefined) updates.bags = Number(bags);
    if (hours !== undefined) updates.hours = hours !== null ? Number(hours) : null;
    if (flightNumber !== undefined) updates.flightNumber = flightNumber;
    if (flightType !== undefined) updates.flightType = flightType;
    if (notes !== undefined) updates.notes = notes;
    if (meetAndGreet !== undefined) updates.meetAndGreet = meetAndGreet;
    if (childSeat !== undefined) updates.childSeat = childSeat;
    if (baseAmount !== undefined) updates.baseAmount = Number(baseAmount);
    if (mileageAmount !== undefined) updates.mileageAmount = Number(mileageAmount);
    if (surchargesAmount !== undefined) updates.surchargesAmount = Number(surchargesAmount);
    if (tollsAmount !== undefined) updates.tollsAmount = Number(tollsAmount);
    if (promoCode !== undefined) updates.promoCode = promoCode;
    if (promoDiscount !== undefined) updates.promoDiscount = Number(promoDiscount);
    if (distanceMiles !== undefined) updates.distanceMiles = distanceMiles;

    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, bookingId)).returning(bookingCols);

    const driverChanged = driverId !== undefined && driverId !== current.driverId && driverId !== null;
    const statusChanged = status !== undefined && status !== current.status;

    const emailTasks: Promise<unknown>[] = [];
    let assignedDriver: { name: string; phone?: string | null } | null = null;
    if (driverChanged) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(driverId)));
      if (driver) {
        assignedDriver = { name: driver.name, phone: driver.phone };
        if (driver.email) { emailTasks.push(sendDriverAssignment(updated, driver).catch(() => {})); }
      }
    }
    if (statusChanged) {
      emailTasks.push(
        status === "completed"
          ? sendPostTripSummary(updated).catch(() => {})
          : sendStatusUpdate(updated, status, assignedDriver ?? undefined).catch(() => {}),
      );
    }
    await Promise.allSettled(emailTasks);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to update booking" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const { tripType: _t, ...body } = req.body;
    const code = "LX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const [booking] = await db.insert(bookings).values({ ...body, confirmationCode: code, status: body.status ?? "pending" }).returning(bookingCols);
    const createEmailTasks: Promise<unknown>[] = [
      sendCustomerConfirmation(booking).catch(() => {}),
      sendAdminNotification(booking).catch(() => {}),
    ];
    if (booking.driverId) {
      const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, booking.driverId));
      if (driver?.email) { createEmailTasks.push(sendDriverAssignment(booking, driver).catch(() => {})); }
    }
    await Promise.allSettled(createEmailTasks);
    res.status(201).json(booking);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to create booking" });
  }
});

// ── Drivers ──────────────────────────────────────────────────────────────────

router.get("/drivers", async (_req, res) => {
  try {
    const rows = await db.select().from(adminDrivers).orderBy(desc(adminDrivers.createdAt));
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load drivers" }); }
});

router.get("/drivers/:id", async (req, res) => {
  try {
    const [driver] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(req.params.id)));
    if (!driver) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(driver);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load driver" }); }
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

// Generate or regenerate PIN for a driver
router.post("/drivers/:id/generate-pin", async (req, res) => {
  try {
    const pin = generatePin();
    const [updated] = await db.update(adminDrivers)
      .set({ accessPin: pin, pinGeneratedAt: new Date(), updatedAt: new Date() })
      .where(eq(adminDrivers.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json({ pin, driver: updated });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to generate PIN" }); }
});

// Set a custom PIN for a driver
router.patch("/drivers/:id/pin", async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4,10}$/.test(String(pin))) {
      res.status(400).json({ error: "PIN must be 4–10 digits" });
      return;
    }
    const [updated] = await db.update(adminDrivers)
      .set({ accessPin: String(pin), pinGeneratedAt: new Date(), updatedAt: new Date() })
      .where(eq(adminDrivers.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to set PIN" }); }
});

// Verify or reject a driver
router.patch("/drivers/:id/verify", async (req, res) => {
  try {
    const { verificationStatus } = req.body;
    if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
      res.status(400).json({ error: "verificationStatus must be pending, verified, or rejected" });
      return;
    }
    const updates: Record<string, unknown> = { verificationStatus, updatedAt: new Date() };
    if (verificationStatus === "verified") {
      const [current] = await db.select().from(adminDrivers).where(eq(adminDrivers.id, Number(req.params.id)));
      if (current && !current.accessPin) {
        updates.accessPin = generatePin();
        updates.pinGeneratedAt = new Date();
      }
    }
    const [updated] = await db.update(adminDrivers)
      .set(updates as any)
      .where(eq(adminDrivers.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Driver not found" }); return; }
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to update verification" }); }
});

// ── Vehicles ──────────────────────────────────────────────────────────────────

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

// ── Pricing ───────────────────────────────────────────────────────────────────

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

// ── Zones ─────────────────────────────────────────────────────────────────────

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

// ── Promotions ────────────────────────────────────────────────────────────────

  function parsePromoBody(body: any, partial = false) {
    const data: Record<string, any> = {};
    if (!partial || body.code !== undefined) {
      const code = String(body.code ?? "").trim().toUpperCase();
      if (!partial && !code) throw Object.assign(new Error("Promo code is required"), { status: 400 });
      if (code) data.code = code;
    }
    if (!partial || body.type !== undefined)
      data.type = body.type === "flat" ? "flat" : "percent";
    if (!partial || body.value !== undefined) {
      const val = Number(body.value);
      if (!partial && !(val > 0)) throw Object.assign(new Error("value must be a positive number"), { status: 400 });
      if (val > 0) {
        if ((data.type ?? "percent") === "percent" && val > 100)
          throw Object.assign(new Error("Percentage value cannot exceed 100"), { status: 400 });
        data.value = val;
      }
    }
    if (body.minAmount   !== undefined) data.minAmount   = Math.max(0, Number(body.minAmount ?? 0));
    if (body.maxUses     !== undefined) data.maxUses     = body.maxUses ? Math.max(1, Number(body.maxUses)) : null;
    if (body.expiresAt   !== undefined) data.expiresAt   = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.active      !== undefined) data.active      = Boolean(body.active);
    if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 300) : null;
    if (body.usedCount   !== undefined) data.usedCount   = Math.max(0, Number(body.usedCount));
    return data;
  }

  router.get("/promotions", async (_req, res) => {
    try {
      const rows = await db.select().from(promotions).orderBy(desc(promotions.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to load promotions" }); }
  });

  router.post("/promotions", async (req, res) => {
    try {
      const data = parsePromoBody(req.body, false);
      const [promo] = await db.insert(promotions).values(data as any).returning();
      res.status(201).json(promo);
    } catch (err: any) {
      const isDupe = err?.message?.includes("unique") || err?.code === "23505";
      const status = (err as any).status ?? (isDupe ? 409 : 500);
      const codeStr = String(req.body?.code ?? "").toUpperCase();
      res.status(status).json({ error: isDupe ? `Code "${codeStr}" already exists` : (err?.message ?? "Failed to create promotion") });
    }
  });

  router.patch("/promotions/:id", async (req, res) => {
    try {
      const data = parsePromoBody(req.body, true);
      if (!Object.keys(data).length) { res.status(400).json({ error: "No valid fields to update" }); return; }
      const [updated] = await db.update(promotions).set(data).where(eq(promotions.id, Number(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Promotion not found" }); return; }
      res.json(updated);
    } catch (err: any) {
      const isDupe = err?.message?.includes("unique") || err?.code === "23505";
      const status = (err as any).status ?? (isDupe ? 409 : 500);
      const codeStr = String(req.body?.code ?? "").toUpperCase();
      res.status(status).json({ error: isDupe ? `Code "${codeStr}" already exists` : (err?.message ?? "Failed to update promotion") });
    }
  });

  router.delete("/promotions/:id", async (req, res) => {
    try {
      await db.delete(promotions).where(eq(promotions.id, Number(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to delete promotion" }); }
  });

  
// ── Email diagnostic ──────────────────────────────────────────────────────────

router.get("/email-status", async (_req, res) => {
  const hasKey = !!process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL ?? "bookings@luxexride.com";
  res.json({ resend_configured: hasKey, key_prefix: hasKey ? process.env.RESEND_API_KEY!.slice(0, 8) + "..." : null, admin_email: adminEmail });
});

router.get("/dns-health", async (_req, res) => {
  try {
    const domain = "luxexride.com";
    const [mxRes, txtRes] = await Promise.all([
      fetch(`https://dns.google/resolve?name=${domain}&type=MX`).then(r => r.json()),
      fetch(`https://dns.google/resolve?name=${domain}&type=TXT`).then(r => r.json()),
    ]);
    const mxRecords: string[]  = (mxRes.Answer ?? []).map((r: any) => (r.data ?? "").toLowerCase());
    const txtRecords: string[] = (txtRes.Answer ?? []).map((r: any) => r.data ?? "");
    const hasMx1   = mxRecords.some(v => v.includes("mx1.privateemail.com"));
    const hasMx2   = mxRecords.some(v => v.includes("mx2.privateemail.com"));
    const hasSpf   = txtRecords.some(v => v.includes("spf") && v.includes("privateemail.com"));
    const resendOk = !!process.env.RESEND_API_KEY;
    const smtpOk   = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const checks = [
      { id: "mx1",    label: "MX1 Record",       ok: hasMx1,   detail: hasMx1   ? "mx1.privateemail.com active"          : "Missing — incoming email may fail" },
      { id: "mx2",    label: "MX2 Record",        ok: hasMx2,   detail: hasMx2   ? "mx2.privateemail.com active"          : "Missing — no failover MX" },
      { id: "spf",    label: "SPF Record",        ok: hasSpf,   detail: hasSpf   ? "v=spf1 include:spf.privateemail.com" : "Missing or incorrect SPF" },
      { id: "resend", label: "Resend (outbound)", ok: resendOk, detail: resendOk ? "API key configured"                  : "RESEND_API_KEY not set" },
      { id: "smtp",   label: "SMTP (corporate)",  ok: smtpOk,   detail: smtpOk   ? "SMTP credentials configured"         : "Not configured" },
    ];
    res.json({ ok: checks.every(c => c.ok), domain, checks, checkedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "DNS check failed", checks: [] });
  }
});

router.post("/bookings/:id/resend-confirmation", async (req, res) => {
  try {
    const booking = await db.select().from(bookings).where(eq(bookings.id, Number(req.params.id))).then(r => r[0]);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    await sendCustomerConfirmation(booking);
    res.json({ ok: true, to: booking.passengerEmail });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to resend confirmation" });
  }
});

// ── Clients (aggregated from bookings by email) ─────────────────────────────

router.get("/clients", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        email:             bookings.passengerEmail,
        name:              sql<string>`max(${bookings.passengerName})`,
        phone:             sql<string>`max(${bookings.passengerPhone})`,
        totalBookings:     sql<number>`count(*)::int`,
        completedBookings: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
        cancelledBookings: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')::int`,
        totalSpent:        sql<number>`coalesce(sum(${bookings.totalAmount}) filter (where ${bookings.status} != 'cancelled'), 0)`,
        firstBookingDate:  sql<string>`min(${bookings.date})`,
        lastBookingDate:   sql<string>`max(${bookings.date})`,
        lastCode:          sql<string>`max(${bookings.confirmationCode})`,
      })
      .from(bookings)
      .groupBy(bookings.passengerEmail)
      .orderBy(sql`max(${bookings.date}) desc`);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load clients" });
  }
});

router.get("/clients/:email/bookings", requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.passengerEmail, email))
      .orderBy(desc(bookings.date));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client bookings" });
  }
});

router.post("/test-email", async (_req, res) => {
  try {
    const mockBooking = {
      confirmationCode: "LX-TEST1",
      service: "corporate",
      date: new Date().toISOString().slice(0, 10),
      time: "14:00",
      pickupAddress: "123 Test Ave, Miami, FL",
      dropoffAddress: "Miami International Airport (MIA)",
      vehicleType: "sedan",
      passengers: 2,
      flightNumber: null,
      flightType: null,
      meetAndGreet: false,
      childSeat: false,
      notes: "This is a test email — no action required.",
      passengerName: "Test Passenger",
      passengerPhone: "+1 (305) 000-0000",
      passengerEmail: process.env.ADMIN_EMAIL ?? "contact@luxexride.com",
      baseAmount: 95,
      mileageAmount: 25,
      surchargesAmount: 10,
      tollsAmount: 0,
      totalAmount: 130,
      distanceMiles: 8.5,
      promoCode: null,
      promoDiscount: 0,
    };
    await sendAdminNotification(mockBooking);
    res.json({
      ok: true,
      message: "Test admin notification sent via Resend",
      resend_configured: !!process.env.RESEND_API_KEY,
      admin_email: process.env.ADMIN_EMAIL ?? "(not set)",
      admin_email_corporate: process.env.ADMIN_EMAIL_CORPORATE ?? "(not set — using defaults)",
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "Failed to send test email" });
  }
});

export default router;
