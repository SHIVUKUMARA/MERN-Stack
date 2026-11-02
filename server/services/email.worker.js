const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const env = require("../config/env");
const logger = require("../logger");
const { sendEmail } = require("../utils/email");
const {
  claimEmailDelivery,
  markEmailAccepted,
  markEmailFailed,
  markEmailUnknown,
  classifyEmailError,
} = require("./email.service");
const User = require("../models/User");
const {
  enqueueEmailDelivery,
  closeQueue,
  JOB_PRIORITY,
} = require("./queue.service");

const connection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

const processBroadcastJob = async (job) => {
  const { filters = {}, subject, html } = job.data;

  // Validate the broadcast payload.
  if (!subject || !html) {
    throw new Error("Broadcast subject and html are required");
  }

  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new Error("Invalid broadcast filters");
  }

  // Currently supported filters.
  // Keep active and non-deleted restrictions mandatory.
  const allowedFilters = ["isActive", "isDeleted"];

  for (const key of Object.keys(filters)) {
    if (!allowedFilters.includes(key)) {
      throw new Error(`Unsupported broadcast filter: ${key}`);
    }
  }

  if (filters.isActive !== undefined && filters.isActive !== true) {
    throw new Error("Broadcasts can only target active users");
  }

  if (filters.isDeleted !== undefined && filters.isDeleted !== false) {
    throw new Error("Broadcasts cannot target deleted users");
  }

  const userFilter = {
    isActive: true,
    isDeleted: false,
  };

  logger.info(`Starting broadcast job: ${job.id}`);

  const cursor = User.find(userFilter)
    .select("_id firstName lastName email")
    .lean()
    .cursor({ batchSize: 100 });

  let totalRecipients = 0;
  let enqueued = 0;
  let skipped = 0;

  try {
    for await (const user of cursor) {
      const idempotencyKey = `broadcast-${job.id}-${user._id}`;

      const result = await enqueueEmailDelivery(
        {
          to: user.email,
          subject,
          html,
        },
        idempotencyKey,
        {},
        JOB_PRIORITY.LOW,
      );

      totalRecipients++;

      if (result.enqueued) {
        enqueued++;
      } else {
        skipped++;
      }
    }
  } finally {
    await cursor.close();
  }

  logger.info(
    `Broadcast completed: ${job.id} | ` +
      `Recipients: ${totalRecipients} | ` +
      `Enqueued: ${enqueued} | ` +
      `Skipped: ${skipped}`,
  );

  return {
    success: true,
    totalRecipients,
    enqueued,
    skipped,
  };
};

const processEmailJob = async (job) => {
  if (job.name === "enqueue-broadcast") {
    return processBroadcastJob(job);
  }

  if (job.name !== "send-email") {
    throw new Error(`Unsupported email job: ${job.name}`);
  }

  const { idempotencyKey, ...emailData } = job.data;

  if (!idempotencyKey) {
    throw new Error("Email job is missing idempotencyKey");
  }

  const delivery = await claimEmailDelivery(idempotencyKey);

  if (!delivery) {
    logger.warn(
      `Email delivery already claimed or processed: ${idempotencyKey}`,
    );
    return { skipped: true };
  }

  logger.info(`Processing email job: ${job.id}`);

  let info;

  // Stage 1: Send the email.
  try {
    info = await sendEmail(emailData);
  } catch (error) {
    const status = classifyEmailError(error);

    if (status === "failed") {
      await markEmailFailed(idempotencyKey, error);
      logger.error(`Email sending failed: ${job.id}`);
      return { success: false, status: "failed" };
    }

    await markEmailUnknown(idempotencyKey, error);
    logger.error(`Email delivery outcome unknown: ${job.id}`);

    return { success: false, status: "unknown" };
  }

  // Stage 2: Persist SMTP acceptance separately.
  try {
    const updatedDelivery = await markEmailAccepted(
      idempotencyKey,
      info.messageId,
    );

    if (!updatedDelivery) {
      logger.error(
        `SMTP accepted email but MongoDB status was not updated: ${job.id}`,
      );

      throw new Error("Could not persist accepted email status");
    }

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error(
      `SMTP accepted email, but delivery status persistence failed: ${job.id}`,
    );
    logger.error(error);

    // Do not throw into BullMQ: SMTP may already have accepted the email.
    return {
      success: false,
      status: "persistence-error",
    };
  }
};

connection.on("connect", () =>
  logger.info("BullMQ worker Redis connecting..."),
);

connection.on("reconnecting", () => {
  logger.warn("BullMQ worker Redis reconnecting...");
});

connection.on("ready", () => logger.info("BullMQ worker Redis connected"));

connection.on("error", (error) => {
  logger.error("BullMQ worker Redis error");
  logger.error(error);
});

const emailWorker = new Worker("email", processEmailJob, {
  connection,
  concurrency: 5,

  // Allow a maximum of 5 jobs per 10 seconds.
  limiter: {
    max: 5,
    duration: 10000,
  },

  // Check whether an active job has become stalled.
  lockDuration: 30000,

  // Check for stalled jobs every 30 seconds.
  stalledInterval: 30000,

  // Allow one automatic recovery from a stalled state.
  maxStalledCount: 1,
});

emailWorker.on("ready", () => {
  logger.info("Email worker is ready");
});

emailWorker.on("active", (job) => {
  logger.info(`Email job started: ${job.id}`);
});

emailWorker.on("stalled", (jobId) => {
  logger.warn(`Email job stalled: ${jobId}`);
});

emailWorker.on("completed", (job) => {
  logger.info(`Email job completed: ${job.id}`);
});

emailWorker.on("failed", (job, error) => {
  logger.error(`Email job failed: ${job?.id}`);
  logger.error(error);
});

emailWorker.on("error", (error) => {
  logger.error("Email worker error");
  logger.error(error);
});

let isClosing = false;

const closeWorker = async () => {
  if (isClosing) return;
  isClosing = true;

  logger.info("Closing BullMQ email worker...");

  try {
    await emailWorker.close();
    await closeQueue();
    await connection.quit();

    logger.info("BullMQ email worker closed");
  } catch (error) {
    logger.error("Error closing BullMQ email worker");
    logger.error(error);
    throw error;
  }
};

module.exports = { emailWorker, closeWorker };
