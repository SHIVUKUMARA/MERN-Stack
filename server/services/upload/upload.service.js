const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS } = require("../../utils/file");

const processors = require("./processors");

const localService = require("./local.service");
const cloudinaryService = require("./cloudinary.service");
// const awsService = require("./aws.service");
// const azureService = require("./azure.service");
// const gcsService = require("./gcs.service");

const providers = {
  [STORAGE_PROVIDERS.LOCAL]: localService,
  [STORAGE_PROVIDERS.CLOUDINARY]: cloudinaryService,
  // [STORAGE_PROVIDERS.S3]: awsService,
  // [STORAGE_PROVIDERS.AZURE]: azureService,
  // [STORAGE_PROVIDERS.GCS]: gcsService,
};

const getProvider = () => {
  const provider = providers[config.fileStorage];

  if (!provider) {
    throw new ApiError(
      500,
      `Unsupported file storage provider: ${config.fileStorage}`,
    );
  }

  return provider;
};


// Upload
const upload = async (file, options = {}) => {
  const provider = getProvider();

  // Process file
  const processed = await processors.process(file, options);

  // Upload original file
  const uploaded = await provider.upload(processed.original, options);

  // Upload thumbnail if available
  if (processed.thumbnail) {
    uploaded.thumbnail = await provider.upload(processed.thumbnail, {
      ...options,
      folder: `${options.folder}/thumbnails`,
      skipProcessing: true,
    });
  }

  // Merge processor metadata (video/document/image/etc.)
  if (processed.metadata) {
    Object.assign(uploaded, processed.metadata);
  }

  return uploaded;
};


// Upload Many
const uploadMany = async (files = [], options = {}) => {
  return Promise.all(files.map((file) => upload(file, options)));
};


// Delete
const remove = async (file) => {
  if (!file) {
    return;
  }

  const provider = getProvider();
  await provider.delete(file);
  if (file.thumbnail) {
    await provider.delete(file.thumbnail);
  }
};


// Delete Many
const deleteMany = async (files = []) => {
  await Promise.all(files.map(remove));
};


// Replace
const replace = async (oldFile, newFile, options = {}) => {
  const uploaded = await upload(newFile, options);

  if (oldFile) {
    await remove(oldFile);
  }
  return uploaded;
};


// Replace Many
const replaceMany = async (oldFiles = [], newFiles = [], options = {}) => {
  const uploadedFiles = await uploadMany(newFiles, options);

  if (oldFiles.length) {
    await deleteMany(oldFiles);
  }
  return uploadedFiles;
};

module.exports = {
  upload,
  uploadMany,
  delete: remove,
  deleteMany,
  replace,
  replaceMany,
};
