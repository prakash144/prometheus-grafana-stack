const express = require("express");
const client = require("prom-client"); 
const { createLogger, transports, format } = require("winston");
const LokiTransport = require("winston-loki");
const responseTime = require("response-time");
const { doSomeHeavyTask } = require("./util");

const options = {
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new LokiTransport({
      labels: { app: "express-server" },
      host: "http://loki:3100"
    })
  ]
};

const logger = createLogger(options);

const app = express();
const PORT = process.env.PORT || 8000;

// =============================
// PROCESS LEVEL ERROR HANDLING
// =============================

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION - Application Crashed", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("UNHANDLED PROMISE REJECTION", {
    reason: reason,
  });
});

// =============================
// PROMETHEUS SETUP
// =============================

try {
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ register: client.register });
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
});

// =============================
// MIDDLEWARES
// =============================

// Response time + metrics with error safety
app.use(
  responseTime((req, res, time) => {
    try {
      reqCounter.inc();
      const route = req.route?.path || req.originalUrl;

      reqResTime
        .labels(req.method, route, String(res.statusCode))
        .observe(time / 1000);
    } catch (error) {
      logger.error("Failed to record Prometheus metrics", {
        error: error.message,
        method: req.method,
        url: req.originalUrl,
      });
    }
  })
);

// Request logger with error safety
app.use((req, res, next) => {
  try {
    logger.info("Incoming request", {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
    });
  } catch (error) {
    console.error("CRITICAL: Logger failed!", error);
  }
  next();
});

// =============================
// ROUTES
// =============================

app.get("/", (req, res) => {
  try {
    res.json({
      message: "Hello from Express Server",
    });
  } catch (error) {
    logger.error("Error in / route", {
      error: error.message,
    });
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/slow", async (req, res) => {
  const requestStart = Date.now();

  try {
    const timeTaken = await doSomeHeavyTask();
    const totalTime = Date.now() - requestStart;

    logger.info("/slow success", {
      responseTimeMs: totalTime,
    });

    res.json({
      status: "success",
      message: `Heavy task completed in ${timeTaken}ms`,
    });
  } catch (error) {
    const totalTime = Date.now() - requestStart;

    logger.error("/slow failed", {
      responseTimeMs: totalTime,
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    logger.error("Failed to serve metrics", {
      error: err.message,
      stack: err.stack,
    });
    res.status(500).end("Metrics unavailable");
  }
});

// =============================
// 404 HANDLER (MISSING ROUTE)
// =============================
app.use((req, res) => {
  logger.warn("Route not found (404)", {
    method: req.method,
    url: req.originalUrl,
  });
  res.status(404).json({ error: "Not Found" });
});

// =============================
// CENTRALIZED ERROR HANDLER
// =============================
app.use((err, req, res, next) => {
  logger.error("Global Express error handler", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(500).json({
    error: "Internal Server Error",
  });
});

// =============================
// SERVER STARTUP
// =============================

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info("Express Server started", { port: PORT });
});

server.on("error", (error) => {
  logger.error("Server startup error", {
    error: error.message,
  });
});
