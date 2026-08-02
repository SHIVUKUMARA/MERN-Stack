const STORAGE_PROVIDERS = {
  LOCAL: "local",
  CLOUDINARY: "cloudinary",
  S3: "s3",
  AZURE: "azure",
  GCS: "gcs",
};

const MIME_TYPES = {
  IMAGES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ],

  DOCUMENTS: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],

  VIDEOS: [
    "video/mp4",
    "video/x-msvideo",
    "video/x-matroska",
    "video/quicktime",
    "video/mpeg",
  ],

  AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg"],
};

const EXTENSIONS = {
  IMAGES: ["jpg", "jpeg", "png", "webp", "gif", "svg"],

  DOCUMENTS: ["pdf", "doc", "docx", "xls", "xlsx", "txt"],

  VIDEOS: ["mp4", "mov", "avi", "mkv", "mpeg"],

  AUDIO: ["mp3", "wav", "ogg"],
};

const FILE_SIZE = {
  IMAGE: 2 * 1024 * 1024,
  DOCUMENT: 10 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
  AUDIO: 20 * 1024 * 1024,
};

const FILE_TYPES = {
  IMAGE: {
    mimeTypes: MIME_TYPES.IMAGES,
    extensions: EXTENSIONS.IMAGES,
    maxFileSize: FILE_SIZE.IMAGE,
  },

  DOCUMENT: {
    mimeTypes: MIME_TYPES.DOCUMENTS,
    extensions: EXTENSIONS.DOCUMENTS,
    maxFileSize: FILE_SIZE.DOCUMENT,
  },

  VIDEO: {
    mimeTypes: MIME_TYPES.VIDEOS,
    extensions: EXTENSIONS.VIDEOS,
    maxFileSize: FILE_SIZE.VIDEO,
  },

  AUDIO: {
    mimeTypes: MIME_TYPES.AUDIO,
    extensions: EXTENSIONS.AUDIO,
    maxFileSize: FILE_SIZE.AUDIO,
  },
};

const UPLOAD_FOLDERS = {
  USERS: {
    AVATAR: "users/avatar",
    GALLERY: "users/gallery",
    DOCUMENTS: "users/documents",
    VIDEOS: "users/videos",
  },

  STUDENTS: {
    AVATAR: "students/avatar",
    RESUME: "students/resume",
    CERTIFICATES: "students/certificates",
  },

  STAFF: {
    AVATAR: "staff/avatar",
    DOCUMENTS: "staff/documents",
  },

  PRODUCTS: {
    IMAGES: "products/images",
  },

  COMPANIES: {
    LOGO: "companies/logo",
  },
};

const getExtension = (filename) => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024) {
    return `${bytes / (1024 * 1024)} MB`;
  }

  if (bytes >= 1024) {
    return `${bytes / 1024} KB`;
  }

  return `${bytes} Bytes`;
};

module.exports = {
  STORAGE_PROVIDERS,
  MIME_TYPES,
  EXTENSIONS,
  FILE_SIZE,
  FILE_TYPES,
  UPLOAD_FOLDERS,
  getExtension,
  formatFileSize,
};
