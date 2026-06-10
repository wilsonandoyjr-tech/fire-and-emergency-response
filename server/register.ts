import { Router } from "express";
import { ensureAuthSchema } from "./authSchema";
import pool from "./db";



const router = Router();
const allowedRoles = ["admin", "fire", "medical", "pulis"] as const;
type AllowedRole = (typeof allowedRoles)[number];

router.post("/register", async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;
  const normalizedRole = String(role ?? "").trim().toLowerCase() as AllowedRole;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const tableName = normalizedRole === "admin" ? "admins" : "users";

  try {
    await ensureAuthSchema();

    const result = await pool.query(
      `INSERT INTO ${tableName} (full_name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role`,
      [fullName, email, password, phone ?? null, normalizedRole],
    );

    const account = result.rows[0];
    const user = {
      id: account.id,
      name: account.full_name,
      email: account.email,
      phone: account.phone ?? "",
      role: account.role,
    };

    const { signAuthToken, setAuthCookie } = await import("./authCookies");
    const token = signAuthToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
    setAuthCookie(res, req, token);


    return res.status(201).json({

      message: `${normalizedRole.charAt(0).toUpperCase()}${normalizedRole.slice(1)} registered successfully`,
      user,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Email already registered" });
    }

    console.error("Error occurred while registering account:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
});

export default router;
