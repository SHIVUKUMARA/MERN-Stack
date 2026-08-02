const multer = require("../config/multer");
const ApiError = require("../utils/ApiError");
const { FILE_TYPES, getExtension, formatFileSize } = require("../utils/file");

const uploadMiddleware = (config) => {
  const {
    type = "single",
    field,
    fields = [],
    maxFiles = 1,
    fileType,
    maxFileSize,
    required = false,
  } = config;

  let middleware;

  switch (type) {
    case "single":
      if (!field) {
        throw new ApiError(500, "Upload field is required.");
      }

      middleware = multer.single(field);
      break;

    case "array":
      if (!field) {
        throw new ApiError(500, "Upload field is required.");
      }

      middleware = multer.array(field, maxFiles);
      break;

    case "fields":
      if (!fields.length) {
        throw new ApiError(500, "Upload fields are required.");
      }

      middleware = multer.fields(
        fields.map((item) => ({
          name: item.field,
          maxCount: item.maxFiles || 1,
        })),
      );

      break;

    default:
      throw new ApiError(500, `Unsupported upload type: ${type}`);
  }

  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (error) {
        return next(error);
      }

      try {
        // ---------- SINGLE ----------
        if (type === "single") {
          if (!req.file) {
            if (required) {
              throw new ApiError(400, `${field} is required.`);
            }

            return next();
          }

          validateFile(req.file, {
            fileType,
            // maxFileSize,
          });

          return next();
        }

        // ---------- ARRAY ----------
        if (type === "array") {
          const uploadedFiles = req.files || [];

          if (!uploadedFiles.length) {
            if (required) {
              throw new ApiError(400, `${field} is required.`);
            }

            return next();
          }

          uploadedFiles.forEach((file) =>
            validateFile(file, {
              fileType,
              // maxFileSize,
            }),
          );

          return next();
        }

        // ---------- FIELDS ----------
        if (type === "fields") {
          for (const item of fields) {
            const uploadedFiles = req.files?.[item.field] || [];

            if (!uploadedFiles.length) {
              if (item.required) {
                throw new ApiError(400, `${item.field} file is required.`);
              }

              continue;
            }

            uploadedFiles.forEach((file) =>
              validateFile(file, {
                fileType: item.fileType,
                // maxFileSize: item.maxFileSize,
              }),
            );
          }

          return next();
        }

        next();
      } catch (err) {
        next(err);
      }
    });
  };
};

const validateFile = (file, options) => {
  const { fileType } = options;

  if (!fileType) {
    return;
  }

  const extension = getExtension(file.originalname);

  const { mimeTypes = [], extensions = [], maxFileSize } = fileType;

  if (extensions.length && !extensions.includes(extension)) {
    throw new ApiError(400, `.${extension} files are not allowed.`);
  }

  if (mimeTypes.length && !mimeTypes.includes(file.mimetype)) {
    throw new ApiError(400, `${file.mimetype} files are not allowed.`);
  }

  if (maxFileSize && file.size > maxFileSize) {
    throw new ApiError(
      400,
      `Maximum file size is ${formatFileSize(maxFileSize)}.`,
    );
  }
};

module.exports = uploadMiddleware;
