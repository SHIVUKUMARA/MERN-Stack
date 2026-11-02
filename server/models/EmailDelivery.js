const mongoose = require("mongoose");

const emailDeliverySchema = new mongoose.Schema(
  {
    // Unique identifier for the business email operation.
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Recipient of the email.
    to: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // SMTP delivery outcome.
    status: {
      type: String,
      enum: ["pending", "processing", "accepted", "failed", "unknown"],
      default: "pending",
      required: true,
    },

    // Number of actual sending attempts.
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // SMTP message identifier, when available.
    messageId: {
      type: String,
      default: null,
    },

    // Last known error, for internal diagnostics.
    lastError: {
      type: String,
      default: null,
    },

    processingStartedAt: {
      type: Date,
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("EmailDelivery", emailDeliverySchema);
