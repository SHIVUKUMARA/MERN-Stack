const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const router = express.Router();

/* 
Now Express receives: /auth 
It asks: Does it match /auth? -----  Yes.
Again, Express removes that part. --- Now it forwards the request to: auth.routes.js
*/

/* 
Why Does Express Remove the URL? ---- This is the part that confuses almost everyone initially.
Suppose we have: app.use("/api/v1", router);
And the request is: /api/v1/auth/login
Express says: "I've already matched /api/v1, so I'll remove it before passing the request to router."
The router now only sees: /auth/login
If inside that router you have: router.use("/auth", authRouter); then Express removes /auth as well.
Now authRouter sees: /login
Finally: router.post("/login", ...) -- matches the remaining path.
This Is Called Nested Routing -- Instead of writing everything in one file, we organize routes into modules
*/

// Authentication Routtes
router.use("/auth", require("./auth.routes"));

// User Routes
router.use("/users", require("./user.routes"));
module.exports = router;
