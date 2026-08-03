const { Storage } = require("@google-cloud/storage");
const crypto = require("crypto");
const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");

const storage = new Storage({
  projectId: config.gcsProjectId,
  keyFilename: config.gcsKeyFilename,
});

const bucket = storage.bucket(config.gcsBucket);

// Upload
const upload = async (file, options = {}) => {
  const { folder } = options;

  if (!folder) {
    throw new ApiError(500, "Upload folder is required.");
  }

  try {
    const extension = getExtension(file.originalname);
    const filename = `${crypto.randomUUID()}.${extension}`;
    const objectName = `${folder}/${filename}`;
    const blob = bucket.file(objectName);
    await blob.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    return {
      storage: STORAGE_PROVIDERS.GCS,
      path: objectName,
      url: `https://storage.googleapis.com/${config.gcsBucket}/${objectName}`,
      publicId: objectName,
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
      error.message || "Google Cloud Storage upload failed.",
    );
  }
};

// Delete
const remove = async (file) => {
  if (!file?.publicId) {
    return;
  }

  try {
    await bucket.file(file.publicId).delete({
      ignoreNotFound: true,
    });
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Failed to delete file from Google Cloud Storage.",
    );
  }
};

// Replace
const replace = async (oldFile, newFile, options = {}) => {
  const uploaded = await upload(newFile, options);

  if (oldFile) {
    await remove(oldFile);
  }

  return uploaded;
};

// Upload Multiple
const uploadMany = async (files = [], options = {}) => {
  return Promise.all(files.map((file) => upload(file, options)));
};

// Delete Multiple
const deleteMany = async (files = []) => {
  await Promise.all(files.map(remove));
};

// Replace Multiple
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

// npm install @google-cloud/storage
// run it while implementing Google Cloud Storage file upload service. It is the official Google Cloud client library for Node.js, which provides a set of tools and libraries for interacting with Google Cloud services, including Cloud Storage.
