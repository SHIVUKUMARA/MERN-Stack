const ms = require("ms");
const asyncHandler = require("../utils/asyncHandler");
// const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const authService = require("../services/auth.service");
const config = require("../config/env");

/* const test = asyncHandler(async (req, res) => {
  return res.status
  (200).json(
    new ApiResponse(
      200,
      {
        name: "VisionVyas",
      },
      "Authentication Controller is working successfully",
    ),
  );
});

const testError = asyncHandler(async (req, res) => {
  throw new ApiError(400, "Custom Error from Controller");
});

module.exports = { test, testError };
 */

const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User registered successfully"));
});

const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(
    req.body,
  );

  res.cookie("refreshToken", refreshToken, {
    //This protects the refresh token from many XSS attacks.If: httpOnly: false, JavaScript can read it.
    httpOnly: true,
    // secure: config.nodeEnv === "production", in Development--- http://localhost:5000, If: "secure: true" the browser will not send the cookie because the connection isn't HTTPS.So during development: "secure: false",In production--- https://api.example.com, Now: "secure: true" This tells the browser: Only send this cookie over HTTPS.
    secure: config.nodeEnv == "production",
    // It controls when the browser is allowed to send the cookie. if "strict"- only same site request, if "lax" - any request, if "none" - always send cookies across the site
    sameSite: "lax",
    maxAge: ms(config.jwtRefreshExpiresIn),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, "Login Successful"));
});

const refreshToken = asyncHandler(async (req, res) => {
  const cookieRefreshToken = req.cookies.refreshToken;

  const { accessToken, refreshToken: newRefreshToken } =
    await authService.refreshAccessToken(cookieRefreshToken);

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    maxAge: ms(config.jwtRefreshExpiresIn),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Access Token refreshed successfully",
      ),
    );
});

const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  });

  return res.status(200).json(new ApiResponse(200, null, "Logout Successful"));
});

module.exports = { register, login, refreshToken, logout };
