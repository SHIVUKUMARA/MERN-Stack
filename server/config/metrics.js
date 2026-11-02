const client = require("prom-client");
const { emailQueue } = require("../services/queue.service");

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

// BullMQ email queue metrics.

const bullmqWaitingJobs = new client.Gauge({
  name: "bullmq_waiting_jobs",
  help: "Number of waiting BullMQ email jobs",
});

const bullmqActiveJobs = new client.Gauge({
  name: "bullmq_active_jobs",
  help: "Number of active BullMQ email jobs",
});

const bullmqCompletedJobs = new client.Gauge({
  name: "bullmq_completed_jobs",
  help: "Number of completed BullMQ email jobs",
});

const bullmqFailedJobs = new client.Gauge({
  name: "bullmq_failed_jobs",
  help: "Number of failed BullMQ email jobs",
});

const bullmqDelayedJobs = new client.Gauge({
  name: "bullmq_delayed_jobs",
  help: "Number of delayed BullMQ email jobs",
});

// Collect current BullMQ email queue statistics.
const updateBullMQMetrics = async () => {
  const counts = await emailQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );

  bullmqWaitingJobs.set(counts.waiting);
  bullmqActiveJobs.set(counts.active);
  bullmqCompletedJobs.set(counts.completed);
  bullmqFailedJobs.set(counts.failed);
  bullmqDelayedJobs.set(counts.delayed);
};

module.exports = {
  client,
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
  bullmqWaitingJobs,
  bullmqActiveJobs,
  bullmqCompletedJobs,
  bullmqFailedJobs,
  bullmqDelayedJobs,
  updateBullMQMetrics,
};
