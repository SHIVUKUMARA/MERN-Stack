const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/auth.middleware");
const { requireAdmin } = require("../../middleware/admin.middleware");

const {
  getEmailQueueStats,
  getFailedEmailJobsController,
  retryFailedEmailJobController,
} = require("../../controllers/queue.controller");

router.get("/email/stats", protect, requireAdmin, getEmailQueueStats);

router.get(
  "/email/failed",
  protect,
  requireAdmin,
  getFailedEmailJobsController,
);

router.post(
  "/email/:jobId/retry",
  protect,
  requireAdmin,
  retryFailedEmailJobController,
);

module.exports = router;
