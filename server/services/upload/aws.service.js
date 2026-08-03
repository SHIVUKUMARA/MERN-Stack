const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const crypto = require("crypto");

const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");

const s3 = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

// Upload
const upload = async (file, options = {}) => {
  const { folder } = options;

  if (!folder) {
    throw new ApiError(500, "Upload folder is required.");
  }
  const extension = getExtension(file.originalname);
  const filename = `${crypto.randomUUID()}.${extension}`;
  const key = `${folder}/${filename}`;
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.awsBucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      storage: STORAGE_PROVIDERS.S3,
      path: key,
      url: `https://${config.awsBucket}.s3.${config.awsRegion}.amazonaws.com/${key}`,
      publicId: key,
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
    throw new ApiError(500, error.message || "AWS S3 upload failed.");
  }
};

// Delete
const remove = async (file) => {
  if (!file?.publicId) {
    return;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.awsBucket,
        Key: file.publicId,
      }),
    );
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Failed to delete file from AWS S3.",
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

// npm install @aws-sdk/client-s3
// run it while implementing AWS S3 file upload service. It is the official AWS SDK for JavaScript, which provides a set of tools and libraries for interacting with Amazon Web Services (AWS) services, including S3.
