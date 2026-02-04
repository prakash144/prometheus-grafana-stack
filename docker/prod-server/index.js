// ===== IMPORTS =====
const apminsight = require("apminsight");
const express = require("express");
const client = require("prom-client");
const { createLogger, transports, format } = require("winston");
const LokiTransport = require("winston-loki");
const responseTime = require("response-time");
// const { v4: uuidv4 } = require("uuid");
const { doSomeHeavyTask } = require("./util");

const app = express();
const PORT = process.env.PORT || 8000;

// ===== LOGGER =====
const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new LokiTransport({
      labels: { app: "express-server" },
      host: "http://loki:3100",
    }),
  ],
});

// ===== PROCESS-LEVEL ERROR HANDLING =====
process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION - Application Crashed", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("UNHANDLED PROMISE REJECTION", { reason });
});

// ===== PROMETHEUS SETUP =====
try {
  client.collectDefaultMetrics({ register: client.register });
} catch (error) {
  logger.error("Failed to initialize Prometheus default metrics", {
    error: error.message,
  });
}

const reqResTime = new client.Histogram({
  name: "http_request_response_time_seconds",
  help: "Histogram of HTTP request response times in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5, 10],
});

const reqCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// ===== UTIL: ASYNC HANDLER WRAPPER =====
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ===== MIDDLEWARES =====

// Request ID
// app.use((req, res, next) => {
//   req.id = uuidv4();
//   res.set("X-Request-ID", req.id);
//   next();
// });

// Response time + metrics
app.use(
  responseTime((req, res, time) => {
    try {
      const route = req.route?.path || req.path || "unknown";

      reqCounter
        .labels(req.method, route, String(res.statusCode))
        .inc();

      reqResTime
        .labels(req.method, route, String(res.statusCode))
        .observe(time / 1000);
    } catch (error) {
      logger.error("Failed to record Prometheus metrics", {
        error: error.message,
        method: req.method,
        url: req.originalUrl,
        requestId: req.id,
      });
    }
  })
);

// Safer request logging (no sensitive headers)
app.use((req, res, next) => {
  try {
    logger.info("Incoming request", {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"],
      contentType: req.headers["content-type"],
    });
  } catch (error) {
    console.error("CRITICAL: Logger failed!", error);
  }
  next();
});

// ===== ROUTES =====
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express Server" });
});

app.get(
  "/slow",
  asyncHandler(async (req, res) => {
    const timeTaken = await doSomeHeavyTask();

    logger.info("/slow success", {
      requestId: req.id,
      timeTakenMs: timeTaken,
    });

    res.json({
      status: "success",
      message: `Heavy task completed in ${timeTaken}ms`,
    });
  })
);

// Health check (useful for k8s / load balancers)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// (Optional) protect metrics in prod
app.use("/metrics", (req, res, next) => {
  // Example: restrict to internal network
  // if (!req.ip.startsWith("10.")) return res.status(403).send("Forbidden");
  next();
});

app.get("/metrics", asyncHandler(async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
}));

// ===== 404 HANDLER =====
app.use((req, res) => {
  logger.warn("Route not found (404)", {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
  });
  res.status(404).json({ error: "Not Found" });
});

// ===== CENTRALIZED ERROR HANDLER =====
app.use((err, req, res, next) => {
  logger.error("Global Express error handler", {
    requestId: req.id,
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(500).json({ error: "Internal Server Error" });
});

// ===== SERVER START =====
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info("Express Server started", { port: PORT });
});

server.on("error", (error) => {
  logger.error("Server startup error", { error: error.message });
});
