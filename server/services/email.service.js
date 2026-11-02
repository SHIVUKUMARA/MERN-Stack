const EmailDelivery = require("../models/EmailDelivery");

// Create a delivery record or return an existing one.
const createEmailDelivery = async ({ idempotencyKey, to, subject }) => {
  try {
    const delivery = await EmailDelivery.create({
      idempotencyKey,
      to,
      subject,
    });

    return {
      delivery,
      created: true,
    };
  } catch (error) {
    // MongoDB duplicate-key error.
    if (error.code === 11000) {
      const existingDelivery = await EmailDelivery.findOne({
        idempotencyKey,
      });

      if (existingDelivery) {
        return {
          delivery: existingDelivery,
          created: false,
        };
      }
    }

    throw error;
  }
};

// Retrieve a delivery record.
const getEmailDelivery = async (idempotencyKey) => {
  return EmailDelivery.findOne({ idempotencyKey });
};

const claimEmailDelivery = async (idempotencyKey) => {
  return EmailDelivery.findOneAndUpdate(
    {
      idempotencyKey,
      status: {
        $in: ["pending", "failed"],
      },
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date(),
        lastError: null,
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      new: true,
    },
  );
};

const markEmailAccepted = async (idempotencyKey, messageId) => {
  return EmailDelivery.findOneAndUpdate(
    {
      idempotencyKey,
      status: "processing",
    },
    {
      $set: {
        status: "accepted",
        messageId: messageId || null,
        acceptedAt: new Date(),
      },
      $unset: {
        processingStartedAt: 1,
        lastError: 1,
      },
    },
    {
      new: true,
    },
  );
};

const markEmailFailed = async (idempotencyKey, error) => {
  return EmailDelivery.findOneAndUpdate(
    {
      idempotencyKey,
      status: "processing",
    },
    {
      $set: {
        status: "failed",
        lastError: error.message || "Email sending failed",
      },
      $unset: {
        processingStartedAt: 1,
      },
    },
    {
      new: true,
    },
  );
};

const markEmailUnknown = async (idempotencyKey, error) => {
  return EmailDelivery.findOneAndUpdate(
    {
      idempotencyKey,
      status: "processing",
    },
    {
      $set: {
        status: "unknown",
        lastError: error.message || "SMTP delivery outcome is unknown",
      },
      $unset: {
        processingStartedAt: 1,
      },
    },
    {
      new: true,
    },
  );
};

const classifyEmailError = (error) => {
  const responseCode = Number(error.responseCode);

  // Authentication errors.
  if (responseCode === 535 || responseCode === 534) {
    return "failed";
  }

  // Explicit SMTP rejection.
  if (responseCode >= 550 && responseCode <= 554) {
    return "failed";
  }

  // Connection failures before SMTP message submission.
  if (
    error.code === "ECONNECTION" ||
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND"
  ) {
    return "failed";
  }

  // Everything else is conservatively considered uncertain.
  return "unknown";
};

module.exports = {
  createEmailDelivery,
  getEmailDelivery,
  claimEmailDelivery,
  markEmailAccepted,
  markEmailFailed,
  markEmailUnknown,
  classifyEmailError,
};
