const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

// ======================================================
// Upload
// ======================================================

const upload = async (file, options = {}) => {
  const { folder } = options;

  if (!folder) {
    throw new ApiError(500, "Upload folder is required.");
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          return reject(
            new ApiError(500, error.message || "Cloudinary upload failed."),
          );
        }

        resolve(result);
      },
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });

  return {
    storage: STORAGE_PROVIDERS.CLOUDINARY,

    path: null,

    url: result.secure_url,

    publicId: result.public_id,

    resourceType: result.resource_type,

    filename: result.public_id.split("/").pop(),

    originalName: file.originalname,

    mimeType: file.mimetype,

    extension: getExtension(file.originalname),

    size: file.size,

    width: file.width ?? result.width ?? null,

    height: file.height ?? result.height ?? null,

    isOptimized: file.isOptimized ?? false,

    thumbnail: null,

    uploadedAt: new Date(),
  };
};

// ======================================================
// Delete
// ======================================================

const remove = async (file) => {
  if (!file?.publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(file.publicId, {
      resource_type: file.resourceType || "image",
    });
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Failed to delete file from Cloudinary.",
    );
  }
};

// ======================================================
// Replace
// ======================================================

const replace = async (oldFile, newFile, options = {}) => {
  const uploaded = await upload(newFile, options);

  if (oldFile) {
    await remove(oldFile);
  }

  return uploaded;
};

// ======================================================
// Upload Multiple
// ======================================================

const uploadMany = async (files = [], options = {}) => {
  return Promise.all(files.map((file) => upload(file, options)));
};

// ======================================================
// Delete Multiple
// ======================================================

const deleteMany = async (files = []) => {
  await Promise.all(files.map(remove));
};

// ======================================================
// Replace Multiple
// ======================================================

const replaceMany = async (oldFiles = [], newFiles = [], options = {}) => {
  const uploadedFiles = await uploadMany(newFiles, options);

  if (oldFiles.length) {
    await deleteMany(oldFiles);
  }

  return uploadedFiles;
};

module.exports = {
  upload,
  delete: remove,
  replace,
  uploadMany,
  deleteMany,
  replaceMany,
};
