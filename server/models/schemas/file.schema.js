const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    storage: {
      type: String,
      enum: ["local", "cloudinary", "s3", "azure", "gcs"],
      required: true,
    },

    path: {
      type: String,
      default: null,
    },

    url: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      default: null,
    },

    resourceType: {
      type: String,
      default: null,
    },

    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    extension: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
    },

    // New fields for image processing
    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },

    isOptimized: {
      type: Boolean,
      default: false,
    },

    thumbnail: {
      type: Object,
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

module.exports = fileSchema;