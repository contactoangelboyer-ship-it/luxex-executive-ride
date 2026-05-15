import { Router } from "express";
import crypto from "crypto";
import { db, adminUsers } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../../middlewares/adminAuth";

const router = Router();

function hashPassword(pw: string): string {
  return crypto.createHmac("sha256", "luxex-salt").update(pw).digest("hex");
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  try {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, username: user.username, role: "admin" });
    res.json({ token, username: user.username });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
