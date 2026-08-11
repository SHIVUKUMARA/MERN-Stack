const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

/* Liveness and readiness are not the same thing.
Liveness => "Am I alive?" => currently it is my health route that is "/" checks server is alive
Readiness => "Can I actually serve requests correctly?" => currently it is my "/health/reday" checks database is connected to server or not*/

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is running successfully",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================================
// Readiness
// ==========================================================

router.get("/ready", (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1;
  // What readyState === 1 means
  // 0 → disconnected
  // 1 → connected
  // 2 → connecting
  // 3 → disconnecting
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      message: "Backend is not ready",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Backend is ready",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
