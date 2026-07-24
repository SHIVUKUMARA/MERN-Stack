const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/auth.middleware");
const userController = require("../../controllers/user.controller");

router.get("/profile", protect, userController.getProfile);

module.exports = router;
