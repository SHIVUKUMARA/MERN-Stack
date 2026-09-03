const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware");
const authController = require("../../controllers/auth.controller");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../../validators/auth.validator");
const {
  loginRateLimit,
  refreshTokenRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
} = require("../../middleware/rateLimit");
const validate = require("../../validators/validate.middleware");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
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
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 50
 *                 example: Password@123
 *               role:
 *                 type: string
 *                 enum:
 *                   - admin
 *                   - staff
 *                   - student
 *                 example: student
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login a user
 *     description: |
 *       Authenticates a user and returns an access token.
 *       A refresh token is stored in an HttpOnly cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 50
 *                 example: Password@123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               statusCode: 200
 *               message: Login Successful
 *               data:
 *                 user: {}
 *                 accessToken: your-jwt-access-token
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Invalid email or password
 */
router.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  authController.login,
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: |
 *       Uses the refresh token stored in the HttpOnly cookie to generate
 *       a new access token. A new refresh token is also stored in the
 *       HttpOnly cookie.
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               statusCode: 200
 *               message: Access Token refreshed successfully
 *               data:
 *                 accessToken: your-new-jwt-access-token
 *       401:
 *         description: Invalid, expired, or missing refresh token
 */
router.post(
  "/refresh-token",
  refreshTokenRateLimit,
  authController.refreshToken,
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout the authenticated user
 *     description: Logs out the authenticated user and clears the refresh token cookie.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               statusCode: 200
 *               message: Logout Successful
 *               data: null
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Account is inactive or deleted
 */
router.post("/logout", protect, authController.logout);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request a password reset
 *     description: Sends a password reset email for the provided email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Password reset email processed successfully
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               statusCode: 200
 *               message: Email sent successfully
 *               data: null
 *       400:
 *         description: Invalid request data
 */
router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset user password
 *     description: Resets a user's password using a valid password reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 64
 *                 maxLength: 64
 *                 description: Password reset token.
 *                 example: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 50
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             example:
 *               status: true
 *               statusCode: 200
 *               message: Password reset Successfully
 *               data: null
 *       400:
 *         description: Invalid or expired reset token
 */
router.post(
  "/reset-password",
  resetPasswordRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

module.exports = router;
