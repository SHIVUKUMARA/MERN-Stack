const mongoose = require("mongoose");
const ApiError = require("./ApiError");

const validObjectId = (id, resource = "Resource") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${resource} ID`);
  }
};

module.exports = validObjectId;
