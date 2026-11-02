const express = require("express");
const { client, updateBullMQMetrics } = require("../config/metrics");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Update BullMQ queue metrics before returning Prometheus metrics.
    try {
      await updateBullMQMetrics();
    } catch (error) {
      // Queue metrics should not prevent other metrics from being exposed.
      console.error("Failed to update BullMQ metrics:", error.message);
    }

    res.set("Content-Type", client.register.contentType);

    const metrics = await client.register.metrics();

    res.end(metrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to collect application metrics",
    });
  }
});

module.exports = router;
