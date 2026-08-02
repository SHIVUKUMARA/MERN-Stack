const { BlobServiceClient } = require("@azure/storage-blob");
const crypto = require("crypto");

const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");

const blobServiceClient = BlobServiceClient.fromConnectionString(
  config.azureStorageConnectionString,
);

const containerClient = blobServiceClient.getContainerClient(
  config.azureStorageContainer,
);

// ======================================================
// Upload
// ======================================================

const upload = async (file, options = {}) => {
  const { folder } = options;

  if (!folder) {
    throw new ApiError(500, "Upload folder is required.");
  }

  try {
    const extension = getExtension(file.originalname);

    const filename = `${crypto.randomUUID()}.${extension}`;

    const blobName = `${folder}/${filename}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    return {
      storage: STORAGE_PROVIDERS.AZURE,

      path: blobName,

      url: blockBlobClient.url,

      publicId: blobName,

      resourceType: null,

      filename,

      originalName: file.originalname,

      mimeType: file.mimetype,

      extension,

      size: file.size,

      width: file.width ?? null,

      height: file.height ?? null,

      isOptimized: file.isOptimized ?? false,

      thumbnail: null,

      uploadedAt: new Date(),
    };
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Azure Blob upload failed.",
    );
  }
};

// ======================================================
// Delete
// ======================================================

const remove = async (file) => {
  if (!file?.publicId) {
    return;
  }

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(file.publicId);

    await blockBlobClient.deleteIfExists();
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Failed to delete file from Azure Blob Storage.",
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

// npm install @azure/storage-blob
