import { Router } from "express";
import { ensureAuthSchema } from "./authSchema";
import pool from "./db";


const router = Router();

router.get("/login", async (req, res) => {
  const email = req.query.email as string;
  const password = req.query.password as string;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  try {
    await ensureAuthSchema();

    const result = await pool.query(
      `SELECT id, full_name, email, phone, role::text AS role
       FROM admins
       WHERE email = $1 AND password = $2
       UNION ALL
       SELECT id, full_name, email, phone, role::text AS role
       FROM users
       WHERE email = $1 AND password = $2
       LIMIT 1`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = {
      id: result.rows[0].id,
      name: result.rows[0].full_name,
      email: result.rows[0].email,
      role: result.rows[0].role,
      phone: result.rows[0].phone ?? "",
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


    return res.status(200).json({
      message: "Login successful",
      user,
    });


  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
});

export default router;
