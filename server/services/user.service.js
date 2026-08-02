const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const validateObjectId = require("../utils/validateObjectId");
const uploadService = require("./upload");

const { QueryBuilder } = require("../core/query");
const { MongooseExecutor } = require("../core/query/executors");

// Get All Users with or without pagination
const getAllUsers = async (query) => {
  const queryConfig = new QueryBuilder(query, {
    searchableFields: ["firstName", "lastName", "email"],
    filterableFields: [
      "firstName",
      "lastName",
      "email",
      "role",
      "isActive",
      "createdAt",
      "updatedAt",
    ],
    defaultFilter: {
      isDeleted: false,
    },
    defaultFields: "-password -refreshToken -__v -isDeleted -passwordChangesAt",
  })
    .filter()
    .search()
    .sort()
    .select()
    .populate()
    .paginate()
    .build();
  const executor = new MongooseExecutor(User);

  return await executor.execute(queryConfig);
};

// Get Single user by ID
const getUserById = async (id) => {
  validateObjectId(id, "User");

  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  }).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

// Update the User details by id and loggedin user details also
const updateUser = async (id, payload) => {
  // validate onject ID
  validateObjectId(id, "User");

  // find user by id
  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // check for duplicate email
  if (payload.email && payload.email !== user.email) {
    const emailExists = await User.exists({
      email: payload.email,
      _id: { $ne: id },
    });

    if (emailExists) {
      throw new ApiError(409, "Email already exists");
    }
  }

  // update only provided fields
  Object.assign(user, payload);

  // save document
  await user.save();

  // return updated user
  return await User.findOne({
    _id: id,
    isDeleted: false,
  }).select("-password -refreshToken");
};

// Soft delete user by id
const deleteUser = async (id) => {
  validateObjectId(id, "User");

  const user = await User.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isDeleted = true;
  user.deletedAt = Date.now();
  user.refreshToken = null;

  await user.save();
  return null;
};

// Restore the soft deleted user
const restoreUser = async (id) => {
  validateObjectId(id, "User");

  const user = await User.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.isDeleted = false;
  user.deletedAt = null;

  await user.save();
  return await User.findById(id).select(
    "-password -refreshToken -isDeleted -deletedAt",
  );
};

// change logged in user password
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password +refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // before change password check the current entered password matches
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  // force logout and revoke the token
  user.refreshToken = null;

  await user.save();

  return;
};

const updateAvatar = async (userId, file) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!file) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = user.avatar
    ? await uploadService.replace(user.avatar, file, {
        field: "avatar",
        folder: "users/avatar",
      })
    : await uploadService.upload(file, {
        field: "avatar",
        folder: "users/avatar",
      });

  user.avatar = avatar;

  await user.save();

  return await User.findById(userId).select("-password -refreshToken");
};

const deleteAvatar = async (userId) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.avatar) {
    throw new ApiError(404, "Avatar not found");
  }

  await uploadService.delete(user.avatar);

  user.avatar = undefined;

  await user.save();

  return;
};

// Upload single file
const uploadSingleFile = async (userId, file, { field, folder }) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!file) {
    throw new ApiError(400, "File is required");
  }

  const uploadedFile = user[field]
    ? await uploadService.replace(user[field], file, {
        field,
        folder,
      })
    : await uploadService.upload(file, {
        field,
        folder,
      });

  user[field] = uploadedFile;

  await user.save();

  return await User.findById(userId).select("-password -refreshToken");
};

// Delete single file
const deleteSingleFile = async (userId, { field }) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user[field]) {
    throw new ApiError(404, "File not found");
  }

  await uploadService.delete(user[field]);

  user[field] = null;

  await user.save();
};

// Upload multiple files
const uploadMultipleFiles = async (userId, files, { field, folder }) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!files || !files.length) {
    throw new ApiError(400, "Files are required");
  }

  const uploadedFiles = await uploadService.uploadMany(files, {
    folder,
    field,
  });

  user[field].push(...uploadedFiles);

  await user.save();

  return await User.findById(userId).select("-password -refreshToken");
};

// Delete one file from an array
const deleteMultipleFile = async (userId, { field, fileId }) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const file = user[field].id(fileId);

  if (!file) {
    throw new ApiError(404, "File not found");
  }

  await uploadService.delete(file);

  file.deleteOne();

  await user.save();
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  updateAvatar,
  deleteAvatar,
  uploadSingleFile,
  deleteSingleFile,
  uploadMultipleFiles,
  deleteMultipleFile,
};
