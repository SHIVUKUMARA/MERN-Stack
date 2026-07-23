const express = require("express");
const router = express.Router();

/* once request from app.js file sent to this index.js file --->>> Now Express checks the URL.
The requested URL is: /api/v1/auth
It asks: Is it /health? -----   No.
Next:
Does it start with /api/v1? -----   Yes.
So Express removes the matching prefix: /api/v1 ---- Now it forwards the remaining part to: routes/v1/index.js
*/

// Health Check
router.use("/health", require("./health.routes"));

// Version 1
router.use("/api/v1", require("./v1"));

module.exports = router;
