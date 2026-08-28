const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware");
const userController = require("../../controllers/user.controller");
const validate = require("../../validators/validate.middleware");
const {
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require("../../validators/profile.validator");
const {
  getUsersRateLimit,
  getUserByIdRateLimit,
} = require("../../middleware/rateLimit");
const uploadMiddleware = require("../../middleware/upload.middleware");
const {
  // MIME_TYPES,
  // EXTENSIONS,
  // FILE_SIZE,
  FILE_TYPES,
} = require("../../utils/file");

// Logged in user profile
router.get(
  "/profile",
  protect,
  getUserByIdRateLimit,
  userController.getProfile,
);

// Get all users with or without pagination and filters
router.get("/", protect, getUsersRateLimit, userController.getUsers);

// update logged in user details
router.patch(
  "/profile",
  protect,
  getUserByIdRateLimit,
  validate(updateProfileSchema),
  userController.updateProfile,
);

// Upload / Replace Avatar
router.patch(
  "/profile/avatar",
  protect,
  getUserByIdRateLimit,
  uploadMiddleware({
    type: "single",
    field: "avatar",
    fileType: FILE_TYPES.IMAGE,
    // maxFileSize: FILE_SIZE.image,
    required: true,
  }),
  userController.updateAvatar,
);

// Delete Avatar
router.delete(
  "/profile/avatar",
  protect,
  getUserByIdRateLimit,
  userController.deleteAvatar,
);

// Upload Multiple Images
router.post(
  "/profile/gallery",
  protect,
  uploadMiddleware({
    type: "array",
    field: "gallery",
    fileType: FILE_TYPES.IMAGE,
    maxFiles: 10,
    // maxFileSize: FILE_SIZE.image,
    required: true,
  }),
  userController.uploadGallery,
);

// Delete One Gallery Image
router.delete(
  "/profile/gallery/:fileId",
  protect,
  userController.deleteGallery,
);

// Upload Multiple Documents
router.post(
  "/profile/documents",
  protect,
  uploadMiddleware({
    type: "array",
    field: "documents",
    fileType: FILE_TYPES.DOCUMENT,
    maxFiles: 20,
    // maxFileSize: FILE_SIZE.document,
    required: true,
  }),
  userController.uploadDocuments,
);

// Delete One Document
router.delete(
  "/profile/documents/:fileId",
  protect,
  userController.deleteDocument,
);

// Upload Multiple Videos
router.post(
  "/profile/videos",
  protect,
  uploadMiddleware({
    type: "array",
    field: "videos",
    fileType: FILE_TYPES.VIDEO,
    maxFiles: 5,
    // maxFileSize: FILE_SIZE.video,
    required: true,
  }),
  userController.uploadVideos,
);

// Delete One Video
router.delete("/profile/videos/:fileId", protect, userController.deleteVideo);

// Change logged in users current password
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  userController.changePassword,
);

// Get user by id
router.get("/:id", protect, userController.getUserById);

// Update user by id
router.patch(
  "/:id",
  protect,
  validate(updateUserSchema),
  userController.updateUser,
);

// soft delete user
router.delete("/:id", protect, userController.deleteUser);

// restore soft deleted user
router.patch("/:id/restore", protect, userController.restoreUser);

module.exports = router;
