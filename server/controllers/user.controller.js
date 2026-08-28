const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
// const ApiError = require("../utils/ApiError");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  uploadSingleFile,
  deleteSingleFile,
  uploadMultipleFiles,
  deleteMultipleFile,
} = require("../services/user.service");

// Get logged in user profile
const getProfile = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Profile Fetched Successfully"));
});

// Get all users
const getUsers = asyncHandler(async (req, res) => {
  const users = await getAllUsers(req.query);
  res
    .status(200)
    .json(new ApiResponse(200, users, "Users Fetched Successfully"));
});

// Get user by id
const getUserByIdController = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  res.status(200).json(new ApiResponse(200, user, "User Fetched Successfully"));
});

// Update user by id
const updateUserController = asyncHandler(async (req, res) => {
  const user = await updateUser(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, user, "User Updated Successfully"));
});

// Update logged in user details
const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateUser(req.user._id, req.body);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

// Soft delete the user
const deleteUserController = asyncHandler(async (req, res) => {
  await deleteUser(req.params.id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "User deleted Successfully"));
});

// restore soft deleted user
const restoreUserController = asyncHandler(async (req, res) => {
  const user = await restoreUser(req.params.id);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User restored Successfully"));
});

// change currently logged in user password
const changePasswordController = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await changePassword(req.user._id, currentPassword, newPassword);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Password changed successfully. Please login again",
      ),
    );
});

// Upload or Replace Avatar
const updateAvatarController = asyncHandler(async (req, res) => {
  const user = await uploadSingleFile(req.user._id, req.file, {
    field: "avatar",
    folder: "users/avatar",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// Delete Avatar
const deleteAvatarController = asyncHandler(async (req, res) => {
  await deleteSingleFile(req.user._id, {
    field: "avatar",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Avatar deleted successfully"));
});

// Upload Gallery Images
const uploadGalleryController = asyncHandler(async (req, res) => {
  const user = await uploadMultipleFiles(req.user._id, req.files, {
    field: "gallery",
    folder: "users/gallery",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Gallery uploaded successfully"));
});

// Delete Gallery Image
const deleteGalleryController = asyncHandler(async (req, res) => {
  await deleteMultipleFile(req.user._id, {
    field: "gallery",
    fileId: req.params.fileId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Gallery image deleted successfully"));
});

// Upload Documents
const uploadDocumentsController = asyncHandler(async (req, res) => {
  const user = await uploadMultipleFiles(req.user._id, req.files, {
    field: "documents",
    folder: "users/documents",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Documents uploaded successfully"));
});

// Delete Document
const deleteDocumentController = asyncHandler(async (req, res) => {
  await deleteMultipleFile(req.user._id, {
    field: "documents",
    fileId: req.params.fileId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Document deleted successfully"));
});

// Upload Videos
const uploadVideosController = asyncHandler(async (req, res) => {
  const user = await uploadMultipleFiles(req.user._id, req.files, {
    field: "videos",
    folder: "users/videos",
  });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Videos uploaded successfully"));
});

// Delete Video
const deleteVideoController = asyncHandler(async (req, res) => {
  await deleteMultipleFile(req.user._id, {
    field: "videos",
    fileId: req.params.fileId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

module.exports = {
  getProfile,
  getUsers,
  getUserById: getUserByIdController,
  updateUser: updateUserController,
  updateProfile,
  deleteUser: deleteUserController,
  restoreUser: restoreUserController,
  changePassword: changePasswordController,
  // Avatar
  updateAvatar: updateAvatarController,
  deleteAvatar: deleteAvatarController,
  // Gallery
  uploadGallery: uploadGalleryController,
  deleteGallery: deleteGalleryController,
  // Documents
  uploadDocuments: uploadDocumentsController,
  deleteDocument: deleteDocumentController,
  // video
  uploadVideos: uploadVideosController,
  deleteVideo: deleteVideoController,
};
