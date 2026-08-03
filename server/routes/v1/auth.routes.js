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
const { authRateLimit } = require("../../middleware/rateLimit");
const validate = require("../../validators/validate.middleware");

router.post(
  "/register",
  authRateLimit,
  validate(registerSchema),
  authController.register,
);

router.post(
  "/login",
  authRateLimit,
  validate(loginSchema),
  authController.login,
);

router.post("/refresh-token", authController.refreshToken);

router.post("/logout", protect, authController.logout);

router.post(
  "/forgot-password",
  authRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  authRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

module.exports = router;
