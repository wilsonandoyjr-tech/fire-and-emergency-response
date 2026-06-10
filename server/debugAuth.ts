import type { Request, Response } from "express";
import { COOKIE_NAME } from "./authCookies";

export function attachDebugAuthRoutes(app: import("express").Express) {
  app.get("/api/debug/auth/cookie", (req: Request, res: Response) => {
    // cookie-parser populates req.cookies
    const cookies = (req as any).cookies as Record<string, any> | undefined;
    res.json({
      cookieName: COOKIE_NAME,
      hasCookie: !!cookies?.[COOKIE_NAME],
      rawCookieValuePresent: typeof cookies?.[COOKIE_NAME] === "string" && cookies?.[COOKIE_NAME].length > 0,
      cookiesKeys: Object.keys(cookies ?? {}),
    });
  });
}

