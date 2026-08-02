require("dotenv").config({ quiet: true }); //{ quiet: true } - to hide .env to print message to the terminal
const ms = require("ms");

module.exports = {
  nodeEnv: process.env.NODE_ENV,
  mongoUrl: process.env.MONGO_URI,
  port: process.env.PORT,

  // Access or authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  clientUrl: process.env.CLIENT_URL,

  // Email
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM,

  // Rate limiting
  rateLimitWindow: ms(process.env.RATE_LIMIT_WINDOW),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS),

  authRateLimitWindow: ms(process.env.AUTH_RATE_LIMIT_WINDOW),
  authRateLimitMaxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS),

  // File Storage
  fileStorage: process.env.FILE_STORAGE,
  uploadBaseUrl: process.env.UPLOAD_BASE_URL,
  uploadDestination: process.env.UPLOAD_DESTINATION,

  // cloudinary storage
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // AWS S3 storage
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  awsBucket: process.env.AWS_BUCKET,

  //Azure Blob storage
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER,

  // Google Cloud Storage
  gcsProjectId: process.env.GCS_PROJECT_ID,
  gcsBucket: process.env.GCS_BUCKET,
  gcsKeyFilename: process.env.GCS_KEY_FILENAME,
};
