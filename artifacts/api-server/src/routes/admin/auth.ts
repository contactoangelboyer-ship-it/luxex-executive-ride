import { Router } from "express";
import { createAdminToken, validateAdminCredentials } from "../../middlewares/adminAuth";

const router = Router();

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  if (!validateAdminCredentials(username, password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = createAdminToken(username);
  res.json({ token, username });
});

export default router;
