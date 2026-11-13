// const multer = require("multer");
// const storage = multer.memoryStorage();

// const upload = multer({
//   storage,
// });

// module.exports = upload;

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const uploadDirectory = path.join(process.cwd(), "uploads", "tmp");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const createUpload = ({ limits, fileFilter } = {}) => {
  return multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024,
      ...limits,
    },
    fileFilter,
  });
};

module.exports = createUpload;
