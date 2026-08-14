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

router.post("/register", validate(registerSchema), authController.register);

router.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  authController.login,
);

router.post(
  "/refresh-token",
  refreshTokenRateLimit,
  authController.refreshToken,
);

router.post("/logout", protect, authController.logout);

router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  resetPasswordRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

module.exports = router;
