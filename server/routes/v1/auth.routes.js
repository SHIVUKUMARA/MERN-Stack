const express = require("express");
const router = express.Router();

/* 
Remember the remaining URL? --- '/'
So Express checks: GET '/'
Does it exist? ---  Yes.
It executes: the below method
*/

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Authentication routes are working successfully",
  });
});

module.exports = router;
