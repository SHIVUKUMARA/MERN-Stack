const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

const test = asyncHandler(async (req, res) => {
  return res.status(200).json(
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
