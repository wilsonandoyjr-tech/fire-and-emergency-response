import express, { type RequestHandler } from "express";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { Server } from "socket.io";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import registerRouter from "./register";
import loginRouter from "./login";
import { appRouter, incidentEvents } from "./routers";
import { ensureFireSchema } from "./fireSchema";

const app = express();
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDev = process.env.NODE_ENV !== "production";
const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (isDev) return true;
  if (CLIENT_ORIGINS.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname.endsWith(".onrender.com");
  } catch {
    return false;
  }
};
const corsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  callback(null, isAllowedOrigin(origin));
};
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/", registerRouter);
app.use("/", loginRouter);
app.use("/api", registerRouter);
app.use("/api", loginRouter);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
  }) as RequestHandler,
);

const DEFAULT_PORT = 5000;
const portValue = Number(process.env.PORT ?? "");
const PORT = Number.isFinite(portValue) && portValue > 0 ? portValue : DEFAULT_PORT;

const shutdown = () => {
  console.log("Shutting down server...");
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

incidentEvents.on("incident:created", (incident) => {
  io.emit("incident:created", incident);
});

incidentEvents.on("incident:updated", (incident) => {
  io.emit("incident:updated", incident);
});

incidentEvents.on("incident:deleted", (incident) => {
  io.emit("incident:deleted", incident);
});

incidentEvents.on("sos:created", (alert) => {
  io.emit("sos:created", alert);
});

incidentEvents.on("sos:updated", (alert) => {
  io.emit("sos:updated", alert);
});

incidentEvents.on("deployment:created", (payload) => {
  io.emit("deployment:created", payload);
});

ensureFireSchema()
  .then(() => {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Failed to prepare database schema:", error);
    process.exit(1);
  });
