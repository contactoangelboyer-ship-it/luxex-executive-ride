import { Router } from "express";
import crypto from "crypto";
import { db, adminUsers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../../middlewares/adminAuth";
import { logger } from "../../lib/logger";

const router = Router();

function hashPassword(pw: string): string {
  return crypto.createHmac("sha256", "luxex-salt").update(pw).digest("hex");
}

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "LuxEx2026!";

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  // ── 1. Master override via ADMIN_PASSWORD env var ──────────────────────────
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && password === envPassword) {
    const token = signToken({ id: 0, username, role: "admin" });
    res.json({ token, username });
    return;
  }

  // ── 2. DB-based login ──────────────────────────────────────────────────────
  try {
    if (!db) {
      res.status(503).json({ error: "Database not configured" });
      return;
    }

    // Check if any admin users exist
    const allUsers = await db.select().from(adminUsers);

    // ── 3. Bootstrap: no users yet → accept defaults and create first admin ──
    if (allUsers.length === 0) {
      if (username === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD) {
        const hash = hashPassword(password);
        const [created] = await db.insert(adminUsers)
          .values({ username, passwordHash: hash })
          .returning();
        const token = signToken({ id: created.id, username: created.username, role: "admin" });
        logger.info({ username }, "First admin user created on initial login");
        res.json({ token, username: created.username });
        return;
      }
      // No users + wrong credentials → give a helpful hint
      res.status(401).json({
        error: "No admin users configured. Use username \"admin\" and password \"LuxEx2026!\" to set up your first account.",
      });
      return;
    }

    // ── 4. Normal DB lookup ────────────────────────────────────────────────
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, username: user.username, role: "admin" });
    res.json({ token, username: user.username });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
