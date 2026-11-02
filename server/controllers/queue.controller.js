const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  getEmailQueueCounts,
  getFailedEmailJobs,
  retryFailedEmailJob,
} = require("../services/queue.service");

const getEmailQueueStats = asyncHandler(async (req, res) => {
  const counts = await getEmailQueueCounts();

  res.status(200).json({
    success: true,
    message: "Email queue statistics retrieved successfully",
    data: counts,
  });
});

const getFailedEmailJobsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new ApiError(
      400,
      "Page must be a positive integer and limit must be between 1 and 100",
    );
  }

  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const [jobs, counts] = await Promise.all([
    getFailedEmailJobs(start, end),
    getEmailQueueCounts(),
  ]);

  res.status(200).json({
    success: true,
    message: "Failed email jobs retrieved successfully",
    data: {
      jobs,
      pagination: {
        page,
        limit,
        total: counts.failed,
        totalPages: Math.ceil(counts.failed / limit),
      },
    },
  });
});

const retryFailedEmailJobController = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  if (!jobId || jobId.length > 100) {
    throw new ApiError(400, "Invalid job ID");
  }

  const result = await retryFailedEmailJob(jobId);

  if (!result) {
    throw new ApiError(404, "Email job not found");
  }

  if (result.notFailed) {
    throw new ApiError(409, "Email job is not in a failed state");
  }

  res.status(200).json({
    success: true,
    message: "Email job queued for retry",
    data: result,
  });
});

module.exports = {
  getEmailQueueStats,
  getFailedEmailJobsController,
  retryFailedEmailJobController,
};
