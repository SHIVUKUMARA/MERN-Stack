const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");


// Upload
const upload = async (file, options = {}) => {
  const { folder } = options;

  if (!folder) {
    throw new ApiError(500, "Upload folder is required.");
  }

  const uploadDir = path.join(config.uploadDestination, folder);
  await fs.mkdir(uploadDir, {
    recursive: true,
  });

  const extension = getExtension(file.originalname);
  const filename = `${crypto.randomUUID()}.${extension}`;
  const absolutePath = path.join(uploadDir, filename);
  await fs.writeFile(absolutePath, file.buffer);
  const relativePath = path
    .join(config.uploadDestination, folder, filename)
    .replace(/\\/g, "/");

  return {
    storage: STORAGE_PROVIDERS.LOCAL,
    path: relativePath,
    url: `${config.uploadBaseUrl}/${relativePath}`.replace(/\\/g, "/"),
    publicId: null,
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
};


// Delete
const remove = async (file) => {
  if (!file?.path) {
    return;
  }

  const absolutePath = path.join(process.cwd(), file.path);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
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
