const express = require("express");
const { client } = require("../config/metrics");

const router = express.Router();

router.get("/", async (req, res) => {
  res.set("Content-Type", client.register.contentType);

  const metrics = await client.register.metrics();

  res.end(metrics);
});

module.exports = router;
