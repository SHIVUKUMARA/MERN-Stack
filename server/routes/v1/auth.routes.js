const express = require("express");
const router = express.Router();

// const asyncHandler = require("../../utils/asyncHandler");
// const ApiError = require("../../utils/ApiError");
// const ApiResponse = require("../../utils/ApiResponse");
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

/* 
Remember the remaining URL? --- '/'
So Express checks: GET '/'
Does it exist? ---  Yes.
It executes: the below method
*/

// router.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Authentication routes are working successfully",
//   });
// });

// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     res.status(200).json(
//       new ApiResponse(
//         200,
//         {
//           name: "VisionVyas",
//         },
//         "Authentication routes are working successfully",
//       ),
//     );
//   }),
// );

// router.get(
//   "/error",
//   asyncHandler(async (req, res) => {
//     throw new ApiError(400, "Custom Error Example");
//   }),
// );

// router.get("/", authController.test);
// router.get("/error", authController.testError);

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
