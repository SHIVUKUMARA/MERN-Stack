// const multer = require("../config/multer");
// const ApiError = require("../utils/ApiError");
// const { getExtension, formatFileSize } = require("../utils/file");

// const uploadMiddleware = (config) => {
//   const {
//     type = "single",
//     field,
//     fields = [],
//     maxFiles = 1,
//     fileType,
//     // maxFileSize,
//     required = false,
//   } = config;

//   let middleware;

//   switch (type) {
//     case "single":
//       if (!field) {
//         throw new ApiError(500, "Upload field is required.");
//       }

//       middleware = multer.single(field);
//       break;

//     case "array":
//       if (!field) {
//         throw new ApiError(500, "Upload field is required.");
//       }

//       middleware = multer.array(field, maxFiles);
//       break;

//     case "fields":
//       if (!fields.length) {
//         throw new ApiError(500, "Upload fields are required.");
//       }

//       middleware = multer.fields(
//         fields.map((item) => ({
//           name: item.field,
//           maxCount: item.maxFiles || 1,
//         })),
//       );

//       break;

//     default:
//       throw new ApiError(500, `Unsupported upload type: ${type}`);
//   }

//   return (req, res, next) => {
//     middleware(req, res, (error) => {
//       if (error) {
//         return next(error);
//       }

//       try {
//         // ---------- SINGLE ----------
//         if (type === "single") {
//           if (!req.file) {
//             if (required) {
//               throw new ApiError(400, `${field} is required.`);
//             }

//             return next();
//           }

//           validateFile(req.file, {
//             fileType,
//             // maxFileSize,
//           });

//           return next();
//         }

//         // ---------- ARRAY ----------
//         if (type === "array") {
//           const uploadedFiles = req.files || [];

//           if (!uploadedFiles.length) {
//             if (required) {
//               throw new ApiError(400, `${field} is required.`);
//             }

//             return next();
//           }

//           uploadedFiles.forEach((file) =>
//             validateFile(file, {
//               fileType,
//               // maxFileSize,
//             }),
//           );

//           return next();
//         }

//         // ---------- FIELDS ----------
//         if (type === "fields") {
//           for (const item of fields) {
//             const uploadedFiles = req.files?.[item.field] || [];

//             if (!uploadedFiles.length) {
//               if (item.required) {
//                 throw new ApiError(400, `${item.field} file is required.`);
//               }

//               continue;
//             }

//             uploadedFiles.forEach((file) =>
//               validateFile(file, {
//                 fileType: item.fileType,
//                 // maxFileSize: item.maxFileSize,
//               }),
//             );
//           }

//           return next();
//         }

//         next();
//       } catch (err) {
//         next(err);
//       }
//     });
//   };
// };

// const validateFile = (file, options) => {
//   const { fileType } = options;

//   if (!fileType) {
//     return;
//   }

//   const extension = getExtension(file.originalname);

//   const { mimeTypes = [], extensions = [], maxFileSize } = fileType;

//   if (extensions.length && !extensions.includes(extension)) {
//     throw new ApiError(400, `.${extension} files are not allowed.`);
//   }

//   if (mimeTypes.length && !mimeTypes.includes(file.mimetype)) {
//     throw new ApiError(400, `${file.mimetype} files are not allowed.`);
//   }

//   if (maxFileSize && file.size > maxFileSize) {
//     throw new ApiError(
//       400,
//       `Maximum file size is ${formatFileSize(maxFileSize)}.`,
//     );
//   }
// };

// module.exports = uploadMiddleware;


const fs = require("fs/promises");
const createUpload = require("../config/multer");
const ApiError = require("../utils/ApiError");
const { getExtension, formatFileSize } = require("../utils/file");

const removeUploadedFiles = async (req) => {
  const files = [
    ...(req.file ? [req.file] : []),
    ...(req.files
      ? Array.isArray(req.files)
        ? req.files
        : Object.values(req.files).flat()
      : []),
  ];

  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
};

const getFileType = (file, config) => {
  if (config.type === "fields") {
    return config.fields.find((item) => item.field === file.fieldname)
      ?.fileType;
  }

  return config.fileType;
};

const validateFileType = (file, fileType) => {
  if (!fileType) return;

  const extension = getExtension(file.originalname);
  const { mimeTypes = [], extensions = [] } = fileType;

  if (extensions.length && !extensions.includes(extension)) {
    throw new ApiError(400, `.${extension} files are not allowed.`);
  }

  if (mimeTypes.length && !mimeTypes.includes(file.mimetype)) {
    throw new ApiError(400, `${file.mimetype} files are not allowed.`);
  }
};

const getMaxFileSize = (config) => {
  if (config.type === "fields") {
    const limits = config.fields.map((item) => item.fileType?.maxFileSize || 0);

    return Math.max(0, ...limits) || 100 * 1024 * 1024;
  }

  return config.fileType?.maxFileSize || 100 * 1024 * 1024;
};

const uploadMiddleware = (config) => {
  const {
    type = "single",
    field,
    fields = [],
    maxFiles = 1,
    required = false,
  } = config;

  if (type === "single" || type === "array") {
    if (!field) {
      throw new ApiError(500, "Upload field is required.");
    }
  } else if (type === "fields") {
    if (!fields.length) {
      throw new ApiError(500, "Upload fields are required.");
    }
  } else {
    throw new ApiError(500, `Unsupported upload type: ${type}`);
  }

  const fileFilter = (req, file, cb) => {
    try {
      const fileType = getFileType(file, config);
      validateFileType(file, fileType);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  };

  const upload = createUpload({
    limits: {
      fileSize: getMaxFileSize(config),
    },
    fileFilter,
  });

  let middleware;

  switch (type) {
    case "single":
      middleware = upload.single(field);
      break;

    case "array":
      middleware = upload.array(field, maxFiles);
      break;

    case "fields":
      middleware = upload.fields(
        fields.map((item) => ({
          name: item.field,
          maxCount: item.maxFiles || 1,
        })),
      );
      break;
  }

  return (req, res, next) => {
    middleware(req, res, async (error) => {
      if (error) {
        await removeUploadedFiles(req);

        if (error.code === "LIMIT_FILE_SIZE") {
          const maxSize = getMaxFileSize(config);

          return next(
            new ApiError(
              400,
              `Maximum file size is ${formatFileSize(maxSize)}.`,
            ),
          );
        }

        return next(error);
      }

      try {
        const files = [
          ...(req.file ? [req.file] : []),
          ...(req.files
            ? Array.isArray(req.files)
              ? req.files
              : Object.values(req.files).flat()
            : []),
        ];

        if (required && files.length === 0) {
          throw new ApiError(400, "File is required.");
        }

        // Enforce individual limits for fields with different file types.
        for (const file of files) {
          const fileType = getFileType(file, config);
          const maxFileSize = fileType?.maxFileSize;

          if (maxFileSize && file.size > maxFileSize) {
            throw new ApiError(
              400,
              `Maximum file size is ${formatFileSize(maxFileSize)}.`,
            );
          }
        }

        next();
      } catch (validationError) {
        await removeUploadedFiles(req);
        next(validationError);
      }
    });
  };
};

module.exports = uploadMiddleware;
