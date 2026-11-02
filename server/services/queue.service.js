const { Queue, QueueEvents } = require("bullmq");
const IORedis = require("ioredis");
const crypto = require("node:crypto");
const User = require("../models/User");
const { createEmailDelivery } = require("./email.service");
const env = require("../config/env");
const logger = require("../logger");

const JOB_PRIORITY = Object.freeze({
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 5,
  LOW: 10,
});

const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("connect", () =>
  logger.info("BullMQ producer Redis connecting..."),
);

connection.on("ready", () => logger.info("BullMQ producer Redis connected"));

connection.on("error", (error) => {
  logger.error("BullMQ producer Redis error");
  logger.error(error);
});

connection.on("reconnecting", () =>
  logger.info("BullMQ producer Redis reconnecting..."),
);

const emailQueue = new Queue("email", { connection });

const emailQueueEvents = new QueueEvents("email", {
  connection: connection.duplicate(),
});

emailQueueEvents.on("waiting", ({ jobId }) => {
  logger.info(`Email job waiting: ${jobId}`);
});

emailQueueEvents.on("active", ({ jobId }) => {
  logger.info(`Email job active: ${jobId}`);
});

emailQueueEvents.on("completed", ({ jobId }) => {
  logger.info(`Email job completed: ${jobId}`);
});

emailQueueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.error(`Email job failed: ${jobId}`);
  logger.error(failedReason);
});

emailQueueEvents.on("stalled", ({ jobId }) => {
  logger.warn(`Email job stalled: ${jobId}`);
});

const getPendingEmailJobId = async (deduplicationId) => {
  return emailQueue.getDeduplicationJobId(deduplicationId);
};

const addEmailJob = async (data, options = {}) => {
  const { deduplicationId, ...jobOptions } = options;

  return emailQueue.add("send-email", data, {
    ...jobOptions,

    ...(deduplicationId && {
      deduplication: {
        id: deduplicationId,
      },
    }),

    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours
      count: 1000, // Keep up to 1,000 recent completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days
      count: 1000, // Keep up to 1,000 recent failed jobs
    },
  });
};

const enqueueEmailDelivery = async (
  emailData,
  idempotencyKey,
  jobOptions = {},
  priority = JOB_PRIORITY.NORMAL,
) => {
  if (!idempotencyKey) {
    throw new Error("Email idempotencyKey is required");
  }

  // Validate priority.
  if (!Object.values(JOB_PRIORITY).includes(priority)) {
    throw new Error("Invalid email job priority");
  }

  const { to, subject } = emailData;

  // Step 1: Create or retrieve the MongoDB delivery record.
  const { delivery } = await createEmailDelivery({
    idempotencyKey,
    to,
    subject,
  });

  // Step 2: Only pending deliveries can be enqueued.
  if (delivery.status !== "pending") {
    return {
      delivery,
      enqueued: false,
      reason: `Delivery is already ${delivery.status}`,
    };
  }

  // Step 3: Generate a deterministic BullMQ job ID.
  const jobId = `email-${crypto
    .createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")}`;

  // Step 4: Add the job to BullMQ.
  const job = await addEmailJob(
    {
      ...emailData,
      idempotencyKey,
    },
    {
      ...jobOptions,
      jobId,
      priority,
    },
  );

  return {
    delivery,
    jobId: job.id,
    enqueued: true,
  };
};

const getEmailQueueCounts = async () => {
  return emailQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  );
};

const getFailedEmailJobs = async (start = 0, end = 19) => {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start
  ) {
    throw new Error("Invalid pagination parameters");
  }

  const jobs = await emailQueue.getFailed(start, end);

  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: {
      to: job.data.to,
      subject: job.data.subject,
    },
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    failureReason: job.failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }));
};

const retryFailedEmailJob = async (jobId) => {
  if (!jobId || typeof jobId !== "string") {
    throw new Error("Valid job ID is required");
  }

  const job = await emailQueue.getJob(jobId);

  if (!job) {
    return {
      success: false,
      reason: "Job not found",
    };
  }

  const state = await job.getState();

  if (state !== "failed") {
    return {
      success: false,
      reason: `Job cannot be retried because its current state is ${state}`,
    };
  }

  await job.retry();

  return {
    success: true,
    id: job.id,
    name: job.name,
    status: "waiting",
  };
};

const scheduleRecurringEmail = async (
  schedulerId,
  data,
  intervalMs,
  options = {},
) => {
  return emailQueue.upsertJobScheduler(
    schedulerId,
    {
      every: intervalMs,
    },
    {
      name: "send-email",
      data,
      opts: {
        ...options,
        priority: options.priority ?? JOB_PRIORITY.NORMAL,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 1000,
        },
      },
    },
  );
};

const removeRecurringEmail = async (schedulerId) => {
  return emailQueue.removeJobScheduler(schedulerId);
};

const addBroadcastJob = async (data, options = {}) => {
  return emailQueue.add("enqueue-broadcast", data, {
    ...options,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 1000,
    },
  });
};

const scheduleRecurringBroadcast = async (
  schedulerId,
  data,
  intervalMs,
  options = {},
) => {
  return emailQueue.upsertJobScheduler(
    schedulerId,
    {
      every: intervalMs,
    },
    {
      name: "enqueue-broadcast",
      data: {
        ...data,
        schedulerId,
      },
      opts: {
        ...options,
        priority: options.priority ?? 5,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
          count: 1000,
        },
      },
    },
  );
};

let isClosing = false;

const closeQueue = async () => {
  if (isClosing) return;
  isClosing = true;

  logger.info("Closing BullMQ producer queue...");

  try {
    await emailQueueEvents.close();
    await emailQueue.close();
    await connection.quit();

    logger.info("BullMQ producer queue closed");
  } catch (error) {
    logger.error("Error closing BullMQ producer queue");
    logger.error(error);
    throw error;
  }
};

module.exports = {
  JOB_PRIORITY,
  emailQueue,
  emailQueueEvents,
  getPendingEmailJobId,
  addEmailJob,
  enqueueEmailDelivery,
  getEmailQueueCounts,
  getFailedEmailJobs,
  retryFailedEmailJob,
  scheduleRecurringEmail,
  removeRecurringEmail,
  addBroadcastJob,
  scheduleRecurringBroadcast,
  closeQueue,
};
