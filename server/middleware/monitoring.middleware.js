const {
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
} = require("../config/metrics");

const monitoringMiddleware = (req, res, next) => {
  // Do not monitor the monitoring endpoint itself.
  if (req.path === "/metrics") {
    return next();
  }

  const startTime = process.hrtime.bigint();

  httpActiveRequests.inc();

  res.on("finish", () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1e9;

    const route = req.route?.path || "not_found";
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      duration,
    );

    httpActiveRequests.dec();
  });

  next();
};

module.exports = monitoringMiddleware;

/*       Express Backend
               │
        Monitoring Middleware
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
  Counter   Histogram   Gauge
     │         │         │
     └─────────┼─────────┘
               ▼
            /metrics
               │
               ▼
          Prometheus */
