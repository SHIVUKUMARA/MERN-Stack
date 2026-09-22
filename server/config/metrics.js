const client = require("prom-client");

// Collect default Node.js/process metrics.
client.collectDefaultMetrics();

/* 
collectDefaultMetrics() starts collecting Node.js runtime metrics such as:

CPU usage
Memory usage
Event loop information
Garbage collection
Process information

We will add our HTTP metrics separately.
*/

// Total number of HTTP requests. How many requests have happened?
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// HTTP request duration. How long are requests taking?
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// Number of currently active HTTP requests. How many requests are currently being processed?
const httpActiveRequests = new client.Gauge({
  name: "http_active_requests",
  help: "Number of currently active HTTP requests",
});

module.exports = {
  client,
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
};