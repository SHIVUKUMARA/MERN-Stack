const express = require("express");
const router = express.Router();

const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");

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

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.status(200).json(
      new ApiResponse(
        200,
        {
          name: "VisionVyas",
        },
        "Authentication routes are working successfully",
      ),
    );
  }),
);

router.get(
  "/error",
  asyncHandler(async (req, res) => {
    throw new ApiError(400, "Custom Error Example");
  }),
);

module.exports = router;
