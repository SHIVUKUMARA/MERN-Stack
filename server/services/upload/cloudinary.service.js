const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");
const crypto = require("crypto");
const mime = require("mime-types");
const config = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { STORAGE_PROVIDERS, getExtension } = require("../../utils/file");

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

// Generate Direct Upload Signature
// const createUploadSignature = (options = {}) => {
//   const { folder } = options;

//   if (!folder) {
//     throw new ApiError(400, "Upload folder is required.");
//   }

//   const timestamp = Math.floor(Date.now() / 1000);

//   const params = {
//     timestamp,
//     folder,
//     public_id: crypto.randomUUID(),
//     overwrite: false,
//     unique_filename: false,
//     use_filename: false,
//   };

//   const signature = cloudinary.utils.api_sign_request(
//     params,
//     config.cloudinaryApiSecret,
//   );

//   return {
//     cloudName: config.cloudinaryCloudName,
//     apiKey: config.cloudinaryApiKey,
//     timestamp,
//     signature,
//     folder,
//     publicId: params.public_id,
//     resourceType: "auto",
//     uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/auto/upload`,
//     uploadParams: {
//       ...params,
//     },
//   };
// };
const createUploadSignature = (options = {}) => {
  const { folder, userId, field } = options;

  if (!folder || !userId || !field) {
    throw new ApiError(400, "Upload details are required.");
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    timestamp,
    folder,
    public_id: crypto.randomUUID(),
    overwrite: false,
    unique_filename: false,
    use_filename: false,
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    config.cloudinaryApiSecret,
  );

  const completionToken = createCompletionToken({
    userId,
    field,
    publicId: params.public_id,
    folder,
  });

  return {
    cloudName: config.cloudinaryCloudName,
    apiKey: config.cloudinaryApiKey,
    timestamp,
    signature,
    folder,
    publicId: params.public_id,
    resourceType: "auto",
    completionToken,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/auto/upload`,
    uploadParams: { ...params },
  };
};

// Upload
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

// Delete
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

// Create a short-lived token binding the upload to its owner and field.
const createCompletionToken = ({ userId, field, publicId, folder }) => {
  const payload = Buffer.from(
    JSON.stringify({
      userId: String(userId),
      field,
      publicId,
      folder,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", config.cloudinaryApiSecret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

// Verify the completion token.
const verifyCompletionToken = (token, userId, field) => {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Invalid upload token.");
  }

  const [payload, receivedSignature] = token.split(".");

  if (!payload || !receivedSignature) {
    throw new ApiError(400, "Invalid upload token.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", config.cloudinaryApiSecret)
    .update(payload)
    .digest("base64url");

  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    throw new ApiError(401, "Invalid upload token.");
  }

  let data;

  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    throw new ApiError(400, "Invalid upload token.");
  }

  if (
    data.userId !== String(userId) ||
    data.field !== field ||
    data.expiresAt < Date.now()
  ) {
    throw new ApiError(401, "Upload token is invalid or expired.");
  }

  return data;
};

// Verify uploaded asset using Cloudinary.

const verifyDirectUpload = async ({ token, userId, field, resourceType }) => {
  // 1. Verify the signed completion token.
  const uploadData = verifyCompletionToken(token, userId, field);

  if (!["image", "video", "raw"].includes(resourceType)) {
    throw new ApiError(400, "Invalid Cloudinary resource type.");
  }

  // 2. Construct the complete Cloudinary public ID.
  // Cloudinary stores the folder as part of public_id.
  const expectedPublicId = `${uploadData.folder}/${uploadData.publicId}`;

  // 3. Fetch the actual asset from Cloudinary.
  let result;

  try {
    result = await cloudinary.api.resource(expectedPublicId, {
      resource_type: resourceType,
      type: "upload",
    });
  } catch (error) {
    console.error("Cloudinary asset verification failed:", {
      message: error.message,
      http_code: error.http_code,
      publicId: expectedPublicId,
      resourceType,
    });

    throw new ApiError(
      400,
      "Uploaded file could not be verified on Cloudinary.",
    );
  }

  // 4. Verify the returned asset identity.
  if (result.public_id !== expectedPublicId) {
    throw new ApiError(403, "Uploaded file does not match the issued upload.");
  }

  // 5. Derive MIME type from Cloudinary's verified resource type and format.
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    zip: "application/zip",
  };

  const extension = (result.format || "").toLowerCase();

  const mimeType =
    mimeTypes[extension] ||
    (result.resource_type === "image"
      ? `image/${extension}`
      : result.resource_type === "video"
        ? `video/${extension}`
        : "application/octet-stream");

  // 6. Construct metadata using verified Cloudinary information.
  const filename = result.public_id.split("/").pop();

  return {
    storage: STORAGE_PROVIDERS.CLOUDINARY,
    path: null,
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    filename: extension ? `${filename}.${extension}` : filename,
    originalName: extension ? `${filename}.${extension}` : filename,
    mimeType,
    extension,
    size: result.bytes,
    width: result.width ?? null,
    height: result.height ?? null,
    isOptimized: false,
    thumbnail: null,
    uploadedAt: result.created_at ? new Date(result.created_at) : new Date(),
  };
};

module.exports = {
  upload,
  delete: remove,
  replace,
  uploadMany,
  deleteMany,
  replaceMany,
  createUploadSignature,
  verifyDirectUpload,
};
