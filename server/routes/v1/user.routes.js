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
/**
 * @swagger
 * /users/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get logged-in user profile
 *     description: Returns the profile of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: User account is inactive or deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/profile",
  protect,
  getUserByIdRateLimit,
  userController.getProfile,
);

// Get all users with or without pagination and filters
/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: >
 *       Returns users with pagination, searching, filtering, sorting,
 *       field selection, and population support.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *
 *       - in: query
 *         name: page
 *         description: Page number.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         description: Number of users per page. Maximum is 100.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *
 *       - in: query
 *         name: search
 *         description: Search users by first name, last name, or email.
 *         schema:
 *           type: string
 *         example: john
 *
 *       - in: query
 *         name: sort
 *         description: Comma-separated fields used for sorting. Prefix a field with - for descending order.
 *         schema:
 *           type: string
 *           default: -createdAt
 *         example: -createdAt
 *
 *       - in: query
 *         name: fields
 *         description: Comma-separated list of fields to include in the response.
 *         schema:
 *           type: string
 *         example: firstName,lastName,email,role
 *
 *       - in: query
 *         name: populate
 *         description: Comma-separated Mongoose relationship paths to populate.
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: firstName
 *         description: Filter users by first name.
 *         schema:
 *           type: string
 *         example: John
 *
 *       - in: query
 *         name: lastName
 *         description: Filter users by last name.
 *         schema:
 *           type: string
 *         example: Doe
 *
 *       - in: query
 *         name: email
 *         description: Filter users by email.
 *         schema:
 *           type: string
 *           format: email
 *         example: john@example.com
 *
 *       - in: query
 *         name: role
 *         description: Filter users by role.
 *         schema:
 *           type: string
 *           enum:
 *             - admin
 *             - staff
 *             - student
 *         example: staff
 *
 *       - in: query
 *         name: isActive
 *         description: Filter users by account status.
 *         schema:
 *           type: boolean
 *         example: true
 *
 *       - in: query
 *         name: createdAt
 *         description: Filter users by exact creation date.
 *         schema:
 *           type: string
 *           format: date-time
 *
 *       - in: query
 *         name: updatedAt
 *         description: Filter users by exact update date.
 *         schema:
 *           type: string
 *           format: date-time
 *
 *       - in: query
 *         name: createdAt[gte]
 *         description: Filter users created on or after the specified date.
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-01-01
 *
 *       - in: query
 *         name: createdAt[lte]
 *         description: Filter users created on or before the specified date.
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-12-31
 *
 *       - in: query
 *         name: updatedAt[gte]
 *         description: Filter users updated on or after the specified date.
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-01-01
 *
 *       - in: query
 *         name: updatedAt[lte]
 *         description: Filter users updated on or before the specified date.
 *         schema:
 *           type: string
 *           format: date
 *         example: 2026-12-31
 *
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", protect, getUsersRateLimit, userController.getUsers);

// update logged in user details
/**
 * @swagger
 * /users/profile:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update logged-in user profile
 *     description: Updates the first name, last name, or email of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/profile",
  protect,
  getUserByIdRateLimit,
  validate(updateProfileSchema),
  userController.updateProfile,
);

// Upload / Replace Avatar
/**
 * @swagger
 * /users/profile/avatar:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Upload or replace profile avatar
 *     description: Uploads a new avatar or replaces the existing avatar.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or missing file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
/**
 * @swagger
 * /users/profile/avatar:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete profile avatar
 *     description: Deletes the avatar of the currently authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Avatar not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/profile/avatar",
  protect,
  getUserByIdRateLimit,
  userController.deleteAvatar,
);

// Upload Multiple Images
/**
 * @swagger
 * /users/profile/gallery:
 *   post:
 *     tags:
 *       - Users
 *     summary: Upload gallery images
 *     description: Uploads multiple images to the logged-in user's gallery. Maximum 10 files.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - gallery
 *             properties:
 *               gallery:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Gallery uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or missing files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
/**
 * @swagger
 * /users/profile/gallery/{fileId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete gallery image
 *     description: Deletes one image from the logged-in user's gallery.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: MongoDB ID of the gallery file.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Gallery image deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/profile/gallery/:fileId",
  protect,
  userController.deleteGallery,
);

// Upload Multiple Documents
/**
 * @swagger
 * /users/profile/documents:
 *   post:
 *     tags:
 *       - Users
 *     summary: Upload documents
 *     description: Uploads multiple documents for the logged-in user. Maximum 20 files.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 maxItems: 20
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or missing files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
/**
 * @swagger
 * /users/profile/documents/{fileId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete document
 *     description: Deletes one document belonging to the logged-in user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: MongoDB ID of the document.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  "/profile/documents/:fileId",
  protect,
  userController.deleteDocument,
);

// Upload Multiple Videos
/**
 * @swagger
 * /users/profile/videos:
 *   post:
 *     tags:
 *       - Users
 *     summary: Upload videos
 *     description: Uploads multiple videos for the logged-in user. Maximum 5 files.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - videos
 *             properties:
 *               videos:
 *                 type: array
 *                 maxItems: 5
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Videos uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or missing files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
/**
 * @swagger
 * /users/profile/videos/{fileId}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete video
 *     description: Deletes one video belonging to the logged-in user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: MongoDB ID of the video.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/profile/videos/:fileId", protect, userController.deleteVideo);

// Change logged in users current password
/**
 * @swagger
 * /users/change-password:
 *   post:
 *     tags:
 *       - Users
 *     summary: Change logged-in user's password
 *     description: Changes the password of the currently authenticated user and revokes the refresh token.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 50
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  userController.changePassword,
);

// Get user by id
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Returns a user using the provided MongoDB user ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB user ID.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", protect, userController.getUserById);

// Update user by id
/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user by ID
 *     description: Updates the first name, last name, email, or role of a user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB user ID.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               role:
 *                 type: string
 *                 enum:
 *                   - admin
 *                   - staff
 *                   - student
 *                 example: staff
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id",
  protect,
  validate(updateUserSchema),
  userController.updateUser,
);

// soft delete user
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Soft delete user
 *     description: Soft deletes a user by marking the account as deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB user ID.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", protect, userController.deleteUser);

// restore soft deleted user
/**
 * @swagger
 * /users/{id}/restore:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Restore soft-deleted user
 *     description: Restores a previously soft-deleted user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB user ID.
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: User restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Deleted user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/restore", protect, userController.restoreUser);

module.exports = router;
