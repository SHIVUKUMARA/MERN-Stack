const { z } = require("zod");

const {
  firstNameSchema,
  lastNameSchema,
  emailSchema,
  passwordSchema,
  roleSchema,
} = require("./user.validator");

const registerSchema = z.object({
  body: z.object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema.optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().length(64, "Invalid reset token"),
    password: passwordSchema,
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
