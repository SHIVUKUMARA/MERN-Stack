const { z } = require("zod");

const {
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  roleSchema,
  passwordSchema,
} = require("./user.validator");

// Update User by id
const updateUserSchema = z.object({
  body: z
    .object({
      firstName: firstNameSchema.optional(),
      lastName: lastNameSchema.optional(),
      email: emailSchema.optional(),
      role: roleSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

// update loggedin user details
const updateProfileSchema = z.object({
  body: z
    .object({
      firstName: firstNameSchema.optional(),
      lastName: lastNameSchema.optional(),
      email: emailSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    }),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }),
});

module.exports = {
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
};
